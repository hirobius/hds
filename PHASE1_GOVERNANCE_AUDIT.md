# Phase 1 Audit — Owner Side (`@hirobius/design-system`)

**Repo:** `hirobius/hirobius-design-system` (the published package, token/component/governance owner)
**Sibling consumer:** `hirobius/ops` (out of this session's scope — see note in part (c))
**Mode:** Audit only. No edits made.

**Scope checked:** all root governance docs, the token files + pipeline, the
guardrail/script toolchain, the shared agentic protocol, and the published-package
boundary. I cannot read the `ops` repo (out of session scope), so part (c) is framed
as *"what this repo legitimately owns / publishes"* — which is exactly the list ops
should consume rather than copy.

---

## (a) Canonical inventory — the legitimate single sources of truth (must stay)

**Token system (owner-canonical):**

| File | Role | Status |
|---|---|---|
| `hirobius.tokens.json` | **THE** token SoT (W3C DTCG). Everything downstream. | Load-bearing |
| `tokens.lock.json` | Path snapshot consumed by `check-token-renames` / `check-token-paths-ratchet` | Load-bearing |
| `TOKEN_GOVERNANCE.md` | Canonical token-format & governance rules | Load-bearing |
| `TOKEN_MIGRATION.md` | Rename/removal log — **actively parsed** by `scripts/check-token-renames.mjs` and `check-token-paths-ratchet.mjs` to gate breaking changes | Load-bearing |
| `hirobius.tenant-tokens.schema.json` | Tenant overlay schema | Load-bearing |

**Generated downstream (do NOT edit by hand, but committed):** `src/styles/tokens.css`,
`src/app/design-system/generated-tokens.ts`, `DESIGN.md`, `llms.txt`/`public/llms.txt`,
`tailwind.config.tokens.cjs`. These are outputs of `pnpm tokens`, not sources.

**Design/brand spec:**

- `DESIGN.source.md` — **hand-authored source** for `DESIGN.md`.
- `DESIGN.md` — **generated** from `DESIGN.source.md` + tokens + manifest (header says "DO NOT EDIT"; enforced by `check-template-source-of-truth.mjs`).
- `DESIGN-HANDOFF.md` — verbose mirror.

**System inventory / machine docs:**

- `public/hds-manifest.json` (324 KB) — machine-readable component/inventory SoT. **Shipped in the package** (`files` + `/manifest` export).
- `src/app/data/component-api.json` — generated prop tables (see drift finding D2).

**Governance / operating docs (owner-only):** `CLAUDE.md` (operating contract),
`AGENTS.md`, `SYSTEMS_REGISTRY.md`, `OPERATING_MAP.md`, `BACKLOG.md`,
`HDS_COMPLIANCE_LOG.md`, `DECISIONS.md`, `PROCESS.md`, `docs/guardrails/*`
(incl. `HARDENING_ROADMAP.md`, `registry.json`), `docs/adr/*`, `docs/architecture/*`,
`docs/rules/*`.

**Pipeline / guardrail toolchain (owner-only):** `scripts/` (145 `.mjs/.js` files —
`build-tokens`, `verify-tokens`, `build-design-md`, `build-handoff`, `generate-manifest`,
`generate-component-api`, `generate-llms-txt`, plus ~70 `check-*`/`audit-*` gates),
`validators/`, `pipeline/`, `protocol/`, `.githooks/`, `docs/guardrails/registry.json`
(the gate registry with `firingChannel`).

---

## (b) Duplication & drift *within this repo*

| # | Finding | Verdict |
|---|---|---|
| **D1** | **`TYPOGRAPHY_REFACTOR.json` + `TYPOGRAPHY_MIGRATION_GUIDE.md` are STALE.** Both describe an 8-role system (`heading1/2/3`, `technical`, `badge`). The **live** `hirobius.tokens.json` `semantic.typography` is `display, h1, h2, h3, body, ui, eyebrow, mono`. The proposed names were never adopted verbatim. Grep confirms **zero references** to either file anywhere in the repo (no script, doc, or test reads them). | **Stale / historical.** Candidates for removal or `docs/_archive/`. Not load-bearing. |
| **D2** | **`src/app/data/component-api.json` does not exist on disk**, yet README, `AGENTS.md`, `CLAUDE.md`, `llms.txt`, and `OPERATING_MAP` all name it a source of truth. It's a *generated* artifact (`generate-component-api.mjs`, via `pnpm manifest:generate`) that isn't committed. | **Drift** — referenced SoT is absent. Either commit it or correct the references. |
| **D3** | **`TASKS.md` does not exist** (untracked, not gitignored), yet `AGENTS.md`, `SYSTEMS_REGISTRY.md`, `OPERATING_MAP.md`, `README.md`, and `TOKEN_GOVERNANCE.md` all route work to it. The real open-work doc is **`BACKLOG.md`** ("single source of truth for open work"). | **Drift** — canon points at a phantom file. Reconcile `TASKS.md`→`BACKLOG.md` everywhere. |
| **D4** | **Two `CONSUMING.md` files** — root `./CONSUMING.md` and `./docs/CONSUMING.md`, with **divergent** content. README references only `docs/CONSUMING.md`. | **Duplication.** `docs/` is canonical; root copy is the orphan. Consolidate to one. |
| **D5** | `AGENTS.md` links are hardcoded **Windows absolute paths** (`C:\Users\Adrian\...`) and it references a non-existent `scripts/<area>/SCRIPT.md` structure it then disclaims. | Cosmetic drift; low priority. |
| **D6** | Large committed **Figma export artifacts** (`hirobius.figma-variables.json` 178 KB, `hirobius.figma-variables-api.json` 234 KB) are *generated* by `build-figma-variables.mjs` and consumed by `audit-figma-system.mjs` as an audit baseline — not source. | Keep (audit baseline), but classify as generated, not SoT. |

**Explicitly NOT duplication (verified):**

- `DESIGN.md` vs `DESIGN.source.md` — generated/source pair, both load-bearing, gated by `check-template-source-of-truth.mjs`. **Keep both.**
- `TOKEN_GOVERNANCE.md` vs `TOKEN_MIGRATION.md` — different jobs (rules vs machine-parsed rename log). **Keep both.**
- `check-reduced-motion` vs `check-motion` — adjacent, intentionally distinct (per `SYSTEMS_REGISTRY.md`). **Keep both.**

---

## (c) What ops should consume from the published package (not hold its own copy of)

The package (`@hirobius/design-system` v0.4.0) `files` =
`["dist","src","hirobius.tokens.json","public/hds-manifest.json"]`, with subpath
exports `/tokens.css`, `/tokens`, `/manifest`, `/cn`, `/contexts`.

**ops should consume from the package, not duplicate:**

- **Token values** → `@hirobius/design-system/tokens` (TS) + `/tokens.css` (CSS vars). ops should **not** vendor `hirobius.tokens.json`, `tokens.css`, `generated-tokens.ts`, or re-run the token build.
- **System inventory** → `@hirobius/design-system/manifest` (the `hds-manifest.json`). ops should **not** keep its own manifest copy.
- **Components / `cn` / contexts** → package exports.

**ops should NOT hold copies of (owner-only — these govern *this* repo's source and have no meaning in a consumer):**

- The governance docs (`TOKEN_GOVERNANCE.md`, `DESIGN*.md`, `SYSTEMS_REGISTRY.md`, ADRs, `docs/guardrails/*`), and
- The token *pipeline* (`build-tokens`, `verify-tokens`, the `check-*`/`audit-*` gates). A consumer enforcing the owner's token-structure gates against generated package output is the ~30-doc + pipeline duplication the task describes — ops should delete its copies and depend on the published artifacts.

> The `ops` repo is out of this session's scope, so I'm asserting the *owner-side*
> boundary (the publishable surface above). The parallel ops-side audit removes
> against this list.

---

## (d) Should the shared agentic protocol be extracted into a shared package?

**Shared surface today (duplicated across both repos):** `scripts/self-heal.mjs`
(the heal loop), `playwright.config.ts` + the `tests/` guardrail specs
(a11y/layout/collision/visual), `CLAUDE.md`/`AGENTS.md` conventions, `.githooks/`,
and `claude-config/`.

**Recommendation: extract — but narrowly, and in two tiers.** This is the one part
to decide before Phase 2 because it changes repo topology:

- **Tier 1 — extractable now (low risk):** the *agentic protocol* that is genuinely identical and product-agnostic — `self-heal.mjs`, the Playwright base config, and the shared CLAUDE/AGENTS conventions — into a small `@hirobius/agent-protocol` (or config) package both repos devDepend on. This kills the two-copy drift directly.
- **Tier 2 — keep owner-only (do NOT extract):** the token/DS guardrail gates (`check-*`/`audit-*`, `validators/`, `registry.json`). These assert facts about *this* repo's token source and component library; they have no purpose in ops and shouldn't move.

A lighter alternative if you don't want a new package yet: publish the protocol files
as an additional export of *this* package (it's already the owner) and have ops import
them — fewer moving parts, one fewer release pipeline.

---

## Recommended Phase 2 work order (for approval)

1. **Stale removal** (D1): archive/delete `TYPOGRAPHY_REFACTOR.json` + `TYPOGRAPHY_MIGRATION_GUIDE.md` (zero refs, contradict live tokens). *Per CLAUDE.md dispatch rules, deletions go to a `sonnet` agent.*
2. **Reference repair** (D2, D3): fix the `component-api.json` and `TASKS.md`→`BACKLOG.md` references across canon docs (or generate+commit `component-api.json`).
3. **De-dupe** (D4): collapse the two `CONSUMING.md` to the `docs/` canonical one.
4. **Protocol extraction** (d): only if the package/export route is chosen — sequence it last.

Each change followed by `pnpm typecheck` + `pnpm run heal`, Playwright, the self-heal
loop, and a `HDS_COMPLIANCE_LOG.md` entry, per CLAUDE.md.

---

## Two decisions needed before any edits

1. **D2 (component-api.json):** generate & commit it, or strip the SoT references?
2. **(d) protocol extraction:** new shared `@hirobius/agent-protocol` package, add an export to *this* package, or leave as-is for now?
