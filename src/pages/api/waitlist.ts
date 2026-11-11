import type { APIRoute } from 'astro'
import { z } from 'zod'
import { API_INTERNAL_URL } from 'astro:env/server'
import {
  createIpRateLimiter,
  jsonResponse,
  parseJsonBody,
  readJsonBody,
  resolveClientIp,
  type ApiReply,
} from '../../utils/api-proxy'

export const prerender = false

const MAX_REQUESTS_PER_WINDOW = 10
const RATE_WINDOW_MS = 60_000
const MAX_EMAIL_LENGTH = 254
const WAITLIST_API_PATH = '/v1/public/waitlist'
const WAITLIST_API_TIMEOUT_MS = 5_000
const HONEYPOT_ERROR_CODE = 'WAITLIST_HONEYPOT_TRIGGERED'
const PENDING_CONFIRMATION_STATUS = 'pending_confirmation'
const HTTP_OK = 200
const HTTP_ACCEPTED = 202
const HTTP_BAD_REQUEST = 400
const HTTP_UNPROCESSABLE_ENTITY = 422
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVICE_UNAVAILABLE = 503

const waitlistInputSchema = z.object({
  email: z.string().trim().toLowerCase().max(MAX_EMAIL_LENGTH).pipe(z.email()),
  locale: z.enum(['fr', 'en']),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
})

// The API answers every signup with the same status, so the landing cannot tell (and never shows)
// whether the address was already on the list.
const apiSignupSchema = z.object({
  status: z.literal(PENDING_CONFIRMATION_STATUS),
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
}

interface WaitlistFailure {
  ok: false
  error:
    'invalid_email' | 'invalid_consent' | 'rate_limited' | 'invalid_payload' | 'service_unavailable'
}

type WaitlistResponse = WaitlistSuccess | WaitlistFailure

const isRateLimited = createIpRateLimiter(MAX_REQUESTS_PER_WINDOW, RATE_WINDOW_MS)

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = resolveClientIp(request, clientAddress)
  if (isRateLimited(ip)) {
    return waitlistResponse(HTTP_TOO_MANY_REQUESTS, { ok: false, error: 'rate_limited' })
  }

  const payload = await parseJsonBody(request)
  if (payload === null) {
    return waitlistResponse(HTTP_BAD_REQUEST, { ok: false, error: 'invalid_payload' })
  }

  const parsed = waitlistInputSchema.safeParse(payload)
  if (!parsed.success) return waitlistResponse(HTTP_BAD_REQUEST, errorFromZod(parsed.error))

  const reply = await postToWaitlistApi(parsed.data, ip)
  if (reply === null) return serviceUnavailableResponse()
  return responseFromApiReply(reply)
}

function errorFromZod(error: z.ZodError): WaitlistFailure {
  return failureFromIssuePaths(error.issues.map((issue) => issue.path.join('.')))
}

function failureFromIssuePaths(paths: string[]): WaitlistFailure {
  if (paths.includes('email')) return { ok: false, error: 'invalid_email' }
  if (paths.includes('consent')) return { ok: false, error: 'invalid_consent' }
  return { ok: false, error: 'invalid_payload' }
}

async function postToWaitlistApi(input: WaitlistInput, ip: string): Promise<ApiReply | null> {
  try {
    const response = await fetch(new URL(WAITLIST_API_PATH, API_INTERNAL_URL), {
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
    return { status: response.status, body: await readJsonBody(response) }
  } catch (error) {
    console.error('waitlist_api_unreachable', error)
    return null
  }
}

function responseFromApiReply(reply: ApiReply): Response {
  switch (reply.status) {
    case HTTP_ACCEPTED:
      return responseFromApiSignup(reply.body)
    case HTTP_BAD_REQUEST:
      return responseFromApiBadRequest(reply.body)
    case HTTP_UNPROCESSABLE_ENTITY:
      return waitlistResponse(HTTP_BAD_REQUEST, failureFromApiValidation(reply.body))
    case HTTP_TOO_MANY_REQUESTS:
      return waitlistResponse(HTTP_TOO_MANY_REQUESTS, { ok: false, error: 'rate_limited' })
    default:
      console.error('waitlist_api_failure', reply.status)
      return serviceUnavailableResponse()
  }
}

function responseFromApiSignup(body: unknown): Response {
  if (!apiSignupSchema.safeParse(body).success) return serviceUnavailableResponse()
  return waitlistResponse(HTTP_OK, { ok: true })
}

// A honeypot hit looks like a normal signup to the bot.
function responseFromApiBadRequest(body: unknown): Response {
  const apiError = apiErrorSchema.safeParse(body)
  if (apiError.success && apiError.data.code === HONEYPOT_ERROR_CODE) {
    return waitlistResponse(HTTP_OK, { ok: true })
  }
  return waitlistResponse(HTTP_BAD_REQUEST, { ok: false, error: 'invalid_payload' })
}

function failureFromApiValidation(body: unknown): WaitlistFailure {
  const apiError = apiErrorSchema.safeParse(body)
  if (!apiError.success) return { ok: false, error: 'invalid_payload' }
  const issues = apiError.data.metadata.issues ?? []
  return failureFromIssuePaths(issues.map((issue) => issue.path))
}

function serviceUnavailableResponse(): Response {
  return waitlistResponse(HTTP_SERVICE_UNAVAILABLE, { ok: false, error: 'service_unavailable' })
}

function waitlistResponse(status: number, body: WaitlistResponse): Response {
  return jsonResponse(status, body)
}
