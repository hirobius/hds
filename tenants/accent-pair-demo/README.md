# Accent Pair Demo: Tenant Overlay

Demo-only exemplar of the planned accent pair in the North Star: **a primary
accent plus a supporting one**. HDS has one accent today, so this tenant has two
parts, and only one of them is a token:

| Part              | What                                            | How                                                                            |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Primary accent    | mauve (a dusty plum)                            | ordinary tenant overlay in `tokens.json`, the same mechanism as `accent-lilac` |
| Supporting accent | stone (sand and bronze), for secondary emphasis | CSS-variable overlay in `support-overlay.css`, **not a token**                 |

hds#628 decision 4: overlay first, no token change. Not a real client: no
deployment, no legal entity, no primary domain. Not a Figma Brand mode.

## Why mauve and stone

Both are existing primitive ramps, so nothing is added below the semantic tier.
They are the two chromatic ramps that are not a feedback colour (red, green, blue,
amber and violet already mean error, success, info, warning and in-progress), and
they differ in hue and weight enough to read as a pair: a deep plum for the one
primary action, a warm sand for what supports it.

## The primary accent (`tokens.json`)

Built like the base accent, a dark fill in light mode and a light fill in dark mode,
so the neutral `onAccent` text stays correct in both (no `onAccent` override).

| Token                                                                                         | Light       | Dark        |
| --------------------------------------------------------------------------------------------- | ----------- | ----------- |
| `semantic.accent.rest`, `surface.accent`, `content.accent`, `border.accent`, `accent.content` | `mauve.600` | `mauve.300` |
| `semantic.accent.hover`, `accent.contentHover`                                                | `mauve.700` | `mauve.200` |
| `semantic.accent.pressed`                                                                     | `mauve.800` | `mauve.100` |
| `semantic.accent.subtle`, `surface.accentSubtle`                                              | `mauve.50`  | `mauve.900` |

Text on the fill clears AA in both modes (`tests/primitive-contracts/tenant-contrast.contract.test.ts`).
The `role.*` entries (`primary`, `ring`, `accent`, `accent-foreground`) and the `component.*`
entries (Button `bg`, `bgHover` and the secondary hover and pressed colours, Tag's three active
colours, nav's two active colours) re-declare those aliases on the tenant element with the same
alias as base. Without them Button's fill and hover, the focus ring, an active Tag and the
active nav item stay on the default accent in light mode wherever `data-brand` is set below
`<html>`, which is where the explorations harness sets it (Gaps 4).

## The supporting accent (`support-overlay.css`)

Plain CSS beside the tokens: not generated and not in the package, so it is loaded next to the
package's CSS, after it:

- **In this repo** (the preview bench, a test): import it after the token CSS, as
  `preview/main.tsx` does: `import '../tenants/accent-pair-demo/support-overlay.css'`.
- **In an explorations harness run** (hds#628): a direction cannot load it itself. The harness
  copies only `src/` over the template, this file is outside the packed package, and a `.css`
  file in `src/` counts as custom CSS. The harness adds it to the page where it applies the
  tenant (for example `page.addStyleTag({ path })` next to setting `data-brand`).

Put `data-brand="accent-pair-demo"` and `data-theme` on the **same element** (`<html>` or one
wrapper): the dark rule is `[data-brand][data-theme="dark"]`, like every compiled tenant block.

| Variable                            | Light           | Dark        | Use                                                                 |
| ----------------------------------- | --------------- | ----------- | ------------------------------------------------------------------- |
| `--semantic-accent-support-rest`    | `stone.600`     | `stone.400` | fill of a supporting emphasis (tag, stage marker, highlighted stat) |
| `--semantic-accent-support-hover`   | `stone.700`     | `stone.450` | rest, one step stronger                                             |
| `--semantic-accent-support-pressed` | `stone.800`     | `stone.500` | rest, two steps stronger (a fill, not a text pairing)               |
| `--semantic-accent-support-subtle`  | `stone.100`     | `stone.950` | faint tint surface                                                  |
| `--semantic-accent-support-content` | `stone.700`     | `stone.400` | text and icons in the supporting colour                             |
| `--semantic-accent-support-on`      | `neutral.white` | `stone.950` | text and icons on a rest or hover fill                              |

Measured contrast, light / dark (enforced by `scripts/__tests__/explorations-demo-tenants.test.mjs`):
`on` on `rest` 4.7:1 / 6.7:1, `on` on `hover` 6.5:1 / 5.2:1, `content` on the page and on `subtle`
at least 5.6:1 in both, `rest` against the page at least 3:1 (it is a boundary, not text).

Read the variables with an inline style, for example
`style={{ backgroundColor: 'var(--semantic-accent-support-subtle)', color: 'var(--semantic-accent-support-content)' }}`.
A style object holding only `var(--...)` references passes the lint plugin and the harness's
violation scan (no raw hex, no px). Do not use an arbitrary-value class such as
`bg-[var(--semantic-accent-support-subtle)]`: a consumer app has no Tailwind build, so the class
compiles to nothing, and the harness counts it as a Tailwind utility.

### Promoting it to a token

The variable names are exactly what a token at `semantic.accent.support.*` would compile to
(`--semantic-accent-support-rest` and so on). If the pair is accepted, promotion is: add the
six leaves to `hirobius.tokens.json` with Light/Dark modes (a default that aliases a neutral
or graphite step, so the variable always resolves), move this tenant's values into `tokens.json`,
delete `support-overlay.css`. No consumer changes. That is a system change and needs Adrian's
accept; it is a gap-log proposal here, not built ahead.

## Gaps

1. **No supporting-accent token (token).** Needed: `semantic.accent.support.{rest, hover, pressed,
subtle, content, on}` with Light and Dark modes, base values that alias an existing neutral
   step so non-pair tenants resolve, and the tenant-override path that comes with a base path
   (R5: tenants override, they do not extend). Today the overlay works only because an undefined
   variable is simply unset.
2. **No component reads a supporting accent (component).** `Badge`, `Tag`, `Progress`, `Stat`
   and `SegmentedControl` have no tone or variant that maps to it, so the explorations apply it
   with arbitrary-value classes outside the typed API. Needs a `tone="support"` style prop where it
   earns its place.
3. **Sparse primitive ramps (primitive).** `stone` has eight steps and `amber` four; a real supporting
   accent probably wants its own full ramp, which is a primitive change, outside any tenant.
4. **Alias tokens are declared on `:root` (bug).** An override of `semantic.color.surface.accent`
   on a `[data-brand]` element below `<html>` does not reach `--role-primary`, `--role-ring` or
   `--component-button-bgHover` in light mode, so Button keeps the default accent. This tenant
   re-declares all 14 `role.*` and `component.*` aliases of what it overrides (a test checks none
   is missing); `accent-lilac` does not, and shows the default accent on its Buttons, Tags and nav
   in a nested light scope. The generator should re-anchor every alias of an overridden token, as
   it already does for `$deprecated` ones (hds#206).
5. **Brand and theme must share an element (limit).** The supporting dark values, like every
   compiled tenant dark block, need `data-brand` and `data-theme` on one element.

## Status

**`scaffold`**: demo-only. Do not deploy this tenant to a production domain.

## Reference

- North Star: `docs/ai/NORTH_STAR.md` (the planned accent pair). Exploration program: hds#628, decision 4.
- Format spec: `docs/architecture/tenant-token-overlay-format.md` (R1 tiers, R4 modes)
- Primary-accent exemplar: `tenants/accent-lilac/`
