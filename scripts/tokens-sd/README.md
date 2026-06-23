# Style Dictionary multi-format token emitter

Graduates `scripts/poc/style-dictionary-poc/` into a **production, multi-target**
generator — RFC #3 Tier 1: *one source, many targets*. Emits the Hirobius token
**variable layer** from `hirobius.tokens.json` as CSS vars, SCSS, JS/ESM, JSON,
and React Native.

> **Parallel, not a replacement.** `scripts/build-tokens.mjs` remains the source
> of truth (`tokens.css`, the TS bridge, dark mode, tenant overlays, composite
> expansion). This emitter exists to prove and serve cross-stack consumption
> (e.g. the MUI / non-Tailwind adapter path) without re-platforming.

## Commands

```sh
node scripts/tokens-sd/build.mjs    # pnpm tokens:sd        → writes dist/
node scripts/tokens-sd/parity.mjs   # pnpm check:tokens-sd  → verifies parity
```

Outputs land in `scripts/tokens-sd/dist/` (gitignored):

| File | Format | Aliases | Use |
|---|---|---|---|
| `tokens.vars.css`  | `:root { --… }` | preserved as `var(--…)` | vanilla / any stack, **no Tailwind, no reset** |
| `tokens.vars.scss` | `$…: …;`        | preserved as `var(--…)` | Sass/SCSS consumers |
| `tokens.json`      | flat `{ "--name": value }` | preserved | tooling, codegen, docs |
| `tokens.js`        | nested ESM object | preserved (`var(--…)`) | JS-in-CSS (MUI `sx`, styled-components, vanilla-extract) |
| `tokens.native.js` | nested ESM object | **resolved sRGB hex + unitless numbers** | React Native (no CSS-var support) |
| `tokens.ios.swift` | `HDSColor`/`HDSMetric`/`HDSFont` enums | resolved `UIColor` + `CGFloat` | iOS / UIKit |
| `tokens.android.xml` | `<color>`/`<dimen>` resources | resolved `#RRGGBB` + `dp` | Android |
| `tokens.literal.css` | `:root { --… }` | **resolved sRGB hex** (light) | frameworks doing color math (no var refs) |
| `tokens.literal.js` | nested ESM object | **resolved sRGB hex** (light) | MUI/styled color math (`alpha()`) |

### Framework presets (C2 / C13)

`scripts/tokens-sd/presets/` ships two plain-object adapters (no `@mui` /
`tailwindcss` import — testable in isolation, validated by
`pnpm check:tokens-presets`):

- **`mui.mjs`** — `hdsMuiThemeOptions()` → MUI `ThemeOptions` from the **literal**
  tree (so `alpha()` works). Maps the shadcn-shaped `role` tier onto MUI
  `palette`/`shape`/`typography`. Light-mode only until C6.
- **`tailwind.mjs`** — `hdsTailwindPreset()` → Tailwind v3 preset using
  `var(--…)` refs, so it stays theme-aware (dark/tenant cascade re-skins
  utilities for free).

### Native targets (C4)

Native platforms can't parse `oklch()` or CSS vars, so the native targets emit
**resolved sRGB literals**: `scripts/tokens-sd/color.mjs` converts OKLCH →
sRGB (Björn Ottosson's matrices, dependency-free) and dimensions resolve to
unitless numbers (`px → CGFloat`/`dp`/RN number), durations to milliseconds.

- **Gamut clamping:** the vivid accent stops carry chroma ~0.29, beyond sRGB.
  Those colors are channel-clamped to sRGB and flagged with a `gamut-clamped
  from oklch` comment in the Swift/XML output. Clamping shifts hue/chroma
  slightly — a best-effort native approximation, not a colorimetric match.
- **Skipped (no native scalar form):** CSS-only dimensions (`clamp()`/`ch`/`vw`/
  `%`), motion easings (`cubicBezier`/`spring`), and bare HSL channel components.
  `parity.mjs` reports the skip counts and reasons.

## Parity guarantee

Token **values** are formatted by `build-tokens.mjs`'s canonical `valueToCSS`
(imported, never reimplemented), so every emitted value is byte-identical to
`tokens.css` for the covered subset. `parity.mjs` checks the CSS output **live**
against the real `src/styles/tokens.generated.css` — no frozen snapshot, so it
cannot bit-rot the way the POC's `expected.css` did (it silently fell behind
when the `stone` ramp was added).

```
SD-covered scalar vars  ⊆  tokens.generated.css :root   (values must match)
```

Current: **314 covered scalar vars** across all four tiers (primitive · semantic
· component · role), parity green.

## Scope

**Covered:** every scalar token — `color`, `dimension`, `number`, `fontWeight`,
`duration`, `fontFamily`, `cubicBezier`, `spring`. Semantic/component/role
aliases stay theme-aware (`var(--…)`); primitives resolve to raw values —
matching `build-tokens.mjs` exactly.

**Done — native color-space transform (C4):** RN/iOS/Android now emit resolved
sRGB literals (OKLCH → hex/`UIColor`, `px` → number/`dp`, durations → ms). See
*Native targets* above.

**Deferred (phase 2):**
- **Composites** — `typography`, `motion`, `transition`, `elevation`, `shadow`
  (one token → many vars; need the expanders in `build-tokens.mjs`).
- **Modes** — the `[data-theme="dark"]` block (Style Dictionary has no native
  "modes" concept; needs a custom format reading `$extensions…modes.Dark`). The
  native targets therefore emit **light-mode** values only for now.
- **Tenant overlays** — `[data-tenant="…"]` from `tenants/*/tokens.json`.
- **Gamut-aware native color** — out-of-sRGB stops are channel-clamped; a
  chroma-reduction (gamut-mapping) pass would preserve hue more faithfully.

These track the gaps catalogued in `scripts/poc/style-dictionary-poc/README.md`,
now with the scalar layer fully productionised (CSS/SCSS/JS/JSON) **and the
native targets (RN/iOS/Android) live**, all parity-gated.
