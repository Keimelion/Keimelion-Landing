---
name: build-feature
description: Ships a Landing Notion ticket end-to-end via the single senior Dev agent. The Dev owns implementation + self-review + smoke test + validation on one pass — no separate Lead Dev, DevOps, or Tester agent.
argument-hint: <Notion ticket URL or ID>
---

# Workflow: Build Feature (Landing)

**Backlog kanban**: `66c4450ed2d04ad68c1b06e522169e6c`

Ship the ticket: **$ARGUMENTS**

**Language**: all output must be in English — code, commit messages, PR titles and descriptions, Notion updates, GitHub comments.

**Valid Notion statuses** (exact values, case-sensitive):
`Todo` | `In Progress` | `In Review` | `Done` | `Validated`

**Status flow**: `Todo` → `In Progress` → `In Review` → `Validated`

The Dev agent owns every stage. It does not hand off to a Lead Dev / DevOps / Tester agent — those hats are worn by the same Dev in the same session.

## Notion access

All Notion interactions go through the local wrapper (Notion MCP is not used):

```bash
node scripts/notion/notion.mjs get-page <page-id>
node scripts/notion/notion.mjs set-status <page-id> "<status>"
node scripts/notion/notion.mjs set-property <page-id> "<field>" "<value>"
node scripts/notion/notion.mjs add-comment <page-id> "<text>"
```

Requires `NOTION_TOKEN` in the shell env.

## Commit + PR title convention

```
<type>: <identifier> <short description> (<TICKET-ID>)
```

- `<type>` — Conventional Commits: `feat` | `fix` | `refactor` | `chore` | `docs` | `perf` | `test` | `style` | `build` | `ci`
- `<identifier>` — the primary thing the ticket touches (page path like `/` or `/en`, component name like `hero` or `waitlist-form`, or module path like `_config/env`, `_i18n`)
- `<short description>` — plain sentence, no period, no filler
- `<TICKET-ID>` — always at the end in parens: `(KEI-N)`

Examples:
- `feat: / hero section with waitlist CTA (KEI-141)`
- `feat: /en mirror of homepage + i18n catalogue (KEI-142)`
- `perf: hero preload LCP image + eager decode (KEI-143)`
- `chore: _config/env add PUBLIC_UMAMI_WEBSITE_ID (KEI-144)`

Intra-branch fix-up commits reuse the parent PR's identifier: `fix: hero clamp subtitle at 320px (KEI-141)`.

## Base branch

The Landing uses `main` as the base branch (not `dev`). Vercel builds a preview on every PR and promotes `main` to production automatically.

---

## Step 0 — Context fetch and dependency check (YOU, before delegating)

Fetch the ticket **$ARGUMENTS** yourself with the wrapper and store its full content:

```bash
node scripts/notion/notion.mjs get-page <page-id>
```

Extract: title, status, priority, epic, `Repo`, description, acceptance criteria, technical notes, files involved, PR URL, blocked-by, comments.

**Repo check**: confirm `Repo` contains `Landing` (Repo is a `multi_select`). If it targets `API`, `BackOffice`, `Frontend`, or `Extension` without `Landing`, stop and inform the user — the wrong build-feature skill was invoked.

**Dependency check**: inspect the `blocked_by` array. If any entry is not `Done` or `Validated`:
- `add-comment` listing the blockers and their current status
- Stop the pipeline and inform the user — do not proceed with implementation

Pay special attention to API dependencies: a Landing ticket often consumes a public API endpoint (`POST /v1/public/waitlist`, …) that must exist first. If the blocking API ticket is not yet Done/Validated, the Landing ticket cannot proceed.

---

## Step 1 — Delegate to the Dev agent

Delegate to the Dev agent. Pass in the prompt:
- The full ticket content (from Step 0) — title, description, acceptance criteria, technical notes, files involved
- Any comments on the ticket that add context
- The page ID (so the Dev can update Notion via the wrapper without another fetch)

The Dev agent then executes its full workflow (documented in `.claude/agents/dev.md`):
1. Sync `main`, create the branch, mark ticket `In Progress`
2. Read existing patterns (components, pages, i18n catalogues)
3. Implement tokens/base styles → components → page wiring (both FR + EN locales)
4. **Self-review** against the merged Lead Dev + DevOps + Tester checklist
5. Run static checks (`npm run lint`, `npm run typecheck`, `npm run build`)
6. Smoke-test the built site in a browser against every acceptance criterion, including a Lighthouse mobile audit on changed pages (budget ≥ 90 across the four categories)
7. Commit, push, open the PR targeting `main`
8. Mark `In Review` + attach PR URL + Files Involved on the ticket
9. Mark `Validated` + post the test report as the final Notion comment

The Dev is expected to fix issues found in its own self-review directly, on the same branch, in the same session — there is no separate reviewer to bounce back to.

---

## Final Summary

Once the pipeline completes, present:
1. Notion ticket final status (must be `Validated`)
2. PR URL (ready to merge into `main`)
3. Vercel preview URL (from the PR checks)
4. Branch name and files created/modified
5. Static-check results + browser smoke summary + Lighthouse scores
6. Any items the Dev flagged as follow-ups (out-of-scope refactors, tech debt) — the user decides whether to file a new ticket
