# ADR-064: Soft surfaces by default; hard shadow and wipe by default

**Status:** Accepted (2026-10-22, Adrian: hds#891 and hds#888).

## Context

HDS read as Geist/Vercel: hairline outlines on every container, outlined secondary buttons,
flat monochrome surfaces. Adrian (2026-10-22): soft surfaces become the default for
everything, and pair with the hard-shadow system picked in the Visuals Lab (hds#888, shipped
opt-in in #889). The soft-demo tenant (hds#505) was the earlier spike of the same direction.

## Decision

1. **Separate by tone and space, not outlines.** Cards, panels, overlays, code blocks, the
   table frame, tab lists, segmented-control tracks, tags and chips lose their resting border.
   They sit on a surface step (`page → raised → muted/overlay`) instead.
2. **Borders stay only where they carry meaning:** inputs, focus rings, selected or active
   states, feedback tones and the accent highlight, dividers inside dense tables, Divider,
   Timeline connectors and the Kbd key edge. `<Card bordered>` is the documented way back.
3. **Soft controls.** New `semantic.color.surface.soft` (neutral 200 / 700) and
   `surface.softHover` (300 / 600). The secondary Button is a soft fill with no border;
   tertiary stays a quiet ghost.
4. **Hard shadow and wipe are the Button default**, with opt-outs: `shadow="hard" | "none"`
   (new prop) and `hoverEffect="wipe" | "none"`. Primary and secondary only; never tertiary
   or a disabled button. Depth is the shadow offset alone, straight down with no x offset (`0 3px 0` rest, `0 5px 0`
   hover, `0 1px 0` press; Adrian, 2026-10-22, matching the Visuals Lab straight-down edge); the box
   never moves, so a press cannot slide off the pointer. Kbd follows the same light source by default
   (`0 2px 0`). Colour comes from one hook per component, `--hds-btn-edge` / `--hds-kbd-edge`,
   defaulting to `semantic.color.shadow.hard`, so a later colour model is a token change.
   **Amended 2026-10-22 (hds#896, Adrian's Visuals Lab pick "own colour, stepped")**: the hooks now
   default to each item's own fill stepped two OKLCH steps darker (L −0.12, C ×0.7225, same hue);
   in dark, an edge under 1.5:1 on page/raised/overlay/muted steps lighter instead until it
   clears 1.5:1. `scripts/lib/raised-edge.mjs` computes them at token build time as
   `--hds-edge-*`; `tests/raised-edge.test.ts` pins them. `shadow.hard` stays exported.
5. **The hard shadow is the soft button's 1.4.11 boundary** (superseded by the hds#896 amendment
   above: the own-colour edge trades the 3:1 boundary for a 1.5:1 floor in dark, and none in light), so `semantic.color.shadow.hard`
   in Dark moves from `neutral.600` (2.7:1 on black) to `neutral.500` (`border.interactive`,
   4.4:1 on page, 3.7:1 raised, 3.2:1 overlay). Light stays the shadow ink (12.8:1 or more).
6. **Spacing is unchanged.** `semantic.space.surface.padding` is already 28px at the default
   density (16px compact is opt-in); removing outlines is what opens the layout up. Light
   `surface.raised` stays `neutral.50`: moving it to `neutral.100` (the soft-demo value) drops
   `content.tertiary` on cards to 4.3:1, below AA.

## Consequences

- One minor release (0.31.0) with an upgrade note: how to opt out of the wipe and the hard
  shadow, how to get a Card border back, and the CSS variables whose values changed.
- `component.button.secondary.border.rest` and `.disabled` are deprecated (removed in 1.0);
  `.hover` stays live (tenants re-anchor it). Button no longer draws any of them.
- styles.css got smaller (22,000 → 21,860 B gzip) because dead tag and border CSS went with it.
- `tests/soft-surfaces-contrast.test.ts` pins the contrast; `button-soft-defaults.test.tsx`
  pins the defaults and opt-outs.

## Border audit (2026-10-22)

Every element that drew a border, outline or resting ring in `src/app/components`,
`src/styles`, the docs site and the component tokens. **37 removed, 64 kept.**

### Removed (replaced by surface or space)

| Where                        | Element                                                                      | Was                                     | Now                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| button.tsx                   | Secondary rest                                                               | `border border-input`                   | `surface.soft` fill + hard shadow                    |
| button.tsx                   | Secondary disabled                                                           | `secondary.border.disabled`             | neutral disabled fill only                           |
| dialog.tsx                   | Dialog surface                                                               | `border border-border`                  | `bg-popover` + `shadow-overlay`                      |
| alert-dialog.tsx             | AlertDialog surface                                                          | `border border-border`                  | `bg-popover` + `shadow-overlay`                      |
| menu.tsx                     | Menu content                                                                 | `border border-border`                  | `bg-popover` + `shadow-overlay`                      |
| popover.tsx                  | Popover content                                                              | `border border-border`                  | `bg-popover` + `shadow-overlay`                      |
| select.tsx                   | Listbox                                                                      | `border border-border`                  | `bg-popover` + `shadow-md`                           |
| toast.tsx                    | Toast                                                                        | `border border-border`                  | `bg-popover` + `shadow-overlay`                      |
| segmented-control.tsx        | Track                                                                        | `border-default`                        | `surface.muted` fill (transparent 1px keeps the box) |
| tag.tsx                      | Unselected pill                                                              | `component.tag.border` (border.default) | token = its own `surface.muted` fill                 |
| static.css                   | `.hds-tag` rest                                                              | `component.tag.border`                  | follows the token above                              |
| theme.css                    | `.hds-tag-btn` / `.hds-tag-pill`                                             | `border.default`                        | deleted (dead since #60)                             |
| code-block.tsx               | Block frame                                                                  | `border-default`                        | `surface.raised` fill                                |
| code-block.tsx               | Single-line frame                                                            | `border-default`                        | `surface.raised` fill                                |
| code-block.tsx               | Header rule                                                                  | `border-b`                              | `surface.muted` header band                          |
| code-block.tsx               | Collapsible panel rule                                                       | `border-t`                              | space                                                |
| table.tsx                    | Frame                                                                        | `border-default`                        | none (raised header + dividers carry it)             |
| tabs.tsx                     | List divider                                                                 | `border-b border-border/40`             | space (`mb-6`)                                       |
| combobox.tsx                 | Selected chip                                                                | `border border-border`                  | `bg-muted`                                           |
| combobox-creatable.tsx       | Selected chip                                                                | `border border-border`                  | `bg-muted`                                           |
| token-field.tsx              | Token chip                                                                   | `border-default`                        | `surface.muted`                                      |
| form-actions.tsx             | Sticky bar                                                                   | `border-t`                              | `bg-card` band + padding                             |
| board.tsx                    | Column header                                                                | `border-b`                              | space                                                |
| utilities.css                | `.border-stroke`, `.border-stroke-accent`, `--hds-border/fill/hover` helpers | unused, read undefined vars             | deleted                                              |
| docs globals.css             | `.hds-docs-table` frame                                                      | 1px `border.default`                    | `surface.raised`                                     |
| docs globals.css             | `.hds-fold` rows                                                             | top/bottom hairlines                    | raised row, spaced                                   |
| docs globals.css             | `.hds-swatch` card                                                           | 1px `border.subtle`                     | `surface.raised`, hover fill                         |
| docs globals.css             | `.hds-swatch-block`                                                          | bottom hairline                         | none                                                 |
| docs globals.css             | `.hds-specimens` / `.hds-specimen`                                           | hairline rows                           | space                                                |
| docs globals.css             | Motion step rows                                                             | bottom hairline                         | space                                                |
| docs globals.css             | `.hds-motion-replay`                                                         | 1px `border.default`                    | `surface.soft`                                       |
| component-demos.tsx          | `demoTile`                                                                   | 1px `border.default`                    | `surface.raised`                                     |
| component-demos.tsx          | `DemoFrame`                                                                  | 1px `border.default`                    | `surface.muted` canvas                               |
| principles-and-practices.tsx | `<Card bordered>`                                                            | border                                  | default soft Card                                    |
| tokens                       | `component.button.secondary.border.rest`                                     | drawn                                   | deprecated, not drawn                                |
| tokens                       | `component.button.secondary.border.disabled`                                 | drawn                                   | deprecated, not drawn                                |
| tokens                       | `component.tag.border`                                                       | `border.default`                        | `surface.muted` (= fill)                             |

**Amended 2026-10-22 (overlay edge, #893 review).** The six overlay rows above are reverted: Dialog,
AlertDialog, Menu, Popover, Select listbox and Toast draw the `border.default` hairline again, on a new
`surface.floating` fill (white light, `neutral.800` dark). Without it an overlay over `surface.muted` (Tags,
chips, the SegmentedControl track) had no edge: same fill (1.00:1), and a shadow cannot darken
near-black. `src/styles/__tests__/overlay-edge.test.ts` pins fill-or-hairline separation at 1.15:1 in
light (the soft shadow does the rest) and 1.5:1 in dark.

### Kept (the border carries meaning)

| Kind                           | Where                                                                                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inputs (9)                     | Input, Textarea, Select trigger, Combobox trigger and its in-popover search field, ComboboxCreatable field, TokenField field, Checkbox box, Radio circle, Switch track (`toggle.tsx`); `component.input.border`, `.borderError`                          |
| Focus (8)                      | `.hds-focus`, Checkbox, Radio, Switch and SegmentedControl outlines, every `focus-visible:ring`, docs focus outlines (4)                                                                                                                                 |
| Selected / active / hover (14) | Card `selectable` ring, Combobox and ComboboxCreatable active option, Menu and Select highlighted item, SegmentedControl active and hover inset edges (4), Tabs active underline, Tag selected / hover / pressed (cva + static.css), `.hds-swatch:hover` |
| Feedback and accent (8)        | Card tones (4) and `variant="accent"`, `.hds-card` tones and `--accent` (static.css), DestructiveSection confirm (explicit `border` width now)                                                                                                           |
| Opt-in containment (4)         | Card `bordered`, `.hds-card--bordered`, `component.card.border`, MetadataList `divided`                                                                                                                                                                  |
| Dense data and structure (12)  | Table header, row and column dividers (4), Divider and `.hds-divider--strong`, Menu separator, Timeline connector, Blockquote rail, docs token-table cells, ContainerDemo dashed bounds, Avatar status cut-out ring, Spinner arc                         |
| Kbd and demos (5)              | Kbd border (now `border.strong`) and key shadow, docs `.hds-token-swatch` edge, `.hds-radius-box`, elevation demo border level                                                                                                                           |
| Tokens and tooling (4)         | `component.button.secondary.border.hover` (re-anchored by tenants), `component.nav.borderActive`, `component.tag.activeBorder`, `xray.css` debug outline                                                                                                 |
