# Hirobius Design System — Roadmap & Technical Debt

Living backlog for the **design-system repo only** (components, tokens, docs
site, published package). Ops/orchestration work lives in the ops repo.

Status: 🔴 not started · 🟡 in progress · ✅ done
Priority: **P1** = highest leverage.

---

## 1. Figma tooling

The Figma stack (bridge, token/variable sync, snapshot/diff/audit, Code Connect
check, CI workflow) is coherent. Recent repairs + remaining cleanup:

- ✅ **Generative pipeline** — added `telemetry/logger.mjs` no-op stub; `pnpm
  ui:masters` / `ui:gen` / `ui:fix` work again (`build-figma-masters.mjs`,
  `pipeline/retry-loop.mjs` import it).
- ✅ **Bridge crash guard** — `hds-bridge.mjs` `readOrchestration()` degrades to
  `{ units: [] }` when `docs/ai/orchestration.json` is absent (it moved to ops),
  so `/orchestration/*` + `/build-status` no longer 500. `figma:bridge:smoke`
  passes.
- 🔴 **Remove orchestration vestige from the bridge** — `/orchestration/list`,
  `/orchestration/approve`, `/build-status` and `scripts/test-bridge-endpoints.mjs`
  are ops-domain functionality embedded in the Figma bridge. Strip them so the
  bridge is purely Figma (token/component sync).
- 🔴 **Reconcile env var names** — `scripts/figma-sync.ts` expects
  `FIGMA_PAT` / `FIGMA_FILE_ID`; CI (`sync-figma-variables.yml`) uses
  `FIGMA_PERSONAL_ACCESS_TOKEN` / `FIGMA_FILE_KEY`. Document or unify.
- 🔴 **Refresh stale docs** — `docs/figma-plugin/{EXECUTION_PLAN,ROADMAP}.md`
  still reference the retired `orchestration.json`.

---

## 2. Component library — technical debt

### P1 🔴 Adopt accessible primitives (foundation: **Radix UI**)
Only 3 Radix primitives are in use (dialog, slot, tabs); the rest are hand-rolled
with real a11y gaps. Replace them with Radix — one move fixes the a11y holes
**and** closes ~6 coverage gaps.
- `HdsSelect` (`controls.tsx:472`) — no `aria-activedescendant` (screen-reader
  failure) → Radix Select / Combobox.
- `Disclosure` (`disclosure.tsx`) — not `<details>`/Radix → Radix Accordion/Collapsible.
- `SegmentedControl` (`segmented-control.tsx:113`) — `aria-pressed` instead of a
  radiogroup pattern → Radix Radio Group or Toggle Group.
- Adds for free: Popover, Tooltip (real WCAG, not the image affordance in
  `tooltip.tsx`), Dropdown Menu, Checkbox, Switch.
- _Rationale: light/agile team → Radix is mature, already adopted, and
  shadcn-compatible for copy-paste velocity._

### P2 🔴 Real form layer
- `Field` (`field.tsx`) is read-only metadata, **not** an input wrapper. Add a
  `FormField` (label + description + error + `aria-describedby`/`aria-invalid` wiring).
- Add missing inputs: **Checkbox** (with `indeterminate`), **Textarea**.
- Optional: a `react-hook-form` adapter (`Controller` wrappers).

### P3 🔴 Unify the styling model
- Two parallel systems: new CVA + Tailwind v4 (Button/Input/Dialog/Tabs) vs old
  inline-style `hds` token bridge (Select/Toggle/Radio/Slider/SegmentedControl/
  Surface/Card) + a hand-written `utilities.css` fallback. Pick CVA+Tailwind v4
  and migrate the inline primitives.
- Close the **token dark-mode hole**: some `hds.color.*` entries embed static
  values (`tokens.ts`) that ignore the CSS cascade and only switch via JS
  `isDark`. Make every `hds.*` reference a CSS var.

### P4 🔴 Curate the public API
- Stop exporting doc-infra from the barrel (`src/index.ts`): `SpecimenBlock`,
  `ComponentDocPage`, `FoundationSwatch`, `ComponentInstanceMatrix`,
  `HdsSystemDocLayout`, `DocLinkCard`.
- Remove stray `"use client"` directives (`surface.tsx`, `badge.tsx`) — no-ops in
  Vite/React-Router; decide RSC posture explicitly before re-adding.

### P5 🔴 Governance
- Storybook coverage ~37% of components — raise it; lift unit-test thresholds.
- The manifest + existing gates can enforce a per-component story/test baseline.

---

## 3. Component coverage gaps (missing vs a modern DS)

High: Checkbox, Textarea, accessible Tooltip, Popover, Combobox/Select,
Dropdown Menu. — Medium: Toast, Accordion, Drawer/Sheet, Date picker, standalone
Progress/Spinner, Context menu. — Low: Avatar, Breadcrumb, Pagination, Data table,
Form.

Most High/Medium items come for free with **P1 (Radix adoption)**.

---

## 4. Notes

- Benchmarked against the current frontier: shadcn registry distribution,
  Radix / Base UI / Ark + Zag, Tailwind v4 CSS-first config, Style Dictionary v4,
  Figma Code Connect + Dev Mode variables.
- Strengths to preserve: the 3-tier DTCG token system, multi-tenant theming
  (`tenants.css`), dark-mode CSS cascade, enforced ref-forwarding, and the
  `Button`/`Input`/`Dialog` CVA+Radix patterns as the migration template.
