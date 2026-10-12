# Soft Demo: Tenant Overlay

Demo-only overlay for hds#505, the "soft" visual direction: pill actions,
softer containers, grey-fill grouping instead of outlines, roomier surfaces.
Built as a tenant first, so the direction can be judged beside the default
without breaking a single consumer (the explorations program, hds#628, renders
it on real ops screens as direction B, "ceiling"). Not a real client: no
deployment, no legal entity, no primary domain. Not a Figma Brand mode.

## Brand intent

HDS today reads tight: an 8px action radius, 12px containers, 24px surface
padding. The reference (a native iOS collection app) is soft and spacious. This
overlay moves the knobs HDS already has and nothing else, so what it shows is how
far tokens alone go. The accent stays the default graphite on purpose
(hds#505: keep HDS identity, take the principles).

## What this overlay overrides

| Token path                                                                                                             | Default (HDS base)                         | Soft Demo                                                                | Why                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `semantic.radius.action`                                                                                               | `8px` (`primitive.radius.8`)               | `20px`                                                                   | Half of the 40px default control, so Button, Input and Select `md` are a full pill and `sm` (32px) clamps to one. Containers follow at +4 (24px), nested chrome at -2 (18px). |
| `role.radius`                                                                                                          | `semantic.radius.action` on `:root`        | `semantic.radius.action`, re-anchored on the tenant element              | `--role-radius` resolves where it is declared; re-declaring it on the `[data-brand]` element makes `rounded-md/lg/sm` follow the override at any scope, not just on `<html>`. |
| `semantic.color.surface.raised`                                                                                        | `neutral.50` light, `neutral.850` dark     | `neutral.100` light, `neutral.850` dark (unchanged)                      | A visible grey fill, so cards, tracks and tags group by fill with no border. Dark is already a fill.                                                                          |
| `role.card`                                                                                                            | `semantic.color.surface.raised` on `:root` | same, re-anchored on the tenant element                                  | Same reason as `role.radius`: `bg-card` and `.hds-card` read it.                                                                                                              |
| `role.secondary`, `component.card.bg`, `component.tag.background`, `component.button.radius`, `component.input.radius` | the same aliases on `:root`                | the same aliases, re-anchored on the tenant element                      | Same reason as `role.radius`: every alias of an overridden token follows it below `<html>` too (a test checks none is missing).                                               |
| `semantic.space.surface.padding`                                                                                       | `24px` (`scale.md`), `20px` compact        | `32px` (`scale.lg`), `20px` compact (`scale.md` under the compact remap) | Roomier surfaces; density stays an independent toggle layered on top (R9).                                                                                                    |

## hds#505 deltas, one by one

| Delta                                   | Status            | Where                                                                                                                                          |
| --------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Pill action radius                      | applied           | `semantic.radius.action` 20px: a full pill at the default control height                                                                       |
| Container radius ~16-20px               | partial: 24px     | derived as action + 4, so a pill action puts containers at 24px (Gaps 2)                                                                       |
| Borderless, grey-fill grouping          | applied           | `Card` is already borderless by default; the fill is now `neutral.100`. Inputs keep their border on purpose (Gaps 4)                           |
| Dividers for lists                      | already default   | `Divider` and `semantic.color.border.default`, untouched                                                                                       |
| Bigger type contrast                    | **gap**           | tenant typography overrides compile to nothing today (Gaps 1)                                                                                  |
| 44px minimum controls, 56px primary CTA | **gap**           | no token drives control height (Gaps 3)                                                                                                        |
| Pill stepper, FAB                       | **gap**           | no such components                                                                                                                             |
| Black-active segmented control          | already available | `SegmentedControl variant="primary"` fills the active segment with the accent (graphite)                                                       |
| Stat tile with a grey fill              | applied           | `Card` (`bg-card`) and `StatusTile` read the raised fill; `Stat`, `MetricTile` and `Card.Metric` are deprecated in favour of a composed `Card` |

## Gaps

What would need more than a token override, in the order the explorations should
hit them. None is built here; each is a proposal for the gap log.

1. **Type contrast cannot be set per tenant (bug).** `semantic.typography.*` are
   composite tokens and `docs/architecture/tenant-token-overlay-format.md` R6 says a
   tenant may override one whole. `buildTenantCSS` in `scripts/build-tokens.mjs`
   skips a composite unless its value is a string, so the override validates and
   then compiles to nothing, silently. Once it expands composites to
   `--semantic-typography-<role>-<prop>` the soft deltas are
   `display` -> `size.6xl`, `title` -> `size.3xl`, and `ui`/`caption` one step up. The
   ramp has no 15px or 17px (16 and 18 only), so "body 16 -> 17" also needs a primitive.
2. **Container radius is derived from the action radius (token).** `rounded-lg` is
   `role.radius + 4px`. A pill action and a 16-20px container cannot both hold; this
   overlay picks the pill. Needs `semantic.radius.container`, with `rounded-lg` bound to it.
3. **Control height is not a token the components read (component + token).** Button
   and Input use fixed `h-8` / `h-10` / `h-12` (32 / 40 / 48px). The
   `component.button.size.*.height` tokens exist but nothing reads them, and
   `primitive.size.interactive.min` (44px) only drives `.hds-touch-target`. There is no
   56px size at all. Needs the sizes to read tokens, plus a CTA size.
4. **Borderless input (decision).** The input border (`border.interactive`, 4.7:1) is
   what meets the non-text contrast minimum; a grey field with no border needs a fill that
   reaches 3:1 on the page, which the soft grey does not. Left bordered. Needs a decision
   and, if yes, a field-fill token.
5. **No pill stepper or FAB (component).** Not built ahead.
6. **Alias tokens are declared on `:root` (bug).** `--role-radius`, `--role-card`,
   `--component-card-bg` and the rest are `var(--semantic-...)` on `:root`, so an override
   of the semantic token on a `[data-brand]` element below `<html>` (where the explorations
   harness sets it) does not reach them in light mode. The dark block re-declares the colour
   aliases but not the radius ones, so `--component-button-radius` misses it in dark too.
   This overlay re-declares all seven aliases of what it overrides under `role` and
   `component`. The generator already re-anchors `$deprecated` aliases for the same reason
   (hds#206); it should do the same for every alias of an overridden token. `accent-lilac`
   has the same problem for Button's fill.

## How to see it

- Preview bench (`pnpm preview:build`, then `brand` -> soft): the readout shows button,
  input and card radius measured from the DOM, plus the `surface.raised` and `--role-card`
  variables read on the stage.
- `scripts/__tests__/explorations-demo-tenants.test.mjs` renders the real stylesheets in
  Chromium, default and both demo tenants side by side, and checks the values above.

## Status

**`scaffold`**: demo-only. Do not deploy this tenant to a production domain.

## Reference

- Direction and deltas: hds#505. Exploration program: hds#628.
- Format spec: `docs/architecture/tenant-token-overlay-format.md` (R6 composites, R9 density)
- Shape/density decision: `docs/adr/022-per-tenant-shape-density-axis.md`
