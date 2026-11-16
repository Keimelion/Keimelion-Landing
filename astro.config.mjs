import { defineConfig, envField } from 'astro/config'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

// Site URL is a placeholder; KEI-137 locks the final domain.
// Server output with the Node adapter (standalone, self-hosted) so `src/pages/api/waitlist.ts` runs server-side.
// Every `.astro` page explicitly opts into static pre-render via `export const prerender = true`.
const WAITLIST_TOKEN_PAGE_PATTERN =
  /\/(confirmer-inscription|supprimer-inscription|confirm-signup|delete-signup)\/?$/
const SITE = 'https://keimelion.app'
const HOME_PATHS = new Set(['/', '/en/'])
// FR/EN pairs whose slugs differ, so the sitemap i18n option can't pair them on its own.
const TRANSLATED_PAGES = [
  ['/mentions-legales', '/en/legal-notice'],
  ['/politique-de-confidentialite', '/en/privacy-policy'],
]

// Sitemap URLs must match the pages' <link rel="canonical"> exactly (no trailing slash except on
// the two homes), or Search Console reports them as "page with a different canonical".
function toCanonicalPath(path) {
  return HOME_PATHS.has(path) ? path : path.replace(/\/$/, '')
}

export default defineConfig({
  site: SITE,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  env: {
    schema: {
      // `secret` is what makes Astro read it at runtime instead of inlining it at build time.
      API_INTERNAL_URL: envField.string({ context: 'server', access: 'secret', url: true }),
    },
  },
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'fr',
        locales: {
          fr: 'fr',
          en: 'en',
        },
      },
      // The /api/* routes are server endpoints, and the waitlist link pages only make sense with
      // the token of an email: none of them belongs in the sitemap.
      filter: (page) => !WAITLIST_TOKEN_PAGE_PATTERN.test(page) && !page.includes('/api/'),
      serialize: (item) => {
        const path = toCanonicalPath(new URL(item.url).pathname)
        item.url = new URL(path, SITE).href
        const pair = TRANSLATED_PAGES.find((paths) => paths.includes(path))
        if (pair) {
          item.links = [
            { lang: 'fr', url: new URL(pair[0], SITE).href },
            { lang: 'en', url: new URL(pair[1], SITE).href },
          ]
        } else if (item.links) {
          item.links = item.links.map((link) => ({
            ...link,
            url: new URL(toCanonicalPath(new URL(link.url).pathname), SITE).href,
          }))
        }
        return item
      },
    }),
  ],
})
