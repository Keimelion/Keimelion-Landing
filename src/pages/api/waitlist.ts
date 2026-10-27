// TODO(KEI-138): migrate this handler to call POST /v1/public/waitlist on the Keimelion API.
// Until the real endpoint lands this route holds an in-memory store so the landing form is testable
// end-to-end on the Vercel preview. Rate-limit + dedup live in-process and reset on cold start.
import type { APIRoute } from 'astro'
import { z } from 'zod'

export const prerender = false

const MAX_REQUESTS_PER_WINDOW = 10
const RATE_WINDOW_MS = 60_000
const MAX_EMAIL_LENGTH = 254

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

type WaitlistInput = z.infer<typeof waitlistInputSchema>

interface WaitlistSuccess {
  ok: true
  duplicate: boolean
}

interface WaitlistFailure {
  ok: false
  error: 'invalid_email' | 'invalid_consent' | 'rate_limited' | 'invalid_payload'
}

type WaitlistResponse = WaitlistSuccess | WaitlistFailure

const requestsByIp = new Map<string, number[]>()
const registeredEmails = new Set<string>()

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = resolveClientIp(request, clientAddress)
  if (isRateLimited(ip)) return jsonResponse(429, { ok: false, error: 'rate_limited' })

  const payload = await parseJsonBody(request)
  if (payload === null) return jsonResponse(400, { ok: false, error: 'invalid_payload' })

  const parsed = waitlistInputSchema.safeParse(payload)
  if (!parsed.success) return jsonResponse(400, errorFromZod(parsed.error))

  if (isHoneypotTripped(parsed.data)) {
    return jsonResponse(200, { ok: true, duplicate: false })
  }

  const duplicate = registeredEmails.has(parsed.data.email)
  registeredEmails.add(parsed.data.email)
  return jsonResponse(200, { ok: true, duplicate })
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

function isHoneypotTripped(input: WaitlistInput): boolean {
  return typeof input.website === 'string' && input.website.trim().length > 0
}

function errorFromZod(error: z.ZodError): WaitlistFailure {
  const firstIssue = error.issues[0]
  if (firstIssue === undefined) return { ok: false, error: 'invalid_payload' }
  const path = firstIssue.path.join('.')
  if (path === 'email') return { ok: false, error: 'invalid_email' }
  if (path === 'consent') return { ok: false, error: 'invalid_consent' }
  return { ok: false, error: 'invalid_payload' }
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
