import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'

// Site URL is a placeholder; KEI-137 locks the final domain.
// Server output with Vercel adapter so `src/pages/api/waitlist.ts` runs as a serverless function.
// Every `.astro` page explicitly opts into static pre-render via `export const prerender = true`.
export default defineConfig({
  site: 'https://keimelion.app',
  output: 'server',
  adapter: vercel(),
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
      // The /api/waitlist route is a serverless function, not a public page.
      filter: (page) => !page.includes('/api/'),
    }),
  ],
})
