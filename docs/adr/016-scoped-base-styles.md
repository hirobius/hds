# ADR-016: Scope base styles to `[data-hds]` for non-HDS coexistence

**Status:** Accepted (2026-06-29)

## Context

`@hirobius/design-system/tokens.css` shipped a fully **global** style surface:
element resets, a page-level type baseline (`body { font-family … }`), heading
styles (`h1`–`h4`), a theme-change transition on `* , *::before, *::after`, and
Tailwind v4's preflight reset. That is exactly right for the standalone docs
site, which owns the entire document.

It is wrong for an **external consumer that owns only a section** of its page.
The first such consumer (the job-hunt apply board) runs MUI `<CssBaseline>` +
Emotion. Importing `tokens.css` there produced competing resets and
font-cascade fights: HDS set `body { font-family: Satoshi }`, MUI set its own
body font, and whichever stylesheet loaded last won — visibly breaking the
non-HDS surface. (P0.5 in the consumer-readiness backlog.)

CSS **custom properties** are not the problem: every token is namespaced
(`--primitive-*`, `--semantic-*`, `--hds-*`), so defining them on `:root` has no
visual effect on a host app. The problem is the opinionated **element/global
rules**.

## Decision

Scope the design system's authored base styles to a `[data-hds]` subtree.

- Every element/global rule in `theme.css`'s `@layer base` and the theme
  transition in `index.css` is wrapped in **`:where([data-hds])`**. `:where()`
  contributes **zero specificity**, so each rule keeps the exact weight it had
  as a bare element selector — no specificity drift, no override surprises.
- Token custom properties stay on `:root` (harmless; namespaced).
- The page-level baseline (`font-size`, `background`, `min-height`) stays on
  `:where([data-hds]) body` so the docs site's **rem base is unchanged** —
  putting `font-size` on the scope root (which is `<html>` for the docs site)
  would rebase every rem unit and shift all layouts. Only `font-family` and
  `color` are applied to the scope root, so a section-scoped consumer still
  inherits the HDS typeface without touching rem.
- The docs site marks `<html data-hds>` in `index.html` (also used as the
  prerender shell), so the whole page — including Radix portals that mount to
  `document.body` — stays in scope and renders identically.
- External consumers add `data-hds` to their app root, or to the wrapper of the
  section that hosts HDS.

## Rationale

- `:where([data-hds])` is the lowest-risk scoping primitive: opt-in, zero
  specificity, no `!important`, reversible.
- Keeping the body baseline on `body` (not the root) is the key correctness
  detail — it preserves the rem anchor and keeps the docs site pixel-identical.
- Portals resolve correctly because the docs scope sits on `<html>`, the
  ancestor of `document.body`.

## Consequences

- **Breaking for consumers without `data-hds`.** Any app importing `tokens.css`
  must now add `data-hds` to its root (or section) to receive the base styles.
  Documented in the README "Consuming HDS" section and shipped as a `minor`
  changeset with a migration note. The docs site is handled in-repo.
- **Deferred — not yet scoped (still global), pending visual verification:**
  1. **Tailwind v4 preflight** (`*,::before,::after { box-sizing; border:0;
     margin:0; padding:0 }`). Scoping it means importing the Tailwind layers
     without preflight (`@import "tailwindcss/theme.css" layer(theme);
     @import "tailwindcss/utilities.css" layer(utilities);`) and supplying a
     hand-authored preflight under `:where([data-hds])`. This needs a full
     visual regression pass against the docs site, which the current web
     sandbox cannot run (Playwright OOMs there), so it is held for a machine
     that can verify it.
  2. The mobile `html, body { overflow-x: hidden; max-width: 100vw }` rule —
     a minor page-level guard left global for the same reason.
- Section-scoped consumers (`data-hds` on a `div`, not `<html>`) will have
  HDS overlays that portal to `document.body` fall outside the scope. Until
  preflight scoping lands, the recommended placement is `data-hds` on a
  high-level wrapper (or `<html>`/`<body>`); documented for consumers.
