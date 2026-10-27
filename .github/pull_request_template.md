<!--
PR title must follow Conventional Commits + ticket ID:
  <type>: <identifier> <short description> (KEI-N)

Examples:
  feat: / hero section with waitlist CTA (KEI-141)
  chore: _config/env add PUBLIC_UMAMI_WEBSITE_ID (KEI-144)
-->

## Summary
-

## Notion ticket
<!-- Paste the Notion page URL -->

## Test plan
- [ ] `npm run lint` clean
- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds
- [ ] Vercel preview deploy green
- [ ] Smoke test on preview: both locales (`/`, `/en`), happy path, error states
- [ ] Lighthouse mobile ≥ 90 on all four categories for changed pages
- [ ] All acceptance criteria verified in the preview URL
