# The variant contract

Every HDS component primitive that exposes visual variance (structural shape,
semantic intent, size, or density) authors it through
[`class-variance-authority`](https://cva.style/docs) (`cva`) against four
fixed axes. This is the contract enforced by `scripts/check-prop-vocabulary.mjs`
and rolled out incrementally across `src/app/components/*.tsx` (tracked via
`node scripts/check-prop-vocabulary.mjs --coverage`).

## Reference exemplar

`src/app/components/button.tsx` is the canonical example. Read it before
converting or authoring a new component. In short:

```ts
const xVariants = cva(base, {
  variants: { variant: {...}, tone: {...}, size: {...} },
  compoundVariants: [...],
  defaultVariants: { variant: 'secondary', tone: 'neutral', size: 'md' },
});

type XVariantProps = VariantProps<typeof xVariants>;

export interface XProps extends Omit<React.HTMLAttributes<...>, ...>, XVariantProps {
  // component-specific props
}
```

## The four axes

| Axis      | Meaning                                                                                                               | Vocabulary                                                                                                                                            | Required?                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `variant` | Structural shape — the component's own concept of visual treatment (e.g. `primary`/`secondary`/`tertiary` on Button). | Component-specific; naming is free, but the axis must be named `variant`.                                                                             | Only when the component has more than one structural treatment.                              |
| `tone`    | Semantic intent — color/feedback meaning layered on top of (or instead of) `variant`.                                 | **Fixed set:** `neutral \| danger \| success \| warning \| info`. Default `neutral`. **Never `error`** — the destructive/red tone is always `danger`. | Only when the component carries semantic/feedback meaning.                                   |
| `size`    | Physical scale.                                                                                                       | **Fixed set:** `sm \| md \| lg`. **Never `default`/`compact`** as size values.                                                                        | Only when the component has more than one size.                                              |
| `density` | Context density — how tightly packed the component reads in a dense vs. spacious layout.                              | **Fixed set:** `comfortable \| compact`.                                                                                                              | Only when the component's layout genuinely varies by surrounding density (e.g. a table row). |

A component does not need all four axes — `StatusDot` and `Spinner` (already
converted, see `src/app/components/status-dot.tsx` and `spinner.tsx`) only
need a subset. What the contract forbids is **inventing a new vocabulary for
an axis that already has one** — e.g. spelling the destructive tone `error`,
or sizing a control `default`/`compact` instead of `sm`/`md`/`lg`.

## State matrix

Interactive components express the full `rest · hover · active · focus ·
disabled` state matrix as Tailwind pseudo-class utilities directly inside the
`cva` template strings — never as a separate runtime state machine driving
inline styles. `button.tsx`'s base string is the pattern to copy:

```
hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring
disabled:pointer-events-none disabled:opacity-50 active:brightness-95
```

Non-interactive display primitives (`StatusDot`, `Badge`) have no interactive
states and only need the `rest` styling — that's expected, not a gap.

## Tokens only

Every class string resolves to a token — a Tailwind semantic utility
(`bg-primary`, `text-feedback-danger`, `border-input`) or, where no semantic
Tailwind utility exists yet, an arbitrary-value class bound to a CSS custom
property (`bg-[var(--semantic-color-surface-raised)]`) with an
`eslint-disable-next-line tailwindcss/no-arbitrary-value` comment explaining
why. Raw hex codes and raw pixel values are never acceptable in a `cva`
string.

## The `// vocab-ok:` escape hatch

`scripts/check-prop-vocabulary.mjs` scans every top-level file in
`src/app/components/` for `tone`/`variant`/`size`/`density` prop and type-alias
declarations and flags values outside the fixed vocabularies above. If a
component's use of a value is genuinely intentional and out of the gate's
scope — a domain status enum that happens to be named similarly, or
pre-existing drift not yet in scope for the current rollout batch — add
`// vocab-ok: <reason>` anywhere in the file to exempt it. Don't reach for
this to silence a real violation; it's for documented, deliberate exceptions.

## Rollout status

This contract landed with #60 Phase 1: the gate (rules A–D below) plus a
6-component reference batch (`tag`, `divider`, `stat`, `field`, `avatar-group`,
`circular-progress`). The remaining primitives convert in later phases — see
`node scripts/check-prop-vocabulary.mjs --coverage` for the live count of
`cva(`-adopting components vs. the total, and the tracking issue for the
phase breakdown.

## Gate rules (`scripts/check-prop-vocabulary.mjs`)

- **A** — `tone`/`variant` values: never `'error'` (use `'danger'`).
- **B** — `size` values: never `'default'`/`'compact'` (use `sm | md | lg`).
- **C** — `tone` values: must be drawn from `neutral | danger | success | warning | info`.
- **D** — `density` values: must be drawn from `comfortable | compact`.

All four are high-signal, low-false-positive regex checks scoped to
`src/app/components/*.{ts,tsx}` — they are not a TypeScript-level guarantee,
just a fast net for the most common drift. `// vocab-ok: <reason>` exempts a
whole file when a rule's false positive (or a deliberate, out-of-scope
exception) needs to be documented rather than fixed.
