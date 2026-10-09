<!-- GENERATED FILE — DO NOT EDIT. Source: DESIGN.source.md. Regenerate with `pnpm tokens`. -->

# DESIGN.md

A machine- and human-readable specification of the Hirobius Design System for AI agents, design tools, and humans generating or reviewing UI. Values are sourced from `hirobius.tokens.json`; narrative rules are hand-authored. For the full tokens reference see `DESIGN-HANDOFF.md`.

## Overview

Hirobius is a clean, systems-first visual language that bridges digital precision and physical fabrication through a high-contrast monochromatic palette and a single accent that each tenant sets — neutral by default (#208). Its personality is disciplined, tactile, and quietly technical: structure is explicit, motion is purposeful, and visual noise is stripped away. Whitespace is treated as material, not leftover space, so every screen should feel deliberate, breathable, and exact.

## Colors

<!-- auto:start:colors -->
**One accent — one neutral system.**

- **Accent** (`#111111`): CTAs, active states, selected focus rings, and the single brand accent. `semantic.accent.rest` — a per-tenant knob, not a fixed hue (#208).
- **Neutral**: backgrounds, surfaces, borders, text. True monochromatic — `primitive.color.neutral.50` through `950`. Use `semantic.color.surface.*`, `semantic.color.content.*`, `semantic.color.border.*`; never reach directly for primitives in components.
- **Feedback — Error** (`#B91C1C`): destructive confirms, error banners, validation failures. `semantic.color.feedback.error`.
- **Feedback — Success** (`#047857`): positive confirmations, completed states. `semantic.color.feedback.success`.
- **Feedback — Warning** (`#92400E`): cautions, recoverable issues. `semantic.color.feedback.warning`.
- **Feedback — Info** (`#1E2EFD`): neutral announcements and inline guidance. `semantic.color.feedback.info`.

Feedback hues are never decorative; do not use them as accents. Light and dark mode values are defined per-token in `hirobius.tokens.json`.
<!-- auto:end:colors -->

## Typography

<!-- auto:start:typography -->
HDS ships three typefaces — each with a distinct and exclusive role:

- **Display / Heading font**: Satoshi. Bound exclusively to the `display` and `title` styles. Never used for body copy or UI labels.
- **Body / UI font**: Satoshi. All prose, labels, small text, captions, and UI copy.
- **Mono font**: IBM Plex Mono. Reserved for tokens, code, technical callouts, and metric readouts.

Weights declared: `400` regular, `500` medium, `700` bold. Heading styles (display · title) use `700` bold; body, UI, and caption use `400` regular / `500` medium.

### Type ramp

| Role | Size (desktop max) | Weight | Use |
| --- | --- | --- | --- |
| `semantic.typography.display` | 48px | 700 | One per page, hero only |
| `semantic.typography.title` | 24px | 700 | Section and card headings |
| `semantic.typography.body` | 16px | 400 | Prose |
| `semantic.typography.ui` | 14px | 500 | Controls, nav, table text, values |
| `semantic.typography.caption` | 12px | 500 | Metadata, help text and labels, in sentence case |
| `semantic.typography.mono` | 13px | 400 | Code and ids |
| `semantic.typography.h1` | 24px | 700 | deprecated: use semantic.typography.title |
| `semantic.typography.h2` | 24px | 700 | deprecated: use semantic.typography.title |
| `semantic.typography.h3` | 24px | 700 | deprecated: use semantic.typography.title |
| `semantic.typography.eyebrow` | 12px | 500 | deprecated: use semantic.typography.caption |
| `semantic.typography.lineHeight.none` |  |  | Semantic alias for leading-none (1) |

> The ramp is static: tokens store the value every surface renders. `h1`, `h2`, `h3` and `eyebrow` are deprecated aliases and go in 1.0.0.
<!-- auto:end:typography -->

## Spacing

<!-- auto:start:spacing -->
**Base unit: 4px.** All spacing snaps to the primitive scale; never introduce half-steps or arbitrary px values.

Scale: `0px` (`primitive.space.0`) · `1px` (`primitive.space.px1`) · `2px` (`primitive.space.px2`) · `4px` (`primitive.space.1`) · `6px` (`primitive.space.px6`) · `8px` (`primitive.space.2`) · `10px` (`primitive.space.px10`) · `12px` (`primitive.space.3`) · `16px` (`primitive.space.4`) · `20px` (`primitive.space.5`) · `24px` (`primitive.space.6`) · `28px` (`primitive.space.7`) · `32px` (`primitive.space.8`) · `40px` (`primitive.space.10`) · `48px` (`primitive.space.12`) · `64px` (`primitive.space.16`) · `80px` (`primitive.space.20`) · `96px` (`primitive.space.24`) · `128px` (`primitive.space.32`)

Layout rhythm, padding, and gaps use the `semantic.space.scale.{xs…xl}` steps (and `none`), never a raw `primitive.space.*` value or a numeric Tailwind class; `primitive.space.*` is the ramp behind the scale. Use `semantic.space.*` aliases (e.g. `semantic.space.surface.padding`) when the purpose is established. `data-density="compact"` (on `<html>` or the `[data-hds]` scope element) remaps `semantic.space.scale.*`, `semantic.space.surface.padding` and `semantic.space.region.gutter` one step down the scale, and `Table` follows it. The `--hds-space-{xs…4xl}` vars are a legacy bridge that no component reads.
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
| Tier | Value | Token | Applies to |
| --- | --- | --- | --- |
| Action | `8px` | `semantic.radius.action` | Buttons, inputs, badges, alerts, disclosures, segmented control items |
| Container | `12px` | `role.radius` + 4px (`rounded-lg`) | Cards, surfaces, segmented control surface, modal/sheet containers |
| Full | `9999px` | `primitive.radius.full` | Pills, avatars, indicator dots, any intentionally circular form |
| Zero | `0px` | `primitive.radius.0` | Outer canvas / substrate boundaries only — never on everyday UI controls |
<!-- auto:end:radius -->

## Elevation

Depth is communicated through 4 elevation roles bundled by `semantic.elevation.*`. Each role bundles a surface, shadow, and border so primitives can't mismatch them.

### Elevation roles

| Surface                                | Role token                    | Background        | Shadow            | Border                                                   |
| -------------------------------------- | ----------------------------- | ----------------- | ----------------- | -------------------------------------------------------- |
| Card / panel resting                   | `semantic.elevation.flat`     | `surface.page`    | none              | none by default; opt-in 1px (`bordered`/`tone`/`accent`) |
| Card / panel lifted (interactive only) | `semantic.elevation.raised`   | `surface.raised`  | `shadow.subtle`   | none                                                     |
| Popover / dropdown / tooltip           | `semantic.elevation.floating` | `surface.raised`  | `shadow.floating` | none                                                     |
| Dialog / sheet / modal                 | `semantic.elevation.overlay`  | `surface.overlay` | `shadow.overlay`  | none                                                     |

Cards default to `flat`. They lift to `raised` only on interactive hover or when explicitly elevated above siblings. Never combine `raised` with a border — depth is one mechanism (border OR shadow), not both stacked. The default `Card` variant is **borderless** (12d-3 outline rule: repeated outlined cards crowd a layout, so the edge is not the default) — a resting 1px border is **opt-in** via `bordered`, a feedback `tone`, or the `accent` variant (`border.default` / feedback color / `border.accent` respectively). Rely on whitespace, dividers, and rails for grouping; reach for `bordered` only for a genuinely discrete standalone object.

Overlays (Dialog, AlertDialog, Menu, Popover, Select, Tooltip) portal into the nearest `data-hds` scope, so they inherit its theme (for example `<div data-hds data-theme="dark">`); pass `container` on the Content part to override.

## Motion

<!-- auto:start:motion -->
Motion (lift on hover, parallax) is the interaction-affordance layer; static depth comes from the `semantic.elevation.*` role-token bundles.

### Duration tiers

| Tier | Value | When to use |
| --- | --- | --- |
| `primitive.duration.instant` | `100ms` | Immediate dismissals, binary toggles |
| `primitive.duration.short` | `150ms` | Productive micro-interactions (default for hover/focus/press) |
| `primitive.duration.medium` | `250ms` | Expressive entrances, teaching moments |
| `primitive.duration.long` | `400ms` | Spatial movement, page travel, parallax |

### Semantic intents

| Intent | Duration | Purpose |
| --- | --- | --- |
| `semantic.motion.productive` | `150ms` | For micro-interactions and status changes. No deformation. |
| `semantic.motion.expressive` | `250ms` | For teaching moments and significant UI entries. Includes physics-based squish. |
| `semantic.motion.spatial` | `400ms` | For elements traveling long distances across the viewport. |
| `semantic.motion.exit` | `100ms` | For elements being removed from the DOM. |

Default most interactive feedback to `productive` (150ms, decelerate). Reserve `expressive` (250ms, spring) for teaching moments where the motion itself carries meaning. `spatial` (400ms) is for travel, not decoration.

### Other semantic motion tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `semantic.motion.distance` | `24px` | Scroll-reveal translateY travel distance. Equals semantic.space.scale.md today, but names motion travel, not a spacing tier (hds#242). |
<!-- auto:end:motion -->

## Components

<!-- auto:start:components -->
| Component | Radius | States | Guidance |
| --- | --- | --- | --- |
| **Buttons** (`Button`) | `8px` (`semantic.radius.action`) | default · hover · focus · active · disabled · loading | Three variants: primary (accent-filled), secondary (outline), tertiary (ghost). Primary uses `semantic.accent.*` ramp per state. Pressed is a 5% `semantic.color.state.pressed.overlay` wash over the fill (`role.pressed-overlay`: black in light, white in dark), not a brightness filter. Icon-only buttons (`iconOnly`) follow the same token surface. Icon-only actions use `Button iconOnly` with a `label` and an `Icon` from `@hirobius/design-system/icons` in `iconLeft`. |
| **Inputs** (`Input`) | `8px` (`semantic.radius.action`) | default · focus · filled · error · disabled · loading | Border-driven treatment; no filled background by default. Focus uses `semantic.color.border.accent` plus a 2px outline offset. Error swaps to `component.input.borderError`. |
| **Cards** (`Card`) | `12px` (`rounded-lg`, role radius + 4px) | default · hover (optional parallax) · pressed (when interactive) | Cards default to `elevation.flat` (borderless by default; an opt-in 1px border via `bordered`/`tone`/`accent`, no shadow). Interactive cards lift to `elevation.raised` (shadow.subtle, no border) on hover. Bind via `semantic.elevation.{role}` — never raw box-shadow values. Radius: `rounded-lg` (role radius + 4 px, follows the tenant knob) — never a hard-coded value. Padding: `var(--semantic-space-surface-padding)`. Title: `heading3`. Meta: `caption` + `var(--semantic-color-content-secondary)`. Hover (interactive): `scale(1.02)` transform + lift to raised. Never: gradients, glow, frosted glass, tinted surfaces, decorative overlays, or inner shadows. |
| **Badges** (`Badge`) | `8px` (`primitive.radius.4`) | neutral · accent · feedback (error/success/warning/info) | Single-line status markers. Feedback colors come from `semantic.color.feedback.*`. Never used as decorative chrome. |
| **Alerts** (`Alert`) | `8px` (via `hds.borderRadius.4`) | info · success · warning · error | Inline banner pattern with icon + message + optional action. Tone is carried by a tinted feedback fill (`bg-feedback-bg-*`, matching Badge), NOT a left-border stripe. Callout shares this fill language and differs only by role (no icon, no status role, optional italic). |
| **Disclosures** (`Disclosure`) | `8px` (`hds.borderRadius.action`) | collapsed · expanded · hover · focus | Accordion primitive. Expansion uses `semantic.motion.productive`; no spring bounce. Dividers follow `semantic.color.border.subtle`. |
| **Toggles** (`Toggle`) | `full` (pill track + circular thumb) | off · on · focus · disabled | Accent-filled track in the on state; neutral track otherwise. Track + thumb transitions share `semantic.motion.productive`. |
| **Segmented Control** (`SegmentedControl`) | Outer `12px` · inner segments `8px` | rest · hover · selected · disabled | Selected segment fills with the accent; unselected segments are transparent. Use for 2–5 mutually exclusive options; beyond that, prefer `Select`. |

See `public/hds-manifest.json` and `src/app/data/component-api.json` for the full inventory and prop tables.
<!-- auto:end:components -->

### Card Anatomy (mandatory — all properties non-negotiable)

Every HDS card surface must conform to this anatomy exactly. No creative interpretation is permitted on any of these properties.

| Property                 | Required value                                                                                                                                                                            | Forbidden                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Background               | `var(--semantic-color-surface-raised)`                                                                                                                                                    | Any gradient, tinted fill, or custom color                                                  |
| Border                   | Default variant: **borderless**. Opt-in (`bordered`/`tone`/`accent`): 1px solid the matching token (`border.default` / feedback color / `border.accent`). Never border + shadow together. | `box-shadow` as an elevation substitute; a border on the default variant (use `bordered`)   |
| Border radius            | `rounded-lg` (`role.radius` + 4 px: 12 px by default, follows the tenant)                                                                                                                 | `var(--component-card-radius)`, `rounded-full`, or any hard-coded value                     |
| Padding                  | `var(--semantic-space-component-padding)` or `<HdsSurface padding="component">`                                                                                                           | Raw pixel values or ad hoc insets                                                           |
| Shadow                   | Resting cards: none (`elevation.flat`). Interactive lifted state: `shadow.subtle` via `elevation.raised`                                                                                  | Raw `box-shadow` values, `drop-shadow`, glow, or any depth effect not bound to a role token |
| Title                    | `hds.typeStyles.title` / `<Text variant="title">`                                                                                                                                         | Any other type style for the primary card heading                                           |
| Subtitle / meta          | `hds.typeStyles.caption` + `var(--semantic-color-content-secondary)`                                                                                                                      | Primary content color or body size for secondary text                                       |
| Hover (interactive only) | `transform: scale(1.02)`                                                                                                                                                                  | Background fill change, border color shift, or opacity fade on hover                        |

Never use on any card surface: gradient backgrounds, glow effects, frosted glass (`backdrop-filter: blur`), decorative overlays, gradient borders, colored or tinted backgrounds, inner shadows, patterned fills, shimmer or noise effects.

## Screen Patterns

Five patterns sit above the primitives so that every screen is composed the same way. Import them from `@hirobius/design-system/patterns`.

### Page title rule

Every screen has exactly one `PageHeader`. The page title is `title` (24px), a fixed size with no size prop; `level` changes only the DOM heading element. `display` is reserved for marketing and landing surfaces and is never a screen title. Breadcrumb goes in the `breadcrumb` slot, one status `Badge` in `status`, screen-level actions in `actions`.

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

`MetricTiles` has `min(tiles, 4)` columns, so a row never leaves an empty column, and every tile has one fixed min-height with the value in `title`, the label in `caption` and the sub line in `caption`. Its tone comes from the fixed feedback vocabulary: `neutral | success | warning | danger | info`.

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
---

> Generated from `hirobius.tokens.json` (389 tokens) and `public/hds-manifest.json` by `scripts/build-design-md.mjs`.
> Hand-edit `DESIGN.source.md`; this file (`DESIGN.md`) is overwritten by `pnpm tokens`.
<!-- auto:end:build-meta -->
