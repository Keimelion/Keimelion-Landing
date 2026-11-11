import type { APIRoute } from 'astro'
import { createWaitlistTokenRelay } from '../../../utils/waitlist-token-proxy'

export const prerender = false

const relayConfirmation = createWaitlistTokenRelay('/v1/public/waitlist/confirm')

export const POST: APIRoute = ({ request, clientAddress }) =>
  relayConfirmation({ request, clientAddress })
