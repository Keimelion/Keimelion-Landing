// Helpers shared by the server endpoints that relay the visitor's request to the Keimelion API.

const UNKNOWN_IP = 'unknown'

export interface ApiReply {
  status: number
  body: unknown
}

export function resolveClientIp(request: Request, fallback: string | undefined): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded !== null && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim()
    if (first !== undefined && first.length > 0) return first
  }
  return fallback ?? UNKNOWN_IP
}

// In-memory sliding window, per IP: one instance per endpoint keeps their budgets separate.
export function createIpRateLimiter(
  maxRequests: number,
  windowMs: number,
): (ip: string) => boolean {
  const requestsByIp = new Map<string, number[]>()
  return (ip) => {
    const now = Date.now()
    forgetIdleIps(requestsByIp, now - windowMs)
    const recent = (requestsByIp.get(ip) ?? []).filter((timestamp) => timestamp >= now - windowMs)
    if (recent.length >= maxRequests) {
      requestsByIp.set(ip, recent)
      return true
    }
    recent.push(now)
    requestsByIp.set(ip, recent)
    return false
  }
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    return null
  }
}

export async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

// An IP is only kept while it has requests in the current window (privacy policy commitment).
function forgetIdleIps(requestsByIp: Map<string, number[]>, windowStart: number): void {
  for (const [ip, timestamps] of requestsByIp) {
    if (timestamps.every((timestamp) => timestamp < windowStart)) requestsByIp.delete(ip)
  }
}
