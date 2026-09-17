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

## Figma mapping

The Figma library mirrors the same axes. A Figma component property is only
valid if it binds to a prop the component really accepts, so design and code
cannot drift apart silently. The machine-readable record is the component's
manifest entry (`public/hds-manifest.json` → `componentSpecs.<Name>`: the
`variantAxes`, `componentProperties` and `figmaPropertyMapping` fields, seeded
in `scripts/build-tokens.mjs`). `scripts/check-figma-mapping.mjs`
(`pnpm check:figma-mapping`, also run by `pnpm test`) checks that record against
the source through the TypeScript checker, so a prop is real only if the
component's props type accepts it.

| Code                                                     | Figma property                                                                                                                          | Manifest record                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| cva contract axis (`variant`, `tone`, `size`, `density`) | `VARIANT` named in Title Case (`Variant`, `Tone`, `Size`, `Density`). Options are the cva keys verbatim (`sm`, `danger`, `inProgress`). | Listed in `variantAxes`. The `props` / `propConstraints` enum values equal the cva keys.                           |
| Interaction states (hover, focus, pressed)               | Figma-only `State` VARIANT. No prop.                                                                                                    | `state` in `variantAxes`. This is the only Figma-only axis allowed.                                                |
| String prop or `children`                                | `TEXT` in Title Case (`Label`, `Title`, `Body`)                                                                                         | `componentProperties[]` with `type: TEXT` and `sourceProp`.                                                        |
| Boolean prop                                             | `BOOLEAN`. A visibility toggle is named `Show …` and is true when the thing shows.                                                      | `type: BOOLEAN`. Negative props (`iconOnly`, `hideClose`) set `invert: true`.                                      |
| Optional content (`title?`)                              | A `Show …` BOOLEAN that controls the TEXT property                                                                                      | The TEXT property. The Code Connect template emits the prop only when shown.                                       |
| Icon slot (`iconLeft`, `iconRight`: `ReactNode`)         | `INSTANCE_SWAP` holding an Icon instance, plus a `Show …` BOOLEAN                                                                       | The template renders the swapped instance through its own template (`executeTemplate()`), never a hardcoded glyph. |
| Compound part (`Dialog.Title`, `Dialog.Content`)         | A property on the composite component                                                                                                   | `sourceProp` and `figmaPropertyMapping` keys use `Part.prop` (`Title.children`, `Content.hideClose`).              |

Rules the gate enforces (errors fail the check):

- Every `variantAxes` entry except `state` is a real prop.
- Every contract axis that is both a prop and a cva axis is listed in
  `variantAxes`, and its manifest enum values equal the cva keys.
- Every `sourceProp` and `figmaPropertyMapping` key resolves to a prop or to a
  `Part.prop` of a compound member.
- A prop has one Figma name: `componentProperties` and `figmaPropertyMapping`
  agree.
- `invert: true` only appears on a BOOLEAN named `Show …`. A `Hide …` property
  combined with `invert` contradicts itself.
- A component that has a Code Connect template (`figma/code-connect.json`) maps
  the same contract axes as its manifest entry.
- For a templated component, the manifest and the registry do not contradict
  each other: every Figma property name the manifest records
  (`componentProperties`, `figmaPropertyMapping`) is a registry property of the
  same type, and a prop the registry binds maps to the same property or to the
  `Show …` toggle that gates it. The registry is the record with evidence (the
  hds#73 inventory), so a manifest name it does not define fails.

**Title Case is the target, not yet the rule.** Some Figma names in the hds#73
inventory predate this contract (`Show icon`, `Show trail icon`, `Show close`),
so the gate warns instead of failing on them. That inventory comes from an AI
audit and is not yet verified against the live file. To fix one, rename it in
Figma first and then mirror the new name in the registry and the manifest.
Figma property lookups are case-sensitive, so renaming only one side breaks
the mapping.

**Legacy option names** (options that are not the cva keys, e.g. Button
`Variant: Primary / Secondary / Tertiary`) are mapped explicitly in the Code
Connect registry (`figma/code-connect.json`, `values`). Renaming the Figma
options to the cva keys removes that mapping.

### Open decisions (from the hds#73 audit)

Adrian decides these. Each has a proposed default so the mapping can move
forward:

| Decision               | Evidence                                                                     | Proposed default                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Button default variant | Figma defaults to `Primary`; code defaults to `secondary`                    | Keep code `secondary`, because changing a default breaks consumers. Set the Figma component-set default to `Secondary`. |
| Toast text property    | Figma `Message` vs code `description`; code has a `neutral` tone Figma lacks | Rename the Figma property to `Description` and add a `neutral` Tone option in Figma.                                    |
| "Button Tonal" set     | A separate Figma set vs the code's single Button with a `tone` axis          | Fold it into Button's `Tone` VARIANT and retire the separate set.                                                       |

### Code Connect templates

Code Connect templates are the files Figma uses to show code snippets in Dev
Mode, but only after `figma connect publish`, which needs an Organization plan.
Nothing is published, so **Dev Mode shows no HDS snippets today**. The
templates are v2 parserless files (`src/app/components/<module>.figma.ts`).
Nobody writes them by hand: `pnpm figma:connect:generate` builds them from
three inputs.

1. **`figma/code-connect.json`** records each Figma property (name, type,
   options) and how it maps onto the code. `prop` covers direct mappings;
   `values` renames legacy option names; `set` covers options that toggle
   other props (`State=Disabled` → `disabled`); `visibleWhen` ties a TEXT or
   INSTANCE_SWAP to its `Show …` toggle; `staticProps` supplies required props
   Figma has no property for (`onChange`); `figmaOnly` marks a property that
   has no code equivalent.
2. **The component source** supplies the props, which props are required,
   the cva keys and `defaultVariants`, all read through the TypeScript
   checker. A snippet leaves out any prop that equals its cva default.
3. **The node URL** comes from the component JSDoc tag `@figma <node-url>`,
   which flows through `public/hds-manifest.json` `figmaUrl`. A template
   without one gets a placeholder `// url=` with an `UNMAPPED` comment.

`pnpm figma:connect:check` (`scripts/check-code-connect.mjs`, also run by
`pnpm test`) needs no token or network and works on any Figma plan. It runs
`figma connect parse --exit-on-unreadable-files`, fails when a committed
template differs from the generator output, and requires every public cva
component (a `src/index.ts` export whose module calls `cva()`) to have a
template or an `exempt` entry with a reason. It then renders every VARIANT ×
BOOLEAN combination locally, so `getEnum` maps must cover every option and
land on cva keys, and every snippet must be valid JSX that passes only real
props. It lists unmapped templates on every run; `--strict` makes them fail.
`figma/code-connect-preview.txt` is the committed snapshot of those renders.

What this does **not** do: `figma connect preview` needs a
`FIGMA_ACCESS_TOKEN` and renders on Figma's servers, and
`figma connect publish` needs an Organization plan. Neither runs here. Until
publish, the honest claim is "templates generated from cva, parsed and
rendered in CI; publish pending Organization".

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
