<!--
  DESIGN.source.md — hand-authored template for DESIGN.md.

  This is the human-maintained source. `scripts/build-design-md.mjs` reads
  this file, fills the auto-marker blocks below from `hirobius.tokens.json`
  and `public/hds-manifest.json`, and writes the assembled result to DESIGN.md
  at the repo root.

  Hand-edit narrative (Overview, Elevation, Corner-Radius Policy prose,
  Do's and Don'ts) directly in this file. Never edit DESIGN.md by hand —
  it is generated. Token tables are auto-derived; do not put values here.

  Scope: this file describes the shared Hirobius Design System core. It is
  intentionally product-agnostic so multiple surfaces (portfolio, personal
  brand, future products) can consume it. Product-specific personality
  belongs in a per-product overlay when those surfaces come online.
-->

# DESIGN.md

A machine- and human-readable specification of the Hirobius Design System for AI agents, design tools, and humans generating or reviewing UI. Values are sourced from `hirobius.tokens.json`; narrative rules are hand-authored. For the full tokens reference see `DESIGN-HANDOFF.md`.

## Overview

Hirobius is a clean, systems-first visual language that bridges digital precision and physical fabrication through a high-contrast monochromatic palette and a single accent that each tenant sets — neutral by default (#208). Its personality is disciplined, tactile, and quietly technical: structure is explicit, motion is purposeful, and visual noise is stripped away. Whitespace is treated as material, not leftover space, so every screen should feel deliberate, breathable, and exact.

## Colors

<!-- auto:start:colors -->
<!-- auto:end:colors -->

## Typography

<!-- auto:start:typography -->
<!-- auto:end:typography -->

## Spacing

<!-- auto:start:spacing -->
<!-- auto:end:spacing -->

## Layout contract (v1)

Approved 2026-10-07. Data: `docs/guardrails/layout-contract.json`; gates: `pnpm check:layout-contract` and `pnpm check:spacing-scale` (warn mode; baseline in `docs/audits/layout-contract-baseline.md`).

1. **Sizing.** Every component declares `fill` or `hug` on each axis. Leaves hug. Input, Textarea, Select, Combobox, Table, Progress and Divider fill width. One override prop, `width="hug|fill"`, on every component. Height always hugs; stretching is the parent's job (`align="stretch"`). No component sets `h-full`, `height: 100%` or `self-*` on its root.
2. **Padding.** Only containers pad: Card, Surface, Alert, Callout, Dialog, Page. Compound parts (`Card.Header`, `Body`, `Footer`, `Metric`) have zero padding and the container's `gap` spaces them. Padding is `none | sm | md`, default `md`, density-aware. A padded container directly inside a padded container is an error unless the inner one is `padding="none"`.
3. **Spacing.** One scale, `xs…xl` (plus `none`), for every `gap` and `padding` prop. Every gap defaults to `md`. No outer margins on any component; space between siblings is the parent's `gap`.
4. **Primitives.** Stack, Grid, Page (absorbs Container) and Surface compose layouts. Box and Pin are escape hatches. Sidebar and Switcher fold into Stack and Grid.
5. **Forms.** A form control in a form context has a max width (`40rem` by default) and siblings share one width.

## Corner-Radius Policy

Shape is one knob. `semantic.radius.action` is the system's single shape value — interactive controls (buttons, inputs, badges, alerts, segmented items) all resolve to it, and Tailwind's `rounded-md` maps to it exactly so the utility and the token cannot disagree. Containers sit one step above at `rounded-lg` (`action + 4px`); `rounded-sm` (`action - 2px`) is for chrome nested inside a control. `full` is reserved for pills and circular forms, and `0px` only for intentional outer canvas or substrate boundaries, never everyday UI controls. Reshaping the whole system means overriding `role.radius` in one tenant overlay — that is how `brutalist-demo` goes square in a single value.

<!-- auto:start:radius -->
<!-- auto:end:radius -->

## Elevation

Depth is communicated through 4 elevation roles bundled by `semantic.elevation.*`. Each role bundles a surface, shadow, and border so primitives can't mismatch them.

### Elevation roles

| Surface                                | Role token                    | Background        | Shadow            | Border              |
| -------------------------------------- | ----------------------------- | ----------------- | ----------------- | ------------------- |
| Card / panel resting                   | `semantic.elevation.flat`     | `surface.page`    | none              | `border.subtle` 1px |
| Card / panel lifted (interactive only) | `semantic.elevation.raised`   | `surface.raised`  | `shadow.subtle`   | none                |
| Popover / dropdown / tooltip           | `semantic.elevation.floating` | `surface.raised`  | `shadow.floating` | none                |
| Dialog / sheet / modal                 | `semantic.elevation.overlay`  | `surface.overlay` | `shadow.overlay`  | none                |

Cards default to `flat`. They lift to `raised` only on interactive hover or when explicitly elevated above siblings. Never combine `raised` with a border — depth is one mechanism (border OR shadow), not both stacked.

Overlays (Dialog, AlertDialog, Menu, Popover, Select, Tooltip) portal into the nearest `data-hds` scope, so they inherit its theme (for example `<div data-hds data-theme="dark">`); pass `container` on the Content part to override.

## Motion

<!-- auto:start:motion -->
<!-- auto:end:motion -->

## Components

<!-- auto:start:components -->
<!-- auto:end:components -->

### Card Anatomy (mandatory — all properties non-negotiable)

Every HDS card surface must conform to this anatomy exactly. No creative interpretation is permitted on any of these properties.

| Property                 | Required value                                                                                           | Forbidden                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Background               | `var(--semantic-color-surface-raised)`                                                                   | Any gradient, tinted fill, or custom color                                                  |
| Border                   | `1px solid var(--semantic-color-border-default)`                                                         | `box-shadow` as an elevation substitute                                                     |
| Border radius            | `rounded-lg` (`role.radius` + 4 px: 12 px by default, follows the tenant)                                | `var(--component-card-radius)`, `rounded-full`, or any hard-coded value                     |
| Padding                  | `var(--semantic-space-component-padding)` or `<HdsSurface padding="component">`                          | Raw pixel values or ad hoc insets                                                           |
| Shadow                   | Resting cards: none (`elevation.flat`). Interactive lifted state: `shadow.subtle` via `elevation.raised` | Raw `box-shadow` values, `drop-shadow`, glow, or any depth effect not bound to a role token |
| Title                    | `hds.typeStyles.heading3` / `<HdsText variant="heading3">`                                               | Any other type style for the primary card heading                                           |
| Subtitle / meta          | `hds.typeStyles.caption` + `var(--semantic-color-content-secondary)`                                     | Primary content color or body size for secondary text                                       |
| Hover (interactive only) | `transform: scale(1.02)`                                                                                 | Background fill change, border color shift, or opacity fade on hover                        |

Never use on any card surface: gradient backgrounds, glow effects, frosted glass (`backdrop-filter: blur`), decorative overlays, gradient borders, colored or tinted backgrounds, inner shadows, patterned fills, shimmer or noise effects.

## Screen Patterns

Five patterns sit above the primitives so that every screen is composed the same way. Import them from `@hirobius/design-system/patterns`.

### Page title rule

Every screen has exactly one `PageHeader`. The page title is `heading2` (30px), a fixed size with no size prop; `level` changes only the DOM heading element. `display` and `h1` are reserved for marketing and landing surfaces and are never a screen title. Breadcrumb goes in the `breadcrumb` slot, one status `Badge` in `status`, screen-level actions in `actions`.

### Which one, when

Pick by what the thing is. The first four rows are for a headline number or a state; the rest are for containers and sections.

| Component            | Use it for                                                                    | Use instead                                                                  |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `MetricTiles`        | The default for any row of headline numbers on a screen. One fixed tile size. | Nothing: start here.                                                         |
| `Stat`               | An inline number inside prose or a dense list.                                | `MetricTiles` when the number stands alone in a row of its own.              |
| `Card.Metric`        | A metric inside an existing `Card` only.                                      | `MetricTiles` when there is no enclosing `Card`.                             |
| `StatusTile`         | State with notes and a trailing badge, never a number.                        | `MetricTiles` when the tile is a number; `StatusTile` never carries a value. |
| `Card`               | A titled or interactive content object (header, body, footer, `selectable`).  | `Surface` when there is no title and nothing to press.                       |
| `Surface`            | A plain padded background around content that has no header of its own.       | `Card` when the content is titled or interactive.                            |
| `DestructiveSection` | The one irreversible action on a screen, with an explanation and a confirm.   | `FormActions` `destructive` slot for a delete beside a form's own buttons.   |
| `DataTableSection`   | A titled table with a toolbar, row actions and an empty state.                | `Table` alone when there is no heading, toolbar or empty state to show.      |

Three more needs are props on an existing component, not components of their own. A card people pick from a set is a `Card` with `selectable`, `selected` and `onSelectedChange`, announced as a checkbox. A wrapping row of equal tiles that are not headline numbers is a `Grid` with `layout="auto-fill"` and `minItemWidth`. A state shown only as a colored marker, with no notes, is a `Badge` with `dot` and a `label` that names the state.

`Card` and `Surface` share one container radius, `rounded-lg` (`role.radius` + 4 px: 12 px by default, 4 px under `brutalist-demo`). Dialogs and alert dialogs use it too. Never read `--component-card-radius` for a container; it ignores the tenant.

`MetricTiles` has `min(tiles, 4)` columns, so a row never leaves an empty column, and every tile has one fixed min-height with the value in `heading2`, the label as an eyebrow and the sub line in `caption`. Its tone comes from the fixed feedback vocabulary: `neutral | success | warning | danger | info`.

### Destructive and table sections

`DestructiveSection` is a titled danger zone with one danger `Button` that opens an `AlertDialog`; it never runs the action from the button itself, only from the dialog's confirm. Put it last on the screen, below the form. `DataTableSection` puts a `Table` under a heading and a toolbar slot. Row actions are consumer nodes in a trailing column, an empty `rows` array shows an `EmptyState`, and the table scrolls horizontally inside the section on narrow widths, so a caller never sets `minWidth`.

### Form actions rule

`FormActions` puts the primary submit last in DOM order and right-most, with the secondary or cancel action immediately to its left. A destructive action goes on the far left, apart from the other two, and never to the right of the primary. The row is not sticky unless `sticky` is set.

## Do's and Don'ts

- Don't invent new corner behavior for interactive controls; buttons, inputs, disclosures, and similar action surfaces should follow the shared action radius (`semantic.radius.action`).
- Don't introduce additional accent hues; Hirobius uses exactly one accent, resolved from `semantic.accent.rest`, over a true monochromatic neutral system. The accent is a per-tenant knob (#208) and defaults to neutral — read the token, never assume a hue.
- Don't tint neutrals warm or cool; greys should remain genuinely neutral and high-contrast.
- Don't reach for shadow values directly — bind to a `semantic.elevation.*` role so surface + shadow + border stay paired. Cards default to `flat` (border, no shadow). Popovers/tooltips/dropdowns use `floating`. Dialogs/sheets use `overlay`.
- Don't hardcode colors, spacing, radius, or typography values when governed tokens already exist.
- Don't crowd the canvas; if a layout feels compressed, remove complexity before removing breathing room.
- Don't default repeated roadmap, status, process, or overview groups to outlined cards; prefer open bands, section dividers, accent rails, tabs, disclosures, and whitespace. Cards are for genuinely discrete repeated objects, not the primary layout language.
- Don't sticker badges onto the ends of prose lines. Status and progress should live in a predictable metadata slot, rail, header zone, table column, or progress surface; badges are reserved for compact state markers where their placement is intentional.
- Don't add decorative illustration, ornamental icons, or trend-driven filler that lacks functional or structural purpose.
- Don't make motion playful or bouncy by default; movement should feel controlled, precise, and intentional, with expressive motion used sparingly and only when it teaches or clarifies.
- Don't add `whileTap` scale transforms for press feedback; use color, border, and state-contrast changes instead — transforms are reserved for spatial motion, not interaction acknowledgment.
- Don't define a global disabled-state rule (opacity multiplier, saturation ramp, etc.); disabled presentation is governed per-component through its dedicated disabled tokens.

## Open Questions

Unresolved rules that the live repo cannot yet answer confidently are tracked in [`OPEN_DS_QUESTIONS.md`](OPEN_DS_QUESTIONS.md). Do not invent rules here to fill those gaps.

<!-- auto:start:build-meta -->
<!-- auto:end:build-meta -->
