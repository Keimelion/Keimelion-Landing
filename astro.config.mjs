import { defineConfig, envField } from 'astro/config'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

// Site URL is a placeholder; KEI-137 locks the final domain.
// Server output with the Node adapter (standalone, self-hosted) so `src/pages/api/waitlist.ts` runs server-side.
// Every `.astro` page explicitly opts into static pre-render via `export const prerender = true`.
const WAITLIST_TOKEN_PAGE_PATTERN =
  /\/(confirmer-inscription|supprimer-inscription|confirm-signup|delete-signup)\/?$/

export default defineConfig({
  site: 'https://keimelion.app',
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
    }),
  ],
})
