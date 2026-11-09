import type { APIRoute } from 'astro'
import { z } from 'zod'
import { env } from '../../config/env'

export const prerender = false

const MAX_REQUESTS_PER_WINDOW = 10
const RATE_WINDOW_MS = 60_000
const MAX_EMAIL_LENGTH = 254
const WAITLIST_API_PATH = '/v1/public/waitlist'
const WAITLIST_API_TIMEOUT_MS = 5_000
const HONEYPOT_ERROR_CODE = 'WAITLIST_HONEYPOT_TRIGGERED'
const ALREADY_SUBSCRIBED_STATUS = 'already_subscribed'
const HTTP_OK = 200
const HTTP_CREATED = 201
const HTTP_BAD_REQUEST = 400
const HTTP_UNPROCESSABLE_ENTITY = 422
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVICE_UNAVAILABLE = 503

const waitlistInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH)
    .pipe(z.email()),
  locale: z.enum(['fr', 'en']),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
})

const apiSignupSchema = z.object({
  status: z.enum(['subscribed', ALREADY_SUBSCRIBED_STATUS]),
})

const apiErrorSchema = z.object({
  code: z.string(),
  metadata: z.object({
    issues: z.array(z.object({ path: z.string() })).optional(),
  }),
})

type WaitlistInput = z.infer<typeof waitlistInputSchema>

interface WaitlistSuccess {
  ok: true
  duplicate: boolean
}

interface WaitlistFailure {
  ok: false
  error:
    | 'invalid_email'
    | 'invalid_consent'
    | 'rate_limited'
    | 'invalid_payload'
    | 'service_unavailable'
}

type WaitlistResponse = WaitlistSuccess | WaitlistFailure

interface WaitlistApiReply {
  status: number
  body: unknown
}

const requestsByIp = new Map<string, number[]>()

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = resolveClientIp(request, clientAddress)
  if (isRateLimited(ip)) {
    return jsonResponse(HTTP_TOO_MANY_REQUESTS, { ok: false, error: 'rate_limited' })
  }

  const payload = await parseJsonBody(request)
  if (payload === null) {
    return jsonResponse(HTTP_BAD_REQUEST, { ok: false, error: 'invalid_payload' })
  }

  const parsed = waitlistInputSchema.safeParse(payload)
  if (!parsed.success) return jsonResponse(HTTP_BAD_REQUEST, errorFromZod(parsed.error))

  const reply = await postToWaitlistApi(parsed.data, ip)
  if (reply === null) return serviceUnavailableResponse()
  return responseFromApiReply(reply)
}

function resolveClientIp(request: Request, fallback: string | undefined): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded !== null && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim()
    if (first !== undefined && first.length > 0) return first
  }
  return fallback ?? 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_WINDOW_MS
  const previous = requestsByIp.get(ip) ?? []
  const recent = previous.filter((timestamp) => timestamp >= windowStart)
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestsByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  requestsByIp.set(ip, recent)
  return false
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    return null
  }
}

function errorFromZod(error: z.ZodError): WaitlistFailure {
  return failureFromIssuePaths(error.issues.map((issue) => issue.path.join('.')))
}

function failureFromIssuePaths(paths: string[]): WaitlistFailure {
  if (paths.includes('email')) return { ok: false, error: 'invalid_email' }
  if (paths.includes('consent')) return { ok: false, error: 'invalid_consent' }
  return { ok: false, error: 'invalid_payload' }
}

async function postToWaitlistApi(
  input: WaitlistInput,
  ip: string,
): Promise<WaitlistApiReply | null> {
  try {
    const response = await fetch(new URL(WAITLIST_API_PATH, env.PUBLIC_API_BASE_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({
        email: input.email,
        locale: input.locale,
        consent: input.consent,
        honeypot: input.website,
      }),
      signal: AbortSignal.timeout(WAITLIST_API_TIMEOUT_MS),
    })
    return { status: response.status, body: (await response.json()) as unknown }
  } catch (error) {
    console.error('waitlist_api_unreachable', error)
    return null
  }
}

function responseFromApiReply(reply: WaitlistApiReply): Response {
  switch (reply.status) {
    case HTTP_OK:
    case HTTP_CREATED:
      return responseFromApiSignup(reply.body)
    case HTTP_BAD_REQUEST:
      return responseFromApiBadRequest(reply.body)
    case HTTP_UNPROCESSABLE_ENTITY:
      return jsonResponse(HTTP_BAD_REQUEST, failureFromApiValidation(reply.body))
    case HTTP_TOO_MANY_REQUESTS:
      return jsonResponse(HTTP_TOO_MANY_REQUESTS, { ok: false, error: 'rate_limited' })
    default:
      console.error('waitlist_api_failure', reply.status)
      return serviceUnavailableResponse()
  }
}

function responseFromApiSignup(body: unknown): Response {
  const signup = apiSignupSchema.safeParse(body)
  if (!signup.success) return serviceUnavailableResponse()
  return jsonResponse(HTTP_OK, {
    ok: true,
    duplicate: signup.data.status === ALREADY_SUBSCRIBED_STATUS,
  })
}

function responseFromApiBadRequest(body: unknown): Response {
  const apiError = apiErrorSchema.safeParse(body)
  if (apiError.success && apiError.data.code === HONEYPOT_ERROR_CODE) {
    return jsonResponse(HTTP_OK, { ok: true, duplicate: false })
  }
  return jsonResponse(HTTP_BAD_REQUEST, { ok: false, error: 'invalid_payload' })
}

function failureFromApiValidation(body: unknown): WaitlistFailure {
  const apiError = apiErrorSchema.safeParse(body)
  if (!apiError.success) return { ok: false, error: 'invalid_payload' }
  const issues = apiError.data.metadata.issues ?? []
  return failureFromIssuePaths(issues.map((issue) => issue.path))
}

function serviceUnavailableResponse(): Response {
  return jsonResponse(HTTP_SERVICE_UNAVAILABLE, { ok: false, error: 'service_unavailable' })
}

function jsonResponse(status: number, body: WaitlistResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
