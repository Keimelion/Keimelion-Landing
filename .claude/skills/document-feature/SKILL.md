---
name: document-feature
description: Updates Notion spec pages (features spec, MVP scope, architecture) to reflect what was actually implemented for a validated Landing ticket.
argument-hint: <Notion ticket URL or ID>
---

# Workflow: Document Feature (Landing)

Synchronise Notion documentation with the implemented Landing code for ticket: **$ARGUMENTS**

**Language**: all output must be in English — all Notion page content and comments.

---

## Step 0 — Context fetch (YOU do this, before delegating)

Fetch the following and store their full content:
1. The ticket: **$ARGUMENTS**
2. Features spec page: `336355b4-4d03-8185-9406-c5b4502a20fe`
3. MVP scope page: `336355b4-4d03-81d1-818e-e68530984a2a`
4. Architecture page: `336355b4-4d03-81b6-8ab1-c89eddc63c1b`

**Repo check**: confirm the ticket's `Repo` multi_select contains `Landing`. If it targets `API`, `BackOffice`, `Frontend`, or `Extension` without `Landing`, stop and inform the user — the wrong document-feature skill was invoked.

---

## Step 1 — Doc Writer: Documentation update

Delegate to the Doc Writer agent. Include in the delegation prompt:
- The full ticket content (from Step 0)
- The current content of the features spec, MVP scope, and architecture pages (from Step 0)
- **Instruction: do NOT call `get-page` — all content is already provided. Only write to Notion via the wrapper (`set-property`, `add-comment`).**

Doc Writer agent tasks:
- Read every file listed in "Files Involved" on the ticket (`.astro` components, i18n catalogues, env wrapper, `vercel.json`, …)
- Determine which Notion pages need updating based on what actually shipped:
  - **Features spec** — if a new section, page, flow, or user-facing behaviour was added or changed
  - **MVP scope** — if the feature was part of the V1 scope list
  - **Architecture** — only if a new structural pattern was introduced (new base layout slot, new design token, new i18n helper, new client-island loading convention, new Vercel/CSP header)
- Make targeted updates to each relevant page
- Cross-reference the API endpoint(s) consumed by the feature so future readers can navigate between repos
- Include the Lighthouse mobile scores from the ticket's test report when documenting user-facing changes
- Leave a comment on the ticket listing which pages were updated

---

## Output

Present a summary of:
1. Pages updated and what changed in each
2. Pages skipped and why
3. Link to the ticket
