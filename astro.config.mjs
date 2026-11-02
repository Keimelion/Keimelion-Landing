import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'

// Site URL is a placeholder; KEI-137 locks the final domain.
// Server output with the Node adapter (standalone, self-hosted) so `src/pages/api/waitlist.ts` runs server-side.
// Every `.astro` page explicitly opts into static pre-render via `export const prerender = true`.
export default defineConfig({
  site: 'https://keimelion.app',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
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
      // The /api/waitlist route is a server endpoint, not a public page.
      filter: (page) => !page.includes('/api/'),
    }),
  ],
})
