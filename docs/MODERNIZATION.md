# Modernization / drift findings

Where HDS has drifted into legacy shapes or strayed from current design-system
practice. From a read-only audit, **independently verified** (file:line checked,
counts re-run). Severity reflects real impact, not theory.

> Health (audit's read): token architecture 8/10 · component consistency 7/10 ·
> styling discipline 7/10 · a11y 8/10 · dark mode 7/10 · docs 9/10 · tooling 6/10.

## ⚠️ Correction to the audit's headline

The audit framed CVA+Tailwind (Button, Dialog) as the "blessed path" and the
inline `hds.*` token-bridge style objects (Badge, Alert, Table, Surface…) as
outliers to migrate. **The counts are the reverse:** `46` components use the
inline `hds` bridge, only `2` use `cva()`. So the bridge **is** the established
architecture; CVA is the minority. "Standardize on Tailwind+CVA" is therefore a
**full-library rewrite (~46 components)**, not a tidy-up of a few — a real
architectural decision, not a cleanup. Pick the convergence direction
deliberately.

## Findings (verified, ranked)

### HIGH — shadow tokens are hardcoded rgba, not token-backed
- `src/styles/theme.css:209-214` — `--hds-shadow-{sm,md,lg,card}` are literal
  `rgba()` multi-layer strings, self-labeled *"no token backing. Legacy aliases
  only."* Dark overrides hand-rolled at `:284-287`.
- `src/app/components/surface.tsx:71` — shadow inlined directly in the component:
  `boxShadow: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.05)'` — bypasses
  the token layer entirely.
- The system **already has** `semantic.elevation.*` tokens and `build-tokens.mjs`
  has `shadowToCSS`/`expandElevation` — so the fix is wiring, not new machinery:
  back `--hds-shadow-*` + Surface with elevation tokens.
- *Modern norm:* Spectrum/Carbon/Primer generate shadows from an elevation
  primitive; DTCG has a first-class `shadow` type.

### MEDIUM — dark mode lives in a Figma vendor extension
- Dark values sit only in `$extensions["com.figma.variables"].modes.Dark` in
  `hirobius.tokens.json`, not DTCG `$modes` / theme files. Works (the build reads
  it), but couples the token source to a Figma format and complicates non-Figma
  consumption. *= roadmap C6.*

### MEDIUM — legacy `--hds-*` alias block
- `theme.css:155-224` — `--hds-accent-*`, `--hds-color-brand`, `--hds-feedback-*`,
  ecommerce `--hds-price-*` / `--hds-badge-*`, raw `--hds-accent-50..900` aliasing
  primitives. Self-labeled *"legacy."* Adds an indirection layer over the 4-tier
  tokens. Removal needs a consumer audit (which components still read `--hds-*`).

### MEDIUM — runtime-computed magic colors
- `badge.tsx:75` — `isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'`
  (4% overlay, `// audit-ok` comment) — a magic number that should be a
  `component/badge/tone-neutral` token. Pattern recurs in Surface.

### MEDIUM — validator-pipeline sprawl
- `package.json` — ~150 scripts, 61 `check:*`, and **4 dormant validator groups**
  (`_comment:*` keys) including high-value a11y (`check:focus`) disabled for
  pre-commit speed, with no integration plan. *Modern norm:* tiered lanes —
  fast pre-commit, full CI, expensive nightly.

### LOW
- `button.tsx:72` — `@deprecated isDark?` prop accepted but discarded (remove v0.6).
- `tabs.tsx`/`table.tsx` — no `forwardRef` wrapper (acceptable; Radix-delegated).
- `button.tsx:17` — arbitrary `transition-[colors,filter]` (reasonable escape hatch).

## Top priorities (recommended order)

1. **Shadow tokens** (HIGH, ~½ day, mostly node-only) — back `--hds-shadow-*` +
   Surface with `semantic.elevation`/a new `primitive.shadow`. Highest integrity
   win; machinery already exists. → **WS-K1**
2. **Tier the validator pipeline** (MED, DX) — fast pre-commit / full CI /
   nightly; re-enable the dormant a11y checks in CI. → **WS-K2**
3. **Decide the styling convergence direction** (MED, architectural) — bridge
   (46) vs CVA (2). Don't migrate piecemeal until chosen. → **WS-K3**
4. **Dark mode → DTCG `$modes`** (MED, portability) — = C6. → **WS-K4**
5. **Retire the `--hds-*` legacy aliases** (LOW-MED, cleanup, needs consumer
   audit + build). → **WS-K5**
