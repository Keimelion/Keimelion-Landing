---
name: refine-ticket
description: Collaborative refinement of a Landing ticket — the PO and the senior Dev discuss a Notion ticket together to clarify requirements, identify edge cases, agree on the technical approach, and update the ticket with a refined spec before implementation starts.
argument-hint: <Notion ticket URL or ID>
---

# Workflow: Refine Ticket (Landing)

**Backlog kanban**: `66c4450ed2d04ad68c1b06e522169e6c`
**Features spec**: `336355b4-4d03-8185-9406-c5b4502a20fe`
**MVP scope**: `336355b4-4d03-81d1-818e-e68530984a2a`
**Architecture**: `336355b4-4d03-81b6-8ab1-c89eddc63c1b`
**Conventions**: `336355b4-4d03-81a2-97e6-f9fc18df0d87`

Run a refinement session for ticket: **$ARGUMENTS**

**Language**: all output must be in English — ticket descriptions, acceptance criteria, technical notes, Notion comments.

The PO reviews the ticket from a product perspective and the Dev reviews it from a technical + security + testability + performance perspective (the Dev now owns Lead Dev, DevOps, and Tester concerns in one hat).

## Notion access

Both agents use the local wrapper — Notion MCP is not used anywhere:

```bash
node scripts/notion/notion.mjs get-page <page-id>
node scripts/notion/notion.mjs add-comment <page-id> "<text>"
node scripts/notion/notion.mjs set-property <page-id> "<field>" "<value>"
```

Requires `NOTION_TOKEN` in the shell env (auto-loaded from `.env.local` / `.env` in the CWD).

---

## Step 0 — Context fetch and dependency check (YOU do this, before delegating to any agent)

Fetch the following pages yourself using the wrapper (`node scripts/notion/notion.mjs get-page <id>`) and store their full content:
1. The ticket: **$ARGUMENTS**
2. Features spec: `336355b4-4d03-8185-9406-c5b4502a20fe` — for the PO
3. MVP scope: `336355b4-4d03-81d1-818e-e68530984a2a` — for the PO
4. Architecture: `336355b4-4d03-81b6-8ab1-c89eddc63c1b` — for the Dev
5. Conventions: `336355b4-4d03-81a2-97e6-f9fc18df0d87` — for the Dev

**Repo check**: confirm the ticket's `Repo` multi_select contains `Landing`. If it targets `API`, `BackOffice`, `Frontend`, or `Extension` without `Landing`, stop and inform the user — the wrong refine-ticket skill was invoked.

**Dependency check**: if the ticket has entries in "Blocked By", fetch each of those tickets and check their status. If any dependency is not `Done` or `Validated`:
- Leave a comment listing which dependencies are not yet done and their current status
- **Stop the refinement** and inform the user — a ticket cannot be refined if its dependencies are not yet implemented

Pay special attention to **API dependencies**: a Landing ticket often consumes a public API endpoint (`POST /v1/public/waitlist`, …). If the required endpoint is not implemented yet, refinement should stop until the API side lands.

Each agent receives only the pages relevant to their role (see steps below).

---

## Step 1 — PO: Requirements review

Delegate to the PO agent. Pass:
- The full ticket content (from Step 0)
- The features spec and MVP scope content (from Step 0)

PO agent tasks:
- Assess clarity of the description and acceptance criteria:
  - Are the acceptance criteria complete, measurable, and testable from a browser-observable perspective?
  - Is the scope clear — what is IN and what is OUT?
  - Are there missing business rules or undefined edge cases?
  - Does the ticket set a Lighthouse mobile budget? If the feature changes a user-facing page and no budget is declared, flag it as a missing AC.
  - Which API endpoint(s) does the feature consume, and are they ready?
  - Does the feature touch both locales (FR + EN)? Both must be in scope.
- Produce a list of open questions and clarifications
- Do NOT modify the ticket yet — only report findings

**Capture** (concise — bullet points only): open questions, scope concerns, missing acceptance criteria, API endpoints consumed, RGPD/perf implications.

---

## Step 2 — Dev: Technical + security + testability + performance review

Delegate to the Dev agent. Pass:
- The full ticket content (from Step 0)
- The architecture and conventions content (from Step 0)
- PO summary from Step 1

Dev agent tasks — the Dev wears all three hats (Lead Dev, DevOps, Tester):

**Lead Dev hat — approach and architecture**
- Which files need to be created or modified (components, pages FR + EN, i18n catalogues, tokens, env wrapper, vercel.json)?
- Is this a static-only feature, or does it need a client island? If a client island is needed, is the behaviour truly impossible without JS?
- Which base layout / shared components does it extend or reuse?
- Are there new design tokens needed? Any token change must be centralised in `src/styles/tokens.css`.
- Are the acceptance criteria technically testable in the production preview?
- Are there missing technical constraints (form state transitions, error states, SEO meta tags, Open Graph image)?

**DevOps hat — security, infra, SEO, perf constraints**
- Does this feature introduce new user inputs that need Zod validation?
- Are there sensitive fields (email on the waitlist, …) — how are they transmitted and logged on the API side?
- Are there new `PUBLIC_*` env vars needed? Is any of them secret-adjacent? Any `PUBLIC_*` is shipped in the client bundle — flag anything that should NOT be there.
- Does the flow include any redirect that could become an open-redirect risk?
- Any CSP / HSTS / Referrer-Policy change needed (new external image domain, new script source, new font source)?
- Any new third-party request? If yes, is it RGPD-compliant (consent before load, self-hosted alternative, …)?
- Lighthouse mobile budget: declare the acceptable minimum for every changed page (default ≥ 90 on all four categories).

**Tester hat — what will need to be verified**
- Which acceptance criteria will be validated on the Vercel preview URL vs. only on the production deploy?
- Both locales exercised (`/` and `/en`)?
- Mobile viewport (320px) exercised?
- Keyboard-only navigation exercised?
- Any edge cases (slow network, offline, long inputs, non-Latin scripts) worth calling out in the spec?

Produce a consolidated report:
- Proposed implementation approach
- Files to create/modify
- Static vs client island plan
- Security/infra/SEO/perf constraints
- Testability notes
- Complexity estimate (Simple / Medium / Complex)
- Blocking questions

Do NOT modify the ticket yet.

**Capture** (concise — bullet points only): approach, files, security constraints, perf budget, complexity, blocking questions.

---

## Step 3 — User validation (REQUIRED before updating the ticket)

Before touching the Notion ticket, present a consolidated summary to the user:

- **PO findings**: key questions, scope concerns, API dependencies, both-locale coverage
- **Dev assessment**: proposed implementation approach, static vs island plan, security/perf constraints, complexity estimate
- **Open questions**: anything unresolved that the user needs to answer

Then ask:
1. Do you agree with the proposed approach?
2. Are there any open questions you can answer now?
3. Anything to add or change before the ticket is updated?

**Wait for the user's response before proceeding to Step 4.** Incorporate their answers into the final update.

---

## Step 4 — Synthesis and ticket update

Based on both perspectives and the user's input, update the Notion ticket with:

**Refined description** — clear, complete, unambiguous

**Acceptance criteria** — each criterion must be:
- Written as a testable statement from the visitor's perspective in the browser ("Given X, when Y, then Z")
- Covering the happy path, error cases, and UX states (loading / success / error)
- Explicit on Lighthouse mobile budget for every user-facing page the ticket changes
- Explicit on both-locale coverage (FR + EN)

**Technical approach** — agreed implementation plan:
- Files to create/modify (components folder, both-locale pages, i18n catalogues, tokens, env wrapper, vercel.json)
- Static vs client-island plan
- SEO meta tags, Open Graph image, canonical URL, hreflang pair
- API endpoint consumed (with method + path) and its ticket ID if any

**Security & infra constraints** — from the Dev's DevOps-hat review:
- Validation rules, sensitive fields, auth-free paths, env vars (`PUBLIC_*`), redirect handling, CSP/HSTS adjustments, RGPD check on third-parties

**Open questions** — if any questions remain unresolved, list them explicitly with the name of whoever needs to answer them

**Status update** — only if the current ticket status is `Todo` or has no status set, update it to `Todo` to signal it is ready for implementation. If the ticket is already in any other status (e.g. `In Progress`, `In Review`), leave the status unchanged.

Leave a comment: "Refinement completed on [date] — ticket is ready for implementation." Include any key decisions made by the user during the validation step.

---

## Output

Present a summary of:
1. Key decisions made during refinement
2. Security/infra/perf constraints identified by the Dev
3. Open questions still pending (if any)
4. Link to the updated Notion ticket
