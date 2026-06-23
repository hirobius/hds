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
| `tokens.native.js` | nested ESM object | **resolved to raw values** | React Native (no CSS-var support) |

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

**Deferred (phase 2):**
- **Composites** — `typography`, `motion`, `transition`, `elevation`, `shadow`
  (one token → many vars; need the expanders in `build-tokens.mjs`).
- **Modes** — the `[data-theme="dark"]` block (Style Dictionary has no native
  "modes" concept; needs a custom format reading `$extensions…modes.Dark`).
- **Tenant overlays** — `[data-tenant="…"]` from `tenants/*/tokens.json`.
- **React Native colors** — resolved values are emitted as-is, so OKLCH strings
  pass through unchanged. RN cannot parse `oklch()`; a colour-space transform
  (OKLCH → hex/rgb) is required before the native target is production-ready.

These are the same gaps catalogued in `scripts/poc/style-dictionary-poc/README.md`,
now with the scalar layer fully productionised and parity-gated.
