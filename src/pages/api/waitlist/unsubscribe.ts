import type { APIRoute } from 'astro'
import { createWaitlistTokenRelay } from '../../../utils/waitlist-token-proxy'

export const prerender = false

const relayUnsubscription = createWaitlistTokenRelay('/v1/public/waitlist/unsubscribe')

export const POST: APIRoute = ({ request, clientAddress }) =>
  relayUnsubscription({ request, clientAddress })
