# Keimelion Landing

Public pre-launch landing page for Keimelion. Built with [Astro](https://astro.build) (static output, zero runtime JS by default) and deployed on [Vercel](https://vercel.com).

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

Vercel's GitHub App auto-deploys `main` to Production and every PR to a Preview URL. No manual deploy, no CLI tokens checked in.

The repo contains a `vercel.json` with a single Accept-Language edge redirect (`/` → `/en/`) that is only enforced by Vercel's edge, not by `astro preview`. Test it against a Vercel Preview URL, not locally.

### One-time manual setup (repo owner)

- [ ] Install the Vercel GitHub App on the `Keimelion/Landing` repo (private scope).
- [ ] Create a Vercel project pointing at the repo; framework preset auto-detects to Astro.
- [ ] Production branch = `main`. PR previews = enabled (default).
- [ ] Accept the default build command (`npm run build`) and output dir (`dist`). Vercel's Astro preset sets both — leave them blank in the UI.
- [ ] Project Settings → General → Node.js Version = `22.x`.
- [ ] Project Settings → Environment Variables → add `PUBLIC_API_BASE_URL` for Production + Preview + Development (one value per environment is supported).
- [ ] Branch protection on `main`: `required_approving_review_count = 0`, `require_status_checks = true` with `ci` as required check, `require_branches_up_to_date = true`, `enforce_admins = false`.
- [ ] Add a GitHub repo variable `PUBLIC_API_BASE_URL` pointing at the dev API so CI builds don't fail the fail-fast Zod env wrapper. If unset, CI falls back to `http://localhost:3000`.

## Environment variables

Only `PUBLIC_*` vars are supported — static output cannot keep server secrets. All env access goes through `src/config/env.ts` (Zod-validated at build time).

| Name                   | Purpose                                       | Example                   |
| ---------------------- | --------------------------------------------- | ------------------------- |
| `PUBLIC_API_BASE_URL`  | Base URL of the Keimelion API (public routes) | `https://api.keimelion.app` |

## Related

- [Keimelion API](https://github.com/Keimelion/Keimelion-API) — backend
- Backlog kanban in Notion (private)
