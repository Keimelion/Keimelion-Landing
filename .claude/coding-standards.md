# Coding Standards — Keimelion Landing

These standards apply to all TypeScript and `.astro` source code in the Landing. The Dev agent follows them when implementing and enforces them during its own self-review pass.

They are shared with the Keimelion API and Backoffice — the universal TypeScript section below is identical in all three repos. Rules that only apply to the backend (Drizzle repositories, Hono routes) or to the Backoffice (React/Next, TanStack Query) are omitted. Astro-specific rules are appended at the end.

---

## Strict inputs and outputs

### Explicit return types on every function

All functions — exported or private — must declare their return type explicitly. Never rely on inference for function signatures.

```typescript
// ❌
async function fetchWaitlistCount(baseUrl: string) {
  const response = await fetch(`${baseUrl}/v1/public/waitlist/count`)
  return response.json()
}

// ✅
async function fetchWaitlistCount(baseUrl: string): Promise<WaitlistCount> {
  const response = await fetch(`${baseUrl}/v1/public/waitlist/count`)
  const parsed = waitlistCountSchema.parse(await response.json())
  return parsed
}
```

### Avoid optional properties — prefer explicit types

`field?: string` means the field may be completely absent from the object. This is ambiguous: does it mean "not yet set", "not applicable", or "forgotten"? Be explicit instead.

- Use **required fields** on domain types — if a value must exist after creation, it is required
- Use **separate input types** for creation/update where some fields are genuinely optional
- Use **`T | null`** (not `T | undefined`) when a value is intentionally absent — `null` is deliberate, `undefined` is accidental

### Validate all external inputs with Zod at the boundary

Every input entering the app from outside — form submissions, API responses, URL params, `localStorage` — must be validated with a Zod schema at the boundary. Downstream code receives already-typed, already-validated data.

```typescript
// ❌ — API response consumed without validation
const response = await fetch(`${env.PUBLIC_API_BASE_URL}/v1/public/waitlist/count`)
const payload = await response.json()
return payload.count

// ✅ — Zod parses at the boundary, caller receives clean types
const waitlistCountSchema = z.object({ count: z.number().int().nonnegative() })
type WaitlistCount = z.infer<typeof waitlistCountSchema>

async function fetchWaitlistCount(baseUrl: string): Promise<WaitlistCount> {
  const response = await fetch(`${baseUrl}/v1/public/waitlist/count`)
  return waitlistCountSchema.parse(await response.json())
}
```

### `null` over `undefined` for intentional absence

`undefined` means a value was never set. `null` means it was explicitly set to nothing. In domain types, use `null` for intentional absence — it is deliberate and serializes correctly in JSON (`undefined` disappears).

---

## Early return — no `else`

Fail fast. Handle error cases and guard clauses first, then write the happy path without nesting. **`else` is never allowed** — if the `if` block returns, the `else` is redundant; if it doesn't, extract a function.

```typescript
// ❌
function resolveLocaleLabel(locale: string | null): string {
  if (locale) {
    if (locale === 'fr') {
      return 'Français'
    } else {
      return 'English'
    }
  } else {
    return 'Français'
  }
}

// ✅
function resolveLocaleLabel(locale: string | null): string {
  if (locale === null || locale === 'fr') return 'Français'
  return 'English'
}
```

---

## No abbreviations

Use full, descriptive names. Abbreviations save keystrokes but cost clarity.

| ❌ Avoid | ✅ Use |
|---|---|
| `req`, `res` | `request`, `response` |
| `err` | `error` |
| `usr`, `u` | `user` |
| `msg` | `message` |
| `val` | `value` |
| `ctx` | `context` |
| `cb` | `callback` |
| `idx`, `i` | use descriptive loop variable or `.map()` / `.filter()` |
| `e` (in handlers) | `event` |

Exception: well-known, unambiguous domain acronyms (`id`, `url`, `uuid`, `http`, `html`, `svg`, `css`, `seo`, `og`) are acceptable.

---

## No comments — self-explaining names

If you feel the need to explain what code does, the code is wrong. Rename functions, variables, or extract a helper — never annotate. This applies to "what" comments *and* "why" comments: a block explaining why we defer analytics until after consent should be replaced by a named helper like `loadAnalyticsAfterConsent()`, not documented in prose.

The only acceptable comments are:
- Workarounds for external library bugs (with a link to the issue)
- Non-obvious legal, compliance, or accessibility requirements
- A single top-comment on `src/config/env.ts` warning that `PUBLIC_*` is shipped to the client bundle

---

## Minimal parameters

- **Max 3 parameters** for a function. Beyond that, group related params into an object.
- Boolean parameters are a smell — they usually mean the function does two things. Split it.

---

## Maximum function length: 25 lines

A function body should not exceed 25 lines (excluding the signature and closing brace). If it does, extract sub-functions with descriptive names. This applies to `.astro` component scripts too — extract sub-components rather than growing a single component.

---

## Single responsibility

Each function does exactly one thing. The name should describe it completely without "and" or "or".

---

## `switch/case` over `if/else if` chains

When branching on a single value with 3 or more cases, use `switch/case`. It is more readable and exhaustiveness-checkable by TypeScript.

Combined with TypeScript's exhaustiveness checking: if `default` should never be reached, use `satisfies never` to get a compile error when a case is missing.

---

## Shared enums — no magic strings or numbers

Never use raw string or number literals for values that carry semantic meaning. Define a `const` object with `as const` and derive the type from it.

```typescript
// ❌
if (locale === 'fr') { ... }

// ✅ — define once, reuse everywhere
export const Locales = {
  FR: 'fr',
  EN: 'en',
} as const

export type Locale = (typeof Locales)[keyof typeof Locales]

if (locale === Locales.FR) { ... }
```

For enums that are also used by the API, mirror the API's `shared/enums/*` definitions here (do not import the API module — the Landing is kept decoupled). Keep the string values identical so the wire protocol matches.

---

## No magic numbers or strings — local constants

Any literal that is not immediately obvious from context must be named. Define it as a `const` at the top of the file.

```typescript
// ❌
if (email.length > 254) { ... }
setTimeout(callback, 3000)

// ✅
const MAX_EMAIL_LENGTH = 254
const WAITLIST_SUCCESS_TOAST_MS = 3000

if (email.length > MAX_EMAIL_LENGTH) { ... }
setTimeout(callback, WAITLIST_SUCCESS_TOAST_MS)
```

---

## `const` over `let`, never `var`

Default to `const`. Use `let` only when the variable genuinely needs to be reassigned. If you find yourself reaching for `let`, first ask whether a `.map()` / `.filter()` / ternary would remove the need for mutation.

`var` is never acceptable.

---

## Array methods over `for` loops

Prefer declarative array methods over imperative loops. They express intent, not mechanics. Use `.map()`, `.filter()`, `.find()`, `.some()`, `.every()`, `.reduce()`. A `for` loop is acceptable only when you need `break` / `continue` semantics that can't be expressed otherwise.

---

## No nested ternaries

A single ternary for a simple inline condition is fine (including inside `.astro` templates). Two levels of nesting: extract a function or a sub-component.

---

## `async/await` only — no `.then()` / `.catch()`

All async code uses `async/await`. Never chain `.then()` or `.catch()` — it mixes paradigms and makes control flow harder to follow.

---

## Named exports only — no default exports

Always use named exports. Default exports make refactoring harder (the import name is not enforced) and reduce discoverability.

**Exception**: `.astro` components are inherently default-exported (the file *is* the component). Within an `.astro` file, named exports in the frontmatter follow the general rule.

---

## No `any` in template literals — explicit types only

`@typescript-eslint/restrict-template-expressions` forbids values typed as `any`, `null`, `undefined`, or object types inside template literals. Only `string`, `number`, `boolean`, and `bigint` are allowed directly.

Fix by narrowing, converting, or using the `URL` constructor for URL interpolation:

```typescript
// ❌
const endpoint = `${import.meta.env.PUBLIC_API_BASE_URL}/v1/public/waitlist`

// ✅ — go through the Zod-validated env wrapper and use URL constructor
import { env } from '@/config/env'
const endpoint = new URL('/v1/public/waitlist', env.PUBLIC_API_BASE_URL).href
```

---

## `??` over `||` for nullish coalescing

Use `??` when you want to fall back only on `null` or `undefined`. `||` also coerces `0`, `""`, and `false` — which is almost never what you want in business logic.

---

## Natural reading order

Functions in a file should read top-to-bottom in the order a reader would want to understand them:

1. **The exported component or main function first** — what the module is *for*
2. **Private helpers after** — implementation details, in the order they are called

A reader opening the file sees the intent at the top and drills into details below. In an `.astro` file, the frontmatter block is the module header: imports first, then exported `const Props`, then local helpers, then the template.

---

## Naming conventions

- **Functions**: `verb + noun` in camelCase — `fetchWaitlistCount`, `submitWaitlist`, `buildCanonicalUrl`
- **Astro components**: PascalCase noun — `Hero`, `WaitlistForm`, `BaseLayout`
- **Booleans**: `is` / `has` / `can` prefix — `isValidEmail`, `hasOptedIn`, `canSubmit`
- **Interfaces**: PascalCase noun — `WaitlistInput`, `WaitlistResult`; component props: `<ComponentName>Props`
- **Constants**: SCREAMING_SNAKE_CASE for true constants — `MAX_EMAIL_LENGTH`
- **File names**: kebab-case matching the exported symbol — `hero.astro` exports `Hero`, `waitlist-form.ts` is the client-island script for `waitlist-form.astro`
- **i18n keys**: dot-separated kebab-case — `hero.title`, `waitlist.submit.success`
- No single-letter variables except in well-understood math contexts

---

## API payload keys — camelCase everywhere

All keys in HTTP request bodies, response bodies, and query params consumed from the Keimelion API are **camelCase**. This matches TypeScript identifiers so the same key flows through the whole call chain without any rename layer.

The only place snake_case ever appears is in URL path segments (`/public/waitlist`) — that's a REST convention, not a data convention.

---

## Specific error codes — no generic fallbacks

When surfacing an API error to the UI, distinguish specific failure modes from generic ones. The Keimelion API's `ApiError` responses come with a `code` field — use it to show a targeted message.

```typescript
// ❌
if (error) showToast(t('waitlist.error.generic'))

// ✅
switch (error?.code) {
  case 'EMAIL_ALREADY_REGISTERED':
    return showToast(t('waitlist.error.already_registered'))
  case 'RATE_LIMITED':
    return showToast(t('waitlist.error.rate_limited'))
  default:
    return showToast(t('waitlist.error.generic'))
}
```

---

## Trust the validation layer

Components receive already-validated, already-typed data from Zod parsers or from the API's typed response. Do not re-check constraints downstream.

- If a Zod form schema guarantees `email` is lowercased, do not lowercase it again before display
- If the API guarantees `createdAt` is an ISO string, do not re-parse it as a Date before passing it to the next function

---

## Normalise inputs at the Zod boundary

Data normalisation (lowercasing emails, trimming whitespace) belongs in the Zod schema via `.transform()` or `.trim()`, not in templates or scripts.

```typescript
// ✅ — normalised once at the boundary
const waitlistInputSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  consent: z.literal(true),
})
```

---

## Avoid overkill interfaces

Do not create an interface for a shape used in exactly one place. Inline the type or pass values directly.

---

## Prefer inline over premature dispatchers

A `Record<K, V>` lookup table or a helper function is worth its abstraction only when it removes real duplication. A 2-entry dispatcher for two mutually-exclusive branches is not real duplication — it is ceremony.

Prefer the direct form until the case count justifies the table (typically 4+ genuinely-similar cases). "We might add more later" is not a reason.

---

## Delete unused exports — do not hoard scaffolding

An export with no consumer is dead code, even if it looks like it *might* be needed later. Delete it; recreate it when the actual consumer arrives. Git history is the scaffolding archive — the working tree is not.

---

## Private helpers — ordering within the private section

Within the private section of a file (after all exported functions and components), order helpers in the order they are first called — top to bottom mirrors the call flow.

---

# Astro / Landing addendum

The rules below are Landing-specific and complement the general TypeScript rules above. Where they conflict with the general rules, these take precedence.

## Static-first — no JS runtime by default

Every `.astro` component ships as HTML + CSS. Add a `<script>` block only when the behaviour is impossible without JS. Server-rendered HTML attributes (`loading="lazy"`, `required`, `autocomplete`, `type="email"`, `defer`, `<details>`, `<dialog>`) do a surprising amount of work — exhaust them before writing any JS.

When JS is unavoidable, keep it as a client island loaded via a single `<script type="module">` block. Hydration frameworks (React, Vue, Svelte) are not installed on this repo — a request for interactive state should trigger a design review, not a dependency add.

## Component layout — one folder per component

A component named `Hero` lives at `src/components/hero/`:

```
src/components/hero/
  hero.astro      # The component (frontmatter + template + optional <style> + optional <script>)
  hero.css        # Only when the inline <style> would exceed ~40 lines
  hero.ts         # Only when the inline <script> would exceed ~30 lines
```

Prefer the inline forms until the thresholds above are crossed — splitting prematurely scatters the mental model across three files.

The file name matches the component name in kebab-case. Small purely-presentational sub-components used only inside one parent may stay in the same file, declared with `const Subcomponent = ...` and referenced below the parent.

## `.astro` frontmatter structure

Inside the `---` frontmatter block, declare in this order:

1. `import` statements (type imports first, then value imports)
2. `export const Props` type (if the component takes props)
3. `const Astro.props` destructuring with explicit types
4. Local pure helpers
5. Variables computed from props (nothing async at render time — all data must come in through props)

Keep the frontmatter short. Astro components are templates, not controllers — any logic over ~15 lines belongs in a `.ts` helper under `src/utils/` or in a sibling `<component>.ts` file.

## i18n — zero hardcoded user-visible strings

- All visible strings live in `src/i18n/<locale>.json`.
- Every page the ticket touches is updated in BOTH locales (FR and EN) in the same PR.
- The default locale (FR) is served from `/`; English from `/en/*`.
- Keys are dot-separated kebab-case: `hero.title`, `waitlist.form.submit.success`.
- Imports go through the typed translator helper in `src/i18n/t.ts` — never read a JSON catalogue directly from a component.

Fail your own review if `grep -nE '>[A-Za-z]{3,}' src/components src/pages` returns anything non-trivial.

## Env access through `src/config/env.ts` only

The only file that reads `import.meta.env` is `src/config/env.ts`. It exports a Zod-validated `env` object. Any new env var:

1. Added to the schema with a clear Zod rule (`.url()`, `.string().min(1)`, etc.)
2. Added to `.env.example` with a one-line comment stating what it is for
3. Registered in Vercel's project settings for Production + Preview + Development

Any var prefixed `PUBLIC_*` is **embedded in the client bundle**. Never put a secret behind `PUBLIC_*`. A top-comment on `src/config/env.ts` warns of this — do not remove it.

Validation is fail-fast at build time. If `npm run build` fails because an env var is missing, add it before merging — do not add `.optional()` to make the schema pass.

## No raw `fetch` in `.astro` templates

A client island that needs to call the API wraps its fetch in a small helper under `src/utils/` (or a sibling `.ts` file). The helper:

- Reads the base URL from `env.PUBLIC_API_BASE_URL` only
- Parses the response with a Zod schema at the boundary
- Returns `Result<T, ApiError>`-style values, never raw promises that may throw

Server-side `fetch` at build time (if ever added) also goes through a helper — never inline in a page template.

## Forms — explicit state machine

Every form in a client island exposes four UI states:

1. **Idle** — the empty form
2. **Submitting** — button disabled, visible pending indicator
3. **Success** — inline confirmation (or redirect)
4. **Error** — inline error with a targeted message per `ApiError.code`

The transitions are driven by a simple local state variable (`'idle' | 'submitting' | 'success' | 'error'`). No framework is needed. No `onLoad` effect — the island hydrates on user interaction (`type="submit"`).

## Images — never raw `<img>` for site assets

- Use Astro's `<Image />` or `<Picture />` from `astro:assets` for anything imported from `src/assets/`.
- Every image carries `alt` (empty string for decorative, descriptive otherwise), explicit `width` and `height` (no CLS), and `loading="lazy"` below the fold.
- The LCP image (hero) uses `loading="eager"` and `decoding="async"`.

Raw `<img src="/foo.png">` is only acceptable for files served from `public/` that cannot be processed (external SVGs, pre-baked OG images).

## Fonts — Fontsource only, no Google Fonts

Fonts are loaded via `@fontsource/*` packages, imported from `src/styles/base.css`. Zero request to `fonts.googleapis.com`.

`font-display: swap` is set globally in `base.css` — do not override it per family.

## Design tokens live on `:root`

All colours, spacing, radii, shadows, type scale: CSS custom properties on `:root` in `src/styles/tokens.css`. No hex colour in a component's `<style>` block. No `padding: 24px` where `padding: var(--space-6)` would do.

Dark mode (if introduced later) sits under a single `[data-theme='dark']` or `@media (prefers-color-scheme: dark)` block in `tokens.css` — components stay theme-agnostic.

## CSS — scoped `<style>` by default, no classes without a component

Astro scopes `<style>` blocks per component automatically. Use scoped styles for anything component-specific. The only place global rules belong is `src/styles/base.css` (reset, typography, prefers-reduced-motion guard).

- No Tailwind on this repo — the Backoffice uses it, this one does not. Vanilla CSS keeps the bundle small and the Lighthouse score honest.
- No CSS-in-JS, no CSS modules import outside `.astro` scoped `<style>`.
- BEM-like naming inside a component (`.hero`, `.hero__title`, `.hero--inverted`) if the scoped selectors need discrimination; otherwise plain element selectors are fine.

## Accessibility is not optional

Every interactive element has a name, a role, and keyboard support.

- Buttons are `<button>`, links are `<a>`, form inputs have an associated `<label>` (or `aria-label`)
- Colour contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Focus states visible on every interactive element — never `outline: none` without a visible replacement
- Headings in a logical order (single `<h1>` per page, no skipped levels)
- `prefers-reduced-motion` honoured — any animation guarded by a `@media (prefers-reduced-motion: no-preference)` block or disabled

## SEO baseline on every page

Every page sets, through the base layout slot or a per-page override:

- `<title>` — localised, under 60 chars
- `<meta name="description">` — localised, under 160 chars
- `<meta property="og:title" />`, `<meta property="og:description" />`, `<meta property="og:image" />`, `<meta property="og:url" />`
- `<meta name="twitter:card" content="summary_large_image" />`
- `<link rel="canonical" href="..." />` — per locale
- `<link rel="alternate" hreflang="fr" />` and `<link rel="alternate" hreflang="en" />`

`robots.txt` reflects the environment: `noindex` pre-launch, `allow` at launch.

## Performance budget — Lighthouse mobile ≥ 90

A hard release gate on every PR that touches a user-facing page: **90 or higher** on Performance, Accessibility, Best Practices, and SEO, Chrome DevTools Lighthouse mobile audit.

- No render-blocking third-party script above the fold. Analytics (Umami) loads with `defer`, after consent, or via a route-change event — never synchronously in `<head>`.
- No bundle over 100 KB gzipped — read `npm run build`'s size report.
- Fonts loaded with `font-display: swap`; preload only the LCP font family.

## Never render user-controlled HTML

Never pass user-controlled strings to Astro's `set:html`. If rich formatting is required, sanitise with a trusted library (DOMPurify client-side, or sanitise-html at build time).

## Deployment — Vercel

- Build command: `npm run build`
- Output directory: `dist/`
- Node version: `22`
- Env vars configured in Vercel's project settings for Production + Preview + Development
- PR previews are enabled; the preview URL is attached to every Notion ticket at `In Review` time
- No `vercel.json` unless strictly needed; when needed, keep CSP, HSTS, and Referrer-Policy headers there (or in Vercel's dashboard)
