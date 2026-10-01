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

The fix the message offers is the t-shirt scale token,
`hds.semantic.space.scale.*` (`var(--semantic-space-scale-*)`). When `Box`'s
`sx` has a shorthand for the same CSS property, it also offers that shorthand
with a step: `margin`/`padding` and their `Top`/`Right`/`Bottom`/`Left` forms
map to `m`/`p` and `mt`, `mb`, `pt`, ..., and `gap`, `rowGap`, `columnGap` keep
their names. Write `sx={{ mb: 'md' }}`: `sx` resolves step names on its
shorthand keys only, so a long-hand key with a step passes it through as
invalid CSS and renders no spacing. Logical props (`paddingInline`,
`marginBlockStart`, ...) have no `sx` shorthand (`px`/`py`/`mx`/`my` set
physical sides), so for them the message offers the token only.

```tsx
// ❌ error
<div style={{ marginBottom: '12px' }} />
<div style={{ gap: 24 }} />
<div style={{ paddingInline: '8px' }} />

// ✅ ok — a scale token, another token reference, or zero (a reset has no scale to violate)
<div style={{ marginBottom: hds.semantic.space.scale.sm }} />
<div style={{ paddingInline: 'var(--semantic-space-scale-xs)' }} />
<div style={{ marginBottom: hds.space.px16 }} />
<div style={{ margin: 0 }} />

// ✅ ok — the sx shorthand with a t-shirt step
<Box sx={{ mb: 'sm', gap: 'md' }} />
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
hatch specifically because it forces spacing/color through HDS tokens.
The spacing props (`p`, `m`, `gap` and their `t`/`r`/`b`/`l`/`x`/`y`,
`rowGap`, `columnGap` forms) take the t-shirt scale by name:
`'xs' | 'sm' | 'md' | 'lg' | 'xl'` (hds#206). That is 8/16/24/32/48px at
comfortable density; `data-density="compact"` tightens each step. This rule
flags only values that prove the author reached past the token system. A px
string on a spacing prop is pointed at a step; on any other key
(`width`, `top`, `padding`), where a step name is not valid CSS, it is pointed
at a token: an `hds.space.*` value or a `var(--...)`. The rule does **not**
flag bare numbers, which still resolve off the 4px scale, but a number reads
as pixels when it is not (`p: 4` is 16px), so use the names.

```tsx
// ❌ error — use a color token key ('content.primary', 'accent')
<Box sx={{ color: '#fff' }} />

// ❌ error — use a t-shirt step
<Box sx={{ m: '16px' }} />

// ❌ error — use a token (hds.space.*, var(--...))
<Box sx={{ width: '200px' }} />

// ✅ ok — spacing by t-shirt step; other strings are token keys/vars
<Box sx={{ m: 'sm', gap: 'md' }} />
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
