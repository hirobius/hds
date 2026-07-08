# @hirobius/eslint-plugin-hds

Consumer-facing ESLint plugin for apps built on `@hirobius/design-system`.
Flags raw hex/px layout and color values that bypass HDS tokens — the same
discipline `scripts/check-hardcoded-colors.mjs`, `scripts/check-hardcoded-spacing.mjs`,
and `scripts/check-layout-discipline.mjs` enforce inside this repo, shipped as
an installable plugin for downstream consumer apps (this repo's own source
is governed by those scripts directly, not by this plugin).

Flat config only (ESLint 9+).

## Packaging note

This package lives at `scripts/eslint-plugin-hds/` rather than a top-level
workspace package because the design-system repo is not currently a pnpm
workspace (no `pnpm-workspace.yaml`). Promoting it to a real publishable
package (`packages/eslint-plugin-hds/` with its own `pnpm-workspace.yaml`
entry and CI publish step) is a follow-up — tracked as a scope note on #98,
not done here to avoid an unrelated workspace-wide config change riding
along with a guardrail/lint-rules PR. Until then, consume it via git/path
dependency (see below) or copy `index.mjs` + `rules/` into your own repo.

## Install

Not yet published to npm (see packaging note above). Point at the repo directly:

```bash
pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hirobius-design-system#path:/scripts/eslint-plugin-hds"
# peer dependency:
pnpm add -D eslint
```

## Use

```js
// eslint.config.mjs
import hds from '@hirobius/eslint-plugin-hds';

export default [
  {
    files: ['**/*.{ts,tsx,jsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  ...hds.configs.recommended,
];
```

Or pick rules individually:

```js
import hds from '@hirobius/eslint-plugin-hds';

export default [
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: { hds },
    rules: {
      'hds/no-raw-hex': 'error',
      'hds/no-raw-px-spacing': 'error',
      'hds/sx-token-first': 'error',
      'hds/prefer-hds-layout-primitive': 'warn',
    },
  },
];
```

## Rules

| Rule                                                                 | Default | What it catches                                                                                       |
| -------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| [`hds/no-raw-hex`](#hdsno-raw-hex)                                   | error   | Raw hex colors (`#fff`, `#ff00aa`) in `style={{…}}` or `className`.                                   |
| [`hds/no-raw-px-spacing`](#hdsno-raw-px-spacing)                     | error   | Raw `'Npx'` strings or bare numbers on `margin`/`padding`/`gap` family props in `style={{…}}`.        |
| [`hds/prefer-hds-layout-primitive`](#hdsprefer-hds-layout-primitive) | warn    | Ad-hoc `display: 'flex' \| 'grid'` in `style={{…}}` where a named primitive (Stack/Grid) likely fits. |
| [`hds/sx-token-first`](#hdssx-token-first)                           | error   | Raw hex/px string values inside a `Box` `sx={{…}}` prop — `sx` must resolve through token keys.       |

### `hds/no-raw-hex`

```tsx
// ❌ error
<div style={{ color: '#fff' }} />
<div className="bg-[#ff0000]" />

// ✅ ok
<div style={{ color: 'var(--semantic-color-content-primary)' }} />
<Box sx={{ color: 'content.primary' }} />
```

### `hds/no-raw-px-spacing`

```tsx
// ❌ error
<div style={{ marginBottom: '12px' }} />
<div style={{ gap: 24 }} />

// ✅ ok — token reference, or zero (a reset has no scale to violate)
<div style={{ marginBottom: hds.space.px16 }} />
<div style={{ margin: 0 }} />
```

### `hds/prefer-hds-layout-primitive`

```tsx
// ⚠️ warn — consider a named primitive instead
<div style={{ display: 'flex', gap: 8 }} />

// ✅ preferred
<Stack gap="normal"><Child /></Stack>
```

Warning, not error — ad-hoc flex is sometimes the right call for a genuinely
one-off nested alignment; this nudges rather than blocks.

### `hds/sx-token-first`

`Box`'s `sx` prop (`src/app/components/box.tsx`) is the sanctioned escape
hatch specifically because it forces spacing/color through HDS tokens: bare
numbers are a _feature_ there (they resolve off the 4px space scale), so
this rule does **not** flag numeric literals — only values that prove the
author reached past the token system.

```tsx
// ❌ error
<Box sx={{ color: '#fff' }} />
<Box sx={{ m: '16px' }} />

// ✅ ok — bare numbers resolve off the scale; strings are token keys/vars
<Box sx={{ m: 2, gap: 4 }} />
<Box sx={{ color: 'content.primary', top: 'var(--primitive-space-2)' }} />
```

Responsive objects (`{ xs, sm, md, lg, xl }`) and `&`-selector nesting are
walked recursively.

## Testing

```bash
node --test scripts/eslint-plugin-hds/__tests__
```

Uses ESLint's built-in `RuleTester` (from the `eslint` peer dependency) under
Node's built-in test runner — no extra devDependencies. Run from the repo
root so `RuleTester` resolves against the root `node_modules/eslint`.

## Design notes

- AST-based (`JSXAttribute` / `ObjectExpression` traversal), not
  regex-over-source-text like this repo's internal `scripts/check-*.mjs`
  guardrails — a consumer's own ESLint config already supplies a JSX-aware
  parser, so exact node types are free here.
- Only flags values it can _prove_ are raw: string literals, zero-expression
  template literals, and numeric literals (incl. unary-minus). Computed
  values (identifiers, member expressions, interpolated templates,
  ternaries) are never flagged — false negatives are preferred over false
  positives in a rule that runs across arbitrary consumer code.
- Suppress a specific finding with a standard ESLint disable comment
  (`// eslint-disable-next-line hds/no-raw-hex`) — no custom exemption
  syntax; this plugin runs outside this repo's own guardrail-exemption
  conventions (`// spacing-ok:`, `// layout-ok:`, etc.), which are internal
  to this repo's own `scripts/check-*.mjs` gates.
