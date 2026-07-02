# Backlog (SUPERSEDED for this repo — see GitHub Issues)

> **2026-07-02:** This repo's task source of truth is now **GitHub Issues**
> (label `backlog`) per the fleet-hub convention in CLAUDE.md. All live
> HDS-repo items below were filed as issues #46–#57. Remaining entries here
> are cross-project (Concrete Creations, Client Work, ops dashboards,
> portfolio) and await migration to the hirobius/ops hub — do not add new
> items to this file.

Single source of truth for open work. Plain markdown — any tool (humans, AI,
IDE) can read or edit. Items grouped by area; tags show status.

**Legend:**

- `ready` — picked, start anytime
- `blocked` — waiting on a decision or dependency
- `parked` — intentionally deferred
- `needs-grilling` — scope not yet pinned down
- `idea` — proposed seed, not committed

Consolidated 2026-05-11 from `docs/ai/orchestration.json`,
`~/.hermes/kanban.db`, and `docs/ai/proposed-units.jsonl` (all archived to
`docs/ai/_archive/`).

---

## Portfolio (adrianmilsap.com) _(7)_

- `ready` **portfolio-about-bio-copy** — Draft /info About bio: one grounded first-person paragraph + LinkedIn/GitHub links
- `parked` **portfolio-tab-focus-ring-polish** — Desktop visual QA: focus ring through sidebar items, dropdown groups, indicators, nested nav states
- `parked` **portfolio-language-switcher-rtl-qa** — Finish language switcher and LTR/RTL visual QA across home / case study / /info
- `parked` **portfolio-launch-screenshots** — Capture launch screenshots: shell IA, before/after improvements, case-study evidence
- `ready` **portfolio-missing-asset-references** — src/app/data/projects.ts references 104 image paths (e.g. `/assets/xds/xds-1.jpg`, `/assets/hds/hds-1/01.jpg`, `/assets/lab/*.jpg`) that don't exist on disk. Rendered on /visuals — produces 404s in browser console. Decide per-card: provide assets OR remove dead entries from projects.ts.
- `parked` **portfolio-asset-population-validation** — Validate production folder structure + naming + responsive derivatives before bulk asset intake
- `parked` **backlog-8-case-study-auto-journaling** — Case study auto-journaling

## Concrete Creations _(8)_

- `ready` **12u-cc-repo-bootstrap** — Concrete Creations: bootstrap separate repo importing HDS as dependency
- `ready` **12u-cc-product-catalog-data-model** — Concrete Creations: product catalog data model + admin authoring flow
- `ready` **12u-cc-stripe-checkout-integration** — Concrete Creations: Stripe Checkout (hosted) integration — payments live
- `ready` **12u-cc-wa-legal-pages** — Concrete Creations: WA-compliant legal pages (terms, privacy, refunds, shipping)
- `ready` **12u-cc-handmade-asset-pipeline** — Concrete Creations: handmade-product asset pipeline
- `ready` **12u-cc-ai-content-repurpose-pipeline** — Concrete Creations — AI content repurposing pipeline (Hormozi model)
- `blocked` **t_968c0cb4** — concrete-creations
- `parked` **12n-api-monorepo-workspace-split** — OPUS PLAN: monorepo workspace split (packages/hds + apps/site + apps/concrete-creations)

## Client Work _(3)_

- `ready` **t_ad1b2374** — Client-bucket skills suite (4 sub-skills)
- `idea` **client-facing-portal-route** — Token-gated /c/:slug client portal
- `idea` **dashbd-skill-bundle-client-augment** — Client-bucket augmentation: meeting→tasks + weekly client digest

## HDS / Design System _(10)_

- `ready` **12i-bloat-hdslayout-architectural-split** — HDSLayout architectural split: 1918 LoC → 5 modules + slot-based shell
- `ready` **12q-figma-system-drift** — Resolve Figma library variable drift (HITL)
- `ready` **12q-figma-master-shadcn-fidelity** — Figma masters visually mirror shadcn React render (multi-tenant)
- `ready` **13y-21-figma-export-refresh** — Refresh Figma plugin variable export to match repo source
- `ready` **t_0472231f** — /lab Staging workspace — Variants/Themes/Research three-tab shell
- `ready` **t_b89f2dd7** — Visual evolution foundation: primitives + vocabulary + theme explorer
- `parked` **12q-semantic-page-headings** — Add heading structure to InfoPage and SandboxPage
- `idea` **session-late-audit-figma-system-fix** — Fix audit-figma-system gate failure
- `idea` **figma-plugin-planning-docs-save** — Save Figma DesignOps planning dumps to docs/figma-plugin/
- `idea` **atlas-absorb-hds-docs** — Absorb HDS documentation into /ops/atlas

## Ops / Agents _(15)_

- `ready` **t_gmail_ci_triage** — Triage failed-run emails in adrian@hirobius.com Gmail: identify which repos/workflows they come from (likely the since-fixed/retired HDS lanes, scheduled workflows slated for sterilization, or job-hunt CI), diagnose, then fix or remove the noise source. Deferred 2026-07-01 in favor of the Figma build-out.
- `ready` **t_be5c5b75** — AI-powered Build skills bundle (6 sub-skills)
- `ready` **t_bc7081a8** — Daily task picker view — pick from 474 units, queue for today
- `ready` **t_4ddf8e05** — Quality-gate skills (designer-engineer routine checks)
- `blocked` **t_edd336b5** — Service buttons + Roadmap Kanban routing
- `blocked` **t_d3b5353a** — Improve loose threads rail — session context, workspace correlation, branch→assignee
- `blocked` **t_9d5ec287** — Triage 7 investigate-broken gates from soft-gates audit
- `blocked` **t_adadb12f** — Surface youtube-knowledge as Knowledge-bucket button
- `idea` **dashbd-skillsbar-input-shell** — SkillTile input-shell variant for input-needing skills
- `idea` **dashbd-skill-creator-meta** — 'New skill' capture button + proposed-skills.jsonl seam
- `idea` **dashbd-skill-bundle-self** — Self-bucket skills (recruiter-facing + founder hygiene)
- `idea` **dashbd-skill-bundle-sales** — Sales-bucket skills (CRM minimums for solo agency)
- `idea` **dashbd-visual-ingest-drag-drop** — Drag-drop image + video inputs for visual-ingest / page-clone buttons
- `idea` **dashbd-auto-research** — Auto-research — scheduled research jobs that surface findings to /ops
- `idea` **dashbd-task-pillar-classification** — Adaptive pillar/category field on orchestration units

## Security / Compliance _(3)_

- `ready` **13s-10-grc-career-planning** — GRC career positioning — research + planning (HITL)
- `blocked` **t_52a4852d** — Investigate B2 OWASP SAMM 88→75 regression
- `blocked` **t_5f36efeb** — Investigate B6 OSV/audit 100→95 drift mid-session

## Other / Uncategorized _(14)_

- `blocked` **t_35125ddb** — check-typography-discipline: skip Windows-drive-letter top-level paths
- `blocked` **t_23df2183** — Lanes tiles drill into Pipeline tab pre-filtered to lane
- `needs-grilling` **backlog-14-agency-dashboard-codeburn** — Agency dashboard — codeburn cost observability + moving parts spec
- `parked` **backlog-4-strict-type-polymorphism** — Strict type polymorphism
- `parked` **backlog-5-flush-code-review** — Flush code review
- `parked` **backlog-6-ai-optimized-context-jsdoc** — AI-optimized context JSDoc
- `parked` **backlog-7-incubator-visual-diff-gallery** — Incubator visual diff gallery
- `parked` **backlog-15-orphan-circular-dom-budgets** — Orphan sweeper + circular dep locks + DOM node budgets
- `parked` **12v-token-system-modes-beyond-light-dark** — System modes beyond light/dark — high-contrast + reduced-motion + sepia (parked)
- `parked` **13z-7-scripts-audit-and-prune** — Audit scripts/ for unreferenced one-offs and prune
- `idea` **session-late-kimi-notify-false-positive-tighten** — Tighten kimi drain-notify false-positive surface
- `idea` **dashbd-skillsbar-wire-input-skills** — Wire 13 input-needing buried scripts as buttons via input-shell
- `idea` **dashbd-approved-triage-tool** — Approved-bucket triage command (gap: no dedicated tool today)
- `idea` **dashbd-skill-token-impact-trace** — Token impact trace — blast-radius report per token

---

**Total: 69 open items.**

## Conventions

- **Add work**: append to the appropriate section. ID = kebab-case, area-prefixed.
- **Ship work**: delete the line. Git log is the historical record.
- **Change status**: edit the badge in place.
- **Needs a plan?** Link to one: `- \`ready\` **id** — title ([plan](./docs/plans/id.md))`.
- **Re-categorize**: just move the line. No tooling enforces categories.
