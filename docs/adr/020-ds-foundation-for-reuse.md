# ADR-020: DS foundation for reuse — Radix behavioral layer, framework-agnostic theming, and component ingestion

- **Status:** Accepted
- **Date:** 2026-07-02
- **Decider:** Adrian
- **Related:** ADR-016 (scoped base styles), ADR-001 (multi-tenant scope),
  `hirobius.tokens.json` (DTCG source of truth), issues #59–#64

## Context

HDS is being positioned as the reusable foundation for future projects —
React apps, and **Astro sites built rapidly** (the "access tech" pattern:
mostly static HTML, interactive pieces hydrated as islands). Four capabilities
need to be first-class and future-proof:

1. **Behavioral correctness** — accessible, keyboard-complete interactive
   components.
2. **Complete states & variants** — every component ships its full matrix
   (rest · hover · active · focus · disabled × tone × size), consistently.
3. **Downstream theming** — consumers will override **fonts**, **spacing
   density**, and **brand color**, up to **multiple brands switchable at
   runtime**.
4. **Ingestion** — a repeatable recipe so new components arrive fully wired.

Audit of the current repo (2026-07-02) shows the vision is already **seeded but
partial**, which reframes this as consolidation, not a rebuild:

- **Radix** is a dependency and used in 11 files — dialog, dropdown-menu,
  popover, select, tabs, toast, toggle-group, slot. But **checkbox, radio,
  toggle (switch), slider, tooltip, disclosure (accordion)** are hand-drawn,
  each duplicating a state machine Radix ships for free.
- **Variants**: only 10 of 96 components use `cva`; axis vocabulary is
  inconsistent.
- **Multi-brand** already works via `[data-tenant="slug"]` overlays generated
  by `build-tokens.mjs` from `tenants/<brand>/tokens.json`; `scaffold-tenant.mjs`
  exists.
- **Density** is scaffolded: `[data-density="compact"]` drives `--hds-space-*`,
  comfortable as default.
- **Tokens** are a clean 4-tier DTCG cascade (primitive → semantic → role →
  component) exposed as CSS variables — the correct shape for overrides.
- A **component scaffolder** (`scaffold-component.mjs`) exists but isn't a
  full "arrives configured" recipe.

## Decision

Adopt the following, executed as a deliberate **1.0.0** (breaking allowed;
pre-1.0, only first-party consumers) in **staged PRs**.

### 1. Behavioral layer — Radix everywhere it has a primitive

Adopt Radix wrappers with the existing token-bound visual skin kept intact,
where Radix earns its place. Radix owns behavior/ARIA/focus; HDS owns the paint,
which stays bound to variables. `Slot`/`asChild` stays the composition seam.

**Amendment (2026-07-02, after reading the components).** The original
"convert all six" was based on a shallow grep. In fact checkbox, radio, and
toggle are already accessible native `<input>`s (real `aria-checked`, keyboard),
and disclosure already has `aria-expanded`/`aria-controls` + focus management —
so converting them is lateral churn with visual-regression risk for little a11y
gain. "Tooltip" is not a tooltip at all: an `@internal` image-expand pill bound
to `AssetImg` (portfolio, deletion-slated in #49). Refined scope:

- **Slider → Radix** — *done.* Native `<input type=range>` can't be styled
  reliably cross-browser and can't do a two-thumb range; Radix fixes both. API
  preserved (`value: number`, `onChange`); ref type is now the Radix root.
- **New `HdsTooltip` on Radix** — HDS lacks a real tooltip; net-new, additive.
- **Disclosure → Radix Collapsible** — optional; already accessible, so
  standardization-only. Deferred.
- **checkbox / radio / toggle — kept native.** Already accessible; a Radix
  rewrite is lateral risk, not a win.

### 2. Variant contract — `cva`, standardized axes, complete-states matrix

Every component exposes the same axis vocabulary — `variant` (structural),
`tone` (semantic intent), `size`, and reads `density` from context/attribute —
via `cva`. "Complete states and variants" becomes an enforced convention: the
full state matrix must exist and be covered by Storybook, checked by a gate
(extends `check-prop-vocabulary`).

### 3. Theming contract — framework-agnostic, HTML-attribute-driven

The public override surface is the **CSS-variable cascade keyed off plain
`data-*` attributes on the root element**, so it works with **zero JavaScript**
(critical for static Astro pages). Four documented "dials":

| Dial | Mechanism | Astro (static) | React (convenience) |
|------|-----------|----------------|---------------------|
| **Font** | `--hds-font-family*` override block | set the vars in a `<style>` / layout | `HdsThemeProvider font=` |
| **Density** | `data-density="comfortable\|compact"` → `--hds-space-*` | attribute on `<html>` | `HdsThemeProvider density=` |
| **Brand color** | `data-brand="slug"` overlay remapping `--semantic-accent-*` / surfaces | attribute on `<html>` | `HdsThemeProvider brand=` |
| **Theme** | `data-theme="light\|dark"` | attribute on `<html>` | existing |

A typed **`HdsThemeProvider`** is added as a convenience for React apps — it
only sets these attributes (and exposes `useHdsTheme()`); it is **not** required
for the styles to work. `data-tenant` is renamed/aliased to the clearer
**`data-brand`** for the reuse story (tenant remains a supported alias).

### 4. Multi-brand — coexisting overlays + runtime switch

Each brand is a `tenants/<brand>/tokens.json` overlay compiled to a
`[data-brand="slug"]` block (build-time). Multiple overlays coexist in the
shipped CSS; switching is just changing the attribute — statically in Astro, or
live via `HdsThemeProvider brand=` in React. No per-brand build required.

### 5. Ingestion — `pnpm hds:new <Name>`

Level up `scaffold-component.mjs` into a recipe that emits, in one command: the
component `.tsx` (Radix wrapper + `cva` skeleton + token bindings), a Storybook
story, a test, the manifest entry, the `component-api.json` extraction, and a
Code Connect stub. New components arrive standardized and hand-off-ready.

### 6. Astro / framework-agnostic consumption

- The **core** (tokens + `styles.css` + data-attribute theming) is usable with
  **zero JS** — Astro pages import the stylesheet, set `data-brand/density/theme`
  in the layout, and use HDS classes/markup.
- **React + Radix** components are consumed as **islands** (`client:*`).
- Ship **per-component subpath exports** (folds in #55) so an island hydrates
  only its own component, not the barrel.
- Provide a **CSS-only layer** for static primitives (badge, card, alert,
  divider, tag) so static Astro pages render them without shipping React.

## Consequences

- **Breaking (1.0.0):** the six custom controls change internals (and some
  props) as they move to Radix; `data-tenant` gains the `data-brand` alias.
  Documented in a single migration note. First-party consumers only.
- **a11y + consistency up**, hand-rolled interaction code down.
- The theming contract becomes a **documented, tested public API**, not an
  implicit set of vars — safe for downstream font/density/brand overrides and
  Astro's no-JS path.
- Net dependency change is small (Radix packages already present; add
  `react-checkbox`, `-radio-group`, `-switch`, `-slider`, `-tooltip`,
  `-accordion`).
- **Staged rollout** (one issue per stream, each its own PR):
  - #59 Radix behavioral layer (6 controls)
  - #60 Variant contract + complete-states gate
  - #61 `HdsThemeProvider` + framework-agnostic theming contract
  - #62 Multi-brand overlays + runtime switch (`data-brand`)
  - #63 `pnpm hds:new` ingestion recipe
  - #64 Astro consumption: per-component exports + CSS-only layer + docs
- Supersedes nothing; refines ADR-001 (tenant → brand) and ADR-015
  (interaction states now Radix-backed).

## Phase 2 — two surfaces, one core (after core hardening)

Core is the invariant substrate (tokens, theming contract, accessible
primitives, tooling). On top of it sit **two skins that share that core**, and
the sequence is **harden the core first (#59–#64), then build the layers**:

1. **Product surface** — the current disciplined HDS look (Swiss-canon, single
   weight, no arbitrary values). Optimised for consistency and reuse across
   app/product UI.
2. **Expression surface** (#66) — a sibling for art-directed / marketing sites
   (the Aura reference tier): looser type presets, a section/pattern kit, and
   motion presets. It sits *beside* the product library, not inside its canon —
   the rules that make Core great for product deliberately forbid the
   expressive moves, so expression is a separate surface, never an override of
   Core.

### Harvest pipeline — cannibalise one-shots into reusable assets

Expressive one-shots are built fast in an AI site builder (Aura), then their
**design intelligence is harvested, not their code**. Aura emits a Google
`design.md` (YAML front matter of colours / typography / rounded / spacing /
components). `scripts/harvest-design-md.mjs` (the inverse of
`build-design-md.mjs`) distils that into a candidate `tenants/<slug>/tokens.json`
brand overlay + a `HARVEST.md` rationale capture. Governed by the **rule of
three**: first sighting → reference only; recurs ~3× → graduate into the
expression layer. Every harvested site leaves three durable artifacts — a brand
overlay, 0–N section recipes, any graduated component — and *that stack is the
compounding library*. First ~5 sites pay in; reuse compounds after. (#67)

### Niche demo reskins — the overlay system's first payoff

The multi-brand overlay's killer application is **outreach**: hold
hirobius.io's content fixed and ship per-niche reskins (realtor, insurance,
tradesman/concrete) as `data-brand` overlays, so a prospect is sent "their kind
of site" without building theirs. Each niche is one overlay + a URL/deploy
variant; each is simultaneously a sales asset and a reusable brand preset —
dogfooding the runtime brand switch (#62). (#68)
