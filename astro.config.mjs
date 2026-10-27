import { defineConfig } from 'astro/config'

// Site URL is a placeholder; KEI-137 locks the final domain.
// Static output; Vercel's Astro preset serves `dist/` directly — no @astrojs/vercel adapter needed.
export default defineConfig({
  site: 'https://keimelion.app',
  output: 'static',
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
