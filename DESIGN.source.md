<!--
  DESIGN.source.md — the human-maintained source of DESIGN.md.
  `scripts/build-design-md.mjs` fills the auto-marker blocks from
  `hirobius.tokens.json` and `public/hds-manifest.json` and writes DESIGN.md;
  never edit DESIGN.md by hand. Hand-edit narrative (Overview, Elevation,
  Corner-Radius Policy prose, Do's and Don'ts) here. Token tables are
  auto-derived; do not put values here.

  Scope: the shared Hirobius Design System core, intentionally
  product-agnostic. Product-specific personality belongs in a per-product
  overlay.
-->

# DESIGN.md

A machine- and human-readable specification of the Hirobius Design System for AI agents, design tools, and humans generating or reviewing UI. Values are sourced from `hirobius.tokens.json`; narrative rules are hand-authored. For the full tokens reference see `DESIGN-HANDOFF.md`.

## Overview

Hirobius is a clean, structured visual language that bridges digital precision and physical fabrication through a high-contrast near-monochrome neutral palette tinted toward midnight (OKLCH hue 262) and a single accent that each direction or brand sets (ADR-035) — a midnight graphite by default. Its personality is disciplined, tactile, and quietly technical: structure is explicit, motion is purposeful, and visual noise is stripped away. Whitespace is treated as material, not leftover space, so every screen should feel deliberate, breathable, and exact.

## Colors

<!-- auto:start:colors -->
<!-- auto:end:colors -->

## Typography

<!-- auto:start:typography -->
<!-- auto:end:typography -->

**Never for.** Each role has one job; reaching past it is how the ramp drifts.

- `display`: never for a section heading, a card or anything twice on a page. It is the hero line only.
- `title`: never for body copy or a label, and never skip a level to make a heading smaller; use `titleSm` for a heading inside a card or band.
- `titleSm`: never for page-level headings, and never for emphasis inside prose (bold the words instead).
- `body`: never for controls, table cells or metadata (those are `ui` and `caption`). A lead paragraph is `body` plus a quieter colour, not a bigger size.
- `ui`: never for long prose, and never for a heading. It is the size of things you act on or scan.
- `caption`: never for the only copy a user needs to act on, never uppercase, and never below the `caption` size to fit more in.
- `mono`: never for ordinary emphasis or for whole paragraphs. Code, ids and metric readouts only.

**Casing.** Never transform text to uppercase; sentence case for all UI text, including eyebrows, pre-titles, labels, captions and table headers. Raw content keeps its own case (an acronym, a user's string). No `text-transform: uppercase`, Tailwind `uppercase`, `textCase: UPPER` or `.toUpperCase()` for display; `scripts/check-no-uppercase.mjs` fails the commit. Tracking never exists to support caps.

**Meta lines.** A bullet-separated line holds at most two text items ("Acme Cloud · Remote"), because long translated strings wrap mid-line. More facts get one row each. Use `MetaLine` (`items` is a one- or two-item tuple, a third is a type error); `hds/max-two-meta-items` flags hand-rolled `A · B · C` chains.

## Spacing

<!-- auto:start:spacing -->
<!-- auto:end:spacing -->

**Spacing rules of thumb** (2026-10, raised with the type ramp so padding, gaps and line height stay in rhythm):

- **Inner padding ≤ outer gap.** A surface's padding is never larger than the gap around it: a 28px card sits in a grid gap of 28px or more, never 20px.
- **Nested surfaces step down one level.** A surface inside a surface takes the next smaller step (surface.padding → `sm` → `xs`), or `padding="none"`.
- **Never mix two paddings on sibling cards.** Cards in one row or list share one padding step.
- **Semantic tokens only.** Components and consumers use `semantic.space.*` (or the `xs…xl` keys); never a `primitive.space.*` step, a numeric Tailwind class or raw px. `hds/no-primitive-spacing` (in `hds/recommended`) and `check-tailwind-spacing-scale --ratchet` (pretest) fail on them.

## Layout contract (v1)

Approved 2026-10-07 as the **target**; adoption is in progress, so some components below (Container, Sidebar, Switcher) still ship until they fold in. Data: `docs/guardrails/layout-contract.json`; gates: `pnpm check:layout-contract` (warn mode; baseline in `docs/audits/layout-contract-baseline.md`) and `check-tailwind-spacing-scale --ratchet` (pretest; per-file baseline in `scripts/tailwind-spacing-scale.baseline.json`).

1. **Sizing.** Every component declares `fill` or `hug` on each axis. Leaves hug. Input, Textarea, Select, Combobox, Table, Progress and Divider fill width. One override prop, `width="hug|fill"`, on every component. Height always hugs; stretching is the parent's job (`align="stretch"`). No component sets `h-full`, `height: 100%` or `self-*` on its root.
2. **Padding.** Only containers pad: Card, Surface, Alert, Callout, Dialog, Page. Compound parts (`Card.Header`, `Body`, `Footer`, `Metric`) have zero padding and the container's `gap` spaces them. Padding is `none | sm | md`, default `md`, density-aware. A padded container directly inside a padded container is an error unless the inner one is `padding="none"`.
3. **Spacing.** One scale, `xs…xl` (plus `none`), for every `gap` and `padding` prop. Every gap defaults to `md`. No outer margins on any component; space between siblings is the parent's `gap`.
4. **Primitives.** Stack, Grid, Page (absorbs Container) and Surface compose layouts. Box and Pin are escape hatches. Sidebar and Switcher fold into Stack and Grid.
5. **Forms.** A form control in a form context has a max width (`40rem` by default) and siblings share one width.

## Corner-Radius Policy

Shape is one lever. `semantic.radius.action` is the system's single shape value — interactive controls (buttons, inputs, badges, alerts, segmented items) all resolve to it, and Tailwind's `rounded-md` maps to it exactly so the utility and the token cannot disagree. Containers sit one step above at `rounded-lg` (`action + 4px`, and square when `role.radius` is 0); `rounded-sm` (`action - 2px`) is for chrome nested inside a control. `full` is reserved for pills and circular forms, and `0px` only for intentional outer canvas or substrate boundaries, never everyday UI controls. Reshaping the whole system means overriding `role.radius` in one tenant overlay — that is how `brutalist-demo` goes square in a single value.

<!-- auto:start:radius -->
<!-- auto:end:radius -->

## Elevation

Depth is communicated through 4 elevation roles bundled by `semantic.elevation.*`. Each role bundles a surface, shadow, and border so primitives can't mismatch them.

### Elevation roles

| Surface                                   | Role token                    | Background         | Shadow            | Border                                                          |
| ----------------------------------------- | ----------------------------- | ------------------ | ----------------- | --------------------------------------------------------------- |
| Card / panel resting                      | `semantic.elevation.flat`     | `surface.page`     | none              | none by default; opt-in 1px (`bordered`/`tone`/`accent`)        |
| Card / panel lifted (interactive only)    | `semantic.elevation.raised`   | `surface.raised`   | `shadow.subtle`   | none                                                            |
| Tooltip                                   | `semantic.elevation.floating` | `surface.inverse`  | `shadow.floating` | none                                                            |
| Menu / popover / listbox / toast / dialog | `semantic.elevation.overlay`  | `surface.floating` | `shadow.overlay`  | `border.default` 1px: the edge over `surface.muted` and in dark |

Cards default to `flat`. They lift to `raised` only on interactive hover or when explicitly elevated above siblings. Never combine `raised` with a border — depth is one mechanism (border OR shadow), not both stacked. The default `Card` variant is **borderless** (12d-3 outline rule: repeated outlined cards crowd a layout, so the edge is not the default) — a resting 1px border is **opt-in** via `bordered`, a feedback `tone`, or the `accent` variant (`border.default` / feedback color / `border.accent` respectively). Rely on whitespace, dividers, and rails for grouping; reach for `bordered` only for a genuinely discrete standalone object.

### Soft surfaces (ADR-064, hds#891)

Separate by **tone and space, not outlines**. Containers (Card, panels, Dialog, Menu, Popover, Select, Toast, CodeBlock, the Table frame, the Tabs list, the SegmentedControl track, Tag pills and chips) have no resting border: they sit on a surface step (`surface.page` → `raised` → `muted`/`overlay`). Borders stay only where they carry meaning: inputs, focus rings, selected or active states, feedback tones and the accent highlight, dividers inside dense tables, Divider and the Kbd edge. Controls are soft filled: the secondary Button is `surface.soft` with no border, and primary and secondary Buttons carry the **hard shadow** (zero blur, straight down on a fixed base: rest 3px, hover lifts 1px onto 4px, press sinks 2px onto 1px, so the bottom of the edge never moves; its colour is the button's own fill stepped darker in both themes, hds#897 and C2) and the directional **wipe** hover by default; opt out per button with `shadow="none"` / `hoverEffect="none"`. Kbd follows the same light source (2px). Each edge is precomputed as `--hds-edge-*` (override per component with `--hds-btn-edge` / `--hds-kbd-edge`); `semantic.color.shadow.hard` stays exported but is no longer the default.

Overlays (Dialog, AlertDialog, Menu, Popover, Select, Tooltip) portal into the nearest `data-hds` scope, so they inherit its theme (for example `<div data-hds data-theme="dark">`); pass `container` on the Content part to override.

## Motion

<!-- auto:start:motion -->
<!-- auto:end:motion -->

## Components

<!-- auto:start:components -->
<!-- auto:end:components -->

A tag input is a creatable Combobox (`<Combobox multiple creatable>`): chips inline in the field, suggestions as you type, Enter adds the typed value. Do not build a second chip-input component.

When a component or pattern needs visual inspiration, look at [21st.dev](https://21st.dev) first; it is inspiration only, so take ideas, never code (its gradients, glow and glass break the rules above), and HDS tokens and rules always win.

### Touch size (hds#750)

On a coarse pointer (any phone or tablet) or a viewport under 640px, small controls lift to `semantic.size.touchTarget` (`--semantic-size-touchTarget`, 44px): sm Button (icon-only sm in both axes), Tabs trigger, SegmentedControl option, Tag and its dismiss X, Disclosure trigger, Input clear, Combobox chips, Checkbox/Radio/Toggle rows and Pagination. It is on by default, with no prop; a fine pointer on a wide viewport keeps desktop density. A custom control opts in with the `hds-touch-row` class (height) or `hds-touch-target` (height and width). Hosts can delete their own touch-size overrides. `pnpm check:docs-touch-targets` measures the docs demos on a 390px phone and a 1024px touch tablet.

In the same query, text fields set their text at 16px (`--primitive-typography-size-base`) so iOS Safari does not zoom the page into a focused field: Input sm and md, Textarea, TokenField and the Combobox and CommandPalette search fields carry the `hds-touch-text` hook (Input lg is 18px already). A custom text field opts in with the same class. While Input's clear button shows, the end padding is 44px at every size, so typed text never runs under the grown button (hds#863).

### Card Anatomy (mandatory — all properties non-negotiable)

Every HDS card surface must conform to this anatomy exactly. No creative interpretation is permitted on any of these properties.

| Property                 | Required value                                                                                                                                                                            | Forbidden                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Background               | `var(--semantic-color-surface-raised)`                                                                                                                                                    | Any gradient, tinted fill, or custom color                                                  |
| Border                   | Default variant: **borderless**. Opt-in (`bordered`/`tone`/`accent`): 1px solid the matching token (`border.default` / feedback color / `border.accent`). Never border + shadow together. | `box-shadow` as an elevation substitute; a border on the default variant (use `bordered`)   |
| Border radius            | `rounded-lg` (`role.radius` + 4 px: 12 px by default, follows the direction or brand)                                                                                                     | `var(--component-card-radius)`, `rounded-full`, or any hard-coded value                     |
| Padding                  | `var(--semantic-space-surface-padding)` or `<HdsSurface padding="component">`                                                                                                             | Raw pixel values or ad hoc insets                                                           |
| Shadow                   | Resting cards: none (`elevation.flat`). Interactive lifted state: `shadow.subtle` via `elevation.raised`                                                                                  | Raw `box-shadow` values, `drop-shadow`, glow, or any depth effect not bound to a role token |
| Title                    | `hds.typeStyles.title` / `<Text variant="title">`                                                                                                                                         | Any other type style for the primary card heading                                           |
| Subtitle / meta          | `<Text variant="caption" tone="secondary">` (`hds.typeStyles.caption` + `semantic.color.content.secondary`)                                                                               | Primary content color or body size for secondary text                                       |
| Hover (interactive only) | `transform: scale(1.02)`                                                                                                                                                                  | Background fill change, border color shift, or opacity fade on hover                        |

An entity card (a job, a lead, a listing) fills four zones in this order: `Card.Source` (an `Avatar` size `sm`, the source name, a `Timestamp`), `Card.Header` with the `Card.Title`, `Card.Facts` (a wrapping caption row of 16px decorative icons with a text label each, rendered as a list), and the actions in `Card.Footer`. Facts are icon + text only; term and description pairs stay in `MetadataList`, and a text-only line stays in `MetaLine`. Status goes in the header `metadata` slot, never in the facts row.

**No cards within cards, ever (hds#1046).** A `Card` or section surface (`Surface`, `Callout`, or any raised or bordered wrapper) never contains another `Card` or surface. This covers the **section surface wrapping a card list**: a "Review new" section drawn as a card holding a list of job cards is wrong. Declare the group with type hierarchy instead (a section title, a count, surrounding metadata) on a plain region, and separate list items with spacing or dividers. `hds/no-nested-cards` (in `hds/recommended`) fails on it; list your own wrappers that draw a card or a surface in its `cards` / `surfaces` options.

Never use on any card surface: gradient backgrounds, glow effects, frosted glass (`backdrop-filter: blur`), decorative overlays, gradient borders, colored or tinted backgrounds, inner shadows, patterned fills, shimmer or noise effects.

## Screen Patterns

Five patterns sit above the primitives so that every screen is composed the same way. Import them from `@hirobius/design-system/patterns`.

### Page title rule

Every screen has exactly one `PageHeader`. The page title is `title` (28px), a fixed size with no size prop; `level` changes only the DOM heading element. `display` is reserved for marketing and landing surfaces and is never a screen title. Breadcrumb goes in the `breadcrumb` slot, facts (source, stage) as a `Badge` row in `metadata` above the title, the one state `Badge` in `status`, screen-level actions in `actions`.

### Which one, when

Pick by what the thing is. The first four rows are for a headline number or a state; the rest are for containers and sections.

| Component            | Use it for                                                                    | Use instead                                                                  |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `MetricTiles`        | The default for any row of headline numbers on a screen. One fixed tile size. | Nothing: start here.                                                         |
| `Stat`               | An inline number inside prose or a dense list.                                | `MetricTiles` when the number stands alone in a row of its own.              |
| `Card.Metric`        | A metric inside an existing `Card` only.                                      | `MetricTiles` when there is no enclosing `Card`.                             |
| `Card.Row`           | State with notes and a trailing badge, never a number (was `StatusTile`).     | `MetricTiles` when the tile is a number; a status row never carries a value. |
| `Card`               | A titled or interactive content object (header, body, footer, `selectable`).  | `Surface` when there is no title and nothing to press.                       |
| `Surface`            | A plain padded background around content that has no header of its own.       | `Card` when the content is titled or interactive.                            |
| `DestructiveSection` | The one irreversible action on a screen, with an explanation and a confirm.   | `FormActions` `destructive` slot for a delete beside a form's own buttons.   |
| `DataTableSection`   | A titled table with a toolbar, row actions and an empty state.                | `Table` alone when there is no heading, toolbar or empty state to show.      |

Three more needs are props on an existing component, not components of their own. A card people pick from a set is a `Card` with `selectable`, `selected` and `onSelectedChange`, announced as a checkbox. A wrapping row of equal tiles that are not headline numbers is a `Grid` with `layout="auto-fill"` and `minItemWidth`. A count beside a heading is a count `Badge`: `count`, `max` for a `99+` cap and a `label` such as "12 roles", in a `Stack direction="row" gap="xs"` with the heading. A state shown only as a colored marker, with no notes, is a `Badge` with `dot` and a `label` that names the state. An account button is an `Avatar` as the `iconLeft` of a `tertiary` `iconOnly` `Button` (`rounded-full`): initials when signed in, `fallback="icon"` when signed out, and `status="warning"` with a `statusLabel` while unsynced; the Button `label` names the account and its status. Never a hand-drawn icon in a bordered box. A rail that selects in place (master-detail, no routing) is `NavList` with `onSelect` and `selected` on each `NavList.Item`, a button marked `aria-current="true"`; a rail that routes keeps `href` and `current`. The two are exclusive. A second control on a rail row (a posting link, a row menu) is the item's `action`: it renders beside the row's link or button, never inside it. A button whose hover fill should slide in from the edge the pointer enters is a `Button` with `hoverEffect="wipe"` (opt-in, hover-capable pointers only, instant under reduced motion); never hand-roll a hover overlay. The `Kbd` key edge is `--semantic-shadow-key`, a 2px drop in `border.strong`; by default it is the same straight-down hard shadow as the Button (`0 2px 0`, colour `--hds-kbd-edge`, default its own fill stepped darker, `--hds-edge-kbd`).

`Card` and `Surface` share one container radius, `rounded-lg` (`role.radius` + 4 px: 12 px by default, 0 under `brutalist-demo`). Dialogs and alert dialogs use it too. Never read `--component-card-radius` for a container; it ignores the direction or brand.

`MetricTiles` has `min(tiles, 4)` columns, so a row never leaves an empty column, and every tile has one fixed min-height with the value in `title`, the label in `caption` and the sub line in `caption`. Its tone comes from the fixed feedback vocabulary: `neutral | success | warning | danger | info`.

A pager for one item at a time ("‹ 1 of 4 ›") is `Pagination` with `variant="compact"`; the default variant is for pages of a long result set.

### Destructive and table sections

`DestructiveSection` is a titled danger zone with one danger `Button` that opens an `AlertDialog`; it never runs the action from the button itself, only from the dialog's confirm. Put it last on the screen, below the form. `DataTableSection` puts a `Table` under a heading and a toolbar slot. Row actions are consumer nodes in a trailing column, an empty `rows` array shows an `EmptyState`, and the table scrolls horizontally inside the section on narrow widths, so a caller never sets `minWidth`.

### Form actions rule

`FormActions` puts the primary submit last in DOM order and right-most, with the secondary or cancel action immediately to its left. A destructive action goes on the far left, apart from the other two, and never to the right of the primary. The row is not sticky unless `sticky` is set.

An expandable list row (one-line preview, actions beside the trigger) is `Disclosure variant="row"`; do not build one from `Card.Row` plus custom state.

## Do's and Don'ts

- Don't invent new corner behavior for interactive controls; buttons, inputs, disclosures, and similar action surfaces should follow the shared action radius (`semantic.radius.action`).
- Don't introduce additional accent hues; Hirobius uses exactly one accent, resolved from `semantic.accent.rest`, over a near-monochrome, midnight-tinted neutral system. The accent is a knob each direction or brand sets (ADR-035) and defaults to a midnight graphite (`data-accent="cobalt"` swaps in cobalt) — read the token, never assume a hue.
- Don't add other tints to the neutrals; the only one is the faint midnight lean (OKLCH hue 262, hds#755), and greys stay high-contrast.
- Don't reach for shadow values directly — bind to a `semantic.elevation.*` role so surface + shadow + border stay paired.
- Don't transform text to uppercase anywhere; sentence case, per the Casing rule above.
- Don't paint status dots or coloured left accent bars on cards and tiles; status is implied by content. Don't put a heading over a card of supporting meta (a "Status" heading far from its "Applied" badge); keep label and value together.
- Don't hardcode colors, spacing, radius, or typography values when governed tokens already exist.
- Don't crowd the canvas; if a layout feels compressed, remove complexity before removing breathing room.
- Don't outline a container to group it; use a surface step or space (soft surfaces, ADR-064). Don't default repeated groups to outlined cards; prefer open bands, section dividers, accent rails, tabs, disclosures, and whitespace. Cards are for genuinely discrete repeated objects, not the primary layout language.
- Don't sticker badges onto the ends of prose lines. Status and progress should live in a predictable metadata slot, rail, header zone, table column, or progress surface; badges are reserved for compact state markers where their placement is intentional.
- Don't add decorative illustration, ornamental icons, or trend-driven filler that lacks functional or structural purpose.
- Don't ship motion that ignores `prefers-reduced-motion`. Spring or expressive motion and a small press transform (such as a `whileTap` scale) are welcome where they add delight; under reduced motion, drop the transform and keep the color and state change.
- Don't define a global disabled-state rule (opacity multiplier, saturation ramp, etc.); disabled presentation is governed per-component through its dedicated disabled tokens.

## Open Questions

Unresolved rules that the live repo cannot yet answer confidently are tracked as GitHub issues. Do not invent rules here to fill those gaps.

<!-- auto:start:build-meta -->
<!-- auto:end:build-meta -->
