import { z } from 'zod'
import { API_INTERNAL_URL } from 'astro:env/server'
import {
  createIpRateLimiter,
  jsonResponse,
  parseJsonBody,
  readJsonBody,
  resolveClientIp,
  type ApiReply,
} from './api-proxy'

const MAX_REQUESTS_PER_WINDOW = 10
const RATE_WINDOW_MS = 60_000
const API_TIMEOUT_MS = 5_000
const HTTP_OK = 200
const HTTP_NO_CONTENT = 204
const HTTP_BAD_REQUEST = 400
const HTTP_UNPROCESSABLE_ENTITY = 422
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVICE_UNAVAILABLE = 503

// 32 random bytes in base64url, as issued by the API.
const tokenInputSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })

export type WaitlistTokenResult =
  { ok: true } | { ok: false; error: 'invalid_token' | 'rate_limited' | 'service_unavailable' }

interface WaitlistTokenRelayRequest {
  request: Request
  clientAddress: string | undefined
}

// Confirm and delete links carry the token in the URL fragment, which never reaches a server log;
// the page posts it here and this endpoint relays it to the API from the internal network.
export function createWaitlistTokenRelay(
  apiPath: string,
): (relayRequest: WaitlistTokenRelayRequest) => Promise<Response> {
  const isRateLimited = createIpRateLimiter(MAX_REQUESTS_PER_WINDOW, RATE_WINDOW_MS)
  return async ({ request, clientAddress }) => {
    const ip = resolveClientIp(request, clientAddress)
    if (isRateLimited(ip)) return resultResponse(HTTP_TOO_MANY_REQUESTS, 'rate_limited')

    const parsed = tokenInputSchema.safeParse(await parseJsonBody(request))
    if (!parsed.success) return resultResponse(HTTP_BAD_REQUEST, 'invalid_token')

    const reply = await postTokenToApi(apiPath, parsed.data.token, ip)
    if (reply === null) return resultResponse(HTTP_SERVICE_UNAVAILABLE, 'service_unavailable')
    return responseFromApiReply(reply)
  }
}

async function postTokenToApi(
  apiPath: string,
  token: string,
  ip: string,
): Promise<ApiReply | null> {
  try {
    const response = await fetch(new URL(apiPath, API_INTERNAL_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })
    return { status: response.status, body: await readJsonBody(response) }
  } catch (error) {
    console.error(
      'waitlist_token_api_unreachable',
      apiPath,
      error instanceof Error ? error.name : 'unknown',
    )
    return null
  }
}

function responseFromApiReply(reply: ApiReply): Response {
  switch (reply.status) {
    case HTTP_OK:
    case HTTP_NO_CONTENT:
      return jsonResponse(HTTP_OK, { ok: true } satisfies WaitlistTokenResult)
    case HTTP_BAD_REQUEST:
    case HTTP_UNPROCESSABLE_ENTITY:
      return resultResponse(HTTP_BAD_REQUEST, 'invalid_token')
    case HTTP_TOO_MANY_REQUESTS:
      return resultResponse(HTTP_TOO_MANY_REQUESTS, 'rate_limited')
    default:
      console.error('waitlist_token_api_failure', reply.status)
      return resultResponse(HTTP_SERVICE_UNAVAILABLE, 'service_unavailable')
  }
}

function resultResponse(
  status: number,
  error: Extract<WaitlistTokenResult, { ok: false }>['error'],
): Response {
  return jsonResponse(status, { ok: false, error } satisfies WaitlistTokenResult)
}
