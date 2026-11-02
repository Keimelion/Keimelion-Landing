# Keimelion Landing

Public pre-launch landing page for Keimelion. Built with [Astro](https://astro.build) (static output, zero runtime JS by default) and self-hosted on the Keimelion server (see [Keimelion-Infra](https://github.com/Keimelion/Keimelion-Infra)).

Shares zero runtime code with the Keimelion frontend app. Only talks to the Keimelion API through public endpoints (e.g. `POST /v1/public/waitlist`).

## Stack

- Astro 5, static output (`output: 'static'`)
- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Vanilla CSS with design tokens on `:root`
- `@fontsource/*` for self-hosted fonts (RGPD — no Google Fonts request)
- Astro built-in i18n (`fr` default, `en` alternate, `prefixDefaultLocale: false`)
- Node 22 LTS

## Local development

Requirements: Node 22 (`nvm use`), npm 10+.

```bash
nvm use
npm install
cp .env.example .env   # fill PUBLIC_API_BASE_URL if different from the default
npm run dev            # serves on http://localhost:4321
```

### Scripts

| Script             | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `npm run dev`      | Astro dev server on port 4321                                |
| `npm run build`    | Production build to `dist/`                                  |
| `npm run preview`  | Serves the production build locally for smoke tests          |
| `npm run lint`     | ESLint on `.ts` and `.astro` files                           |
| `npm run format`   | Prettier on the repo                                         |
| `npm run typecheck`| `astro check` (TypeScript + Astro template type-check)       |
| `npm run commitlint` | Validates a commit message against Conventional Commits    |

## Deployment

Self-hosted on milky-way (Docker, `@astrojs/node` standalone), like the API and the
back-office. A release PR `dev → main` runs CI → semantic-release → deploy, through the
reusable workflows of
[Keimelion-Infra](https://github.com/Keimelion/Keimelion-Infra/blob/main/docs/release-process.md).

## Environment variables

All env access goes through `src/config/env.ts` (Zod-validated at build time).

| Name                   | Purpose                                       | Example                   |
| ---------------------- | --------------------------------------------- | ------------------------- |
| `PUBLIC_API_BASE_URL`  | Base URL of the Keimelion API (public routes) | `https://api.keimelion.app` |

## Related

- [Keimelion API](https://github.com/Keimelion/Keimelion-API) — backend
- Backlog kanban in Notion (private)
