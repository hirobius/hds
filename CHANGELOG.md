# Changelog

## 0.12.0

### Minor Changes

- aba78d2: Promote three previously-internal components to the public API surface (#76):
  - **SideNav** (`Navigation`) — sidebar navigation row primitive (root/nested levels).
  - **CommandPalette** (`Overlays`) — Cmd-K / Ctrl-K fuzzy search over the HDS manifest.
  - **HdsLightbox** (`Overlays`, was internal `ImageLightbox`) — full-bleed image viewer on Radix Dialog.

  Each flips `@internal`→`@public`, drops `@doc-exempt`, moves from `utility`→`primitive` tier, and gains a Storybook story, a Code Connect stub, and a public barrel export. `ImageLightbox` is renamed to `HdsLightbox` to match the Radix-overlay naming convention.

  The vitest config now resolves the `virtual:hds-manifest` module (mirroring the app/lib builds) so manifest-consuming components like CommandPalette render under the story-render smoke gate.

- aba78d2: Add Tier-1 native primitives closing the Astryx coverage gap (#76), with zero new runtime dependencies:
  - **Kbd** — inline keyboard key / shortcut hint (`<kbd>`).
  - **StatusDot** — compact solid status indicator with semantic tones.
  - **Timestamp** — semantic `<time>` with date/time/datetime/relative formatting.
  - **Blockquote** — quoted passage with optional attribution.
  - **VisuallyHidden** — screen-reader-only content (`sr-only`), polymorphic `as`.
  - **AvatarGroup** — overlapping avatar cluster with a `+N` overflow chip.
  - **ButtonGroup** — attaches Button children into one segmented control.
  - **InputGroup** — text input framed with leading/trailing adornments.
  - **CircularProgress** — SVG progress ring (determinate + indeterminate).

  Each ships with tokens-only styling, colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture.

- aba78d2: Add Tier-1 Radix-skinned interactive/overlay primitives closing the Astryx coverage gap (#76). Each wraps a Radix primitive themed with the HDS overlay role tokens (matching Menu/Dialog/HdsTooltip), adding these `@radix-ui` dependencies:
  - **HdsToggleButton** (`@radix-ui/react-toggle`) — single two-state pressable button (`aria-pressed`).
  - **HdsAlertDialog** (`@radix-ui/react-alert-dialog`) — modal confirmation dialog for destructive actions; Dialog-matched skin, no dismiss-on-outside-click.
  - **HdsHoverCard** (`@radix-ui/react-hover-card`) — hover/focus preview card (not a substitute for an accessible tooltip).
  - **HdsContextMenu** (`@radix-ui/react-context-menu`) — right-click menu sharing Menu's exact SURFACE/ITEM token skin.
  - **HdsAspectRatio** (`@radix-ui/react-aspect-ratio`) — width:height ratio box that prevents media layout shift.

  Each ships colocated tests (Radix jsdom polyfills), a Storybook story (overlays render closed on mount), a Code Connect stub, and a Swiss-canon fixture.

- aba78d2: Add the Tier-2 pattern layer closing the Astryx coverage gap (#76) — 8 composite/pattern components, zero new runtime dependencies:
  - **MetadataList** (`Display`) — semantic `<dl>` of term/description pairs; the canonical metadata slot (horizontal/vertical).
  - **OverflowList** (`Layout`) — count-based list that collapses overflow into a `+N` chip (SSR/test-safe, not width-measured).
  - **TopNav** (`Navigation`) — top navigation bar with brand / links / trailing slots and optional sticky.
  - **AppShell** (`Layout`) — application scaffold with header, sidebar, and main regions (semantic `<header>`/`<aside>`/`<main>`).
  - **SelectableCard** (`Actions`) — card that behaves as a selectable option (`role="checkbox"`, full keyboard/ARIA).
  - **Tokenizer** (`Inputs`) — token/chip input composing `Tag`; Enter to add, Backspace to remove.
  - **FileInput** (`Inputs`) — styled file picker / dropzone over a real native `<input type="file">`, with drag-and-drop.
  - **HdsMultiSelector** (`Inputs`) — multi-select dropdown composing `Popover` + a checkbox option list (no new dep).

  Each ships colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture. The `virtual hds-manifest` size-limit budget was bumped 41→46 kB to accommodate the enlarged public component surface (justified in `.size-limit.cjs`).

- aba78d2: Complete the Tier-2 pattern layer (Astryx coverage, #76) with 4 more components:
  - **Toolbar** (`Actions`) — control group with roving focus on `@radix-ui/react-toolbar`; compound `Toolbar.Button` / `Separator` / `ToggleGroup` / `ToggleItem` / `Link`, skinned to match Menu.
  - **TreeList** (`Navigation`) — hierarchical expand/collapse list with correct `role="tree"` / `treeitem` / `group` ARIA (native, no dep).
  - **Stepper** (`Navigation`) — wizard/progress step indicator with complete/current/upcoming states (distinct from the existing `StepperField` number input).
  - **Carousel** (`Display`) — native CSS scroll-snap track with Prev/Next affordances (no carousel library).

  Adds one dependency: `@radix-ui/react-toolbar`. Each ships colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture.

  Also lands **ADR-020** (date/time components on react-day-picker v10 + date-fns) and installs those dependencies as groundwork for the Tier-3 date/time family — no Tier-3 components ship in this change yet.

- aba78d2: Add the Tier-3 date/time family, completing the Astryx coverage build (#76) per ADR-020 (react-day-picker v10 + date-fns):
  - **HdsCalendar** (`Inputs`, primitive) — HDS-token-skinned month calendar over `react-day-picker`; passes through `mode` (single/range/multiple), `selected`, `onSelect`, disabled/min/max, locale. The foundation the date inputs compose.
  - **HdsTimeInput** (`Inputs`, primitive) — token-skinned native `<input type="time">` (no calendar dependency).
  - **HdsDateInput** (`Inputs`, pattern) — single-date text field with a calendar Popover; date-fns parse/format.
  - **HdsDateRangeInput** (`Inputs`, pattern) — date-range trigger + range calendar Popover.
  - **HdsDateTimeInput** (`Inputs`, pattern) — combined date (calendar Popover) + time (`HdsTimeInput`) producing one `Date`.

  Each ships colocated tests (Radix Popover jsdom polyfills), a Storybook story, a Code Connect stub, and a Swiss-canon fixture. Dependencies `react-day-picker` and `date-fns` (added as ADR-020 groundwork) are now in use; they tree-shake out of consumer bundles that don't import a date component (verified by `smoke:consumer`, and the app `size-limit` main-entry budget is unchanged).

- f8f9e1f: Add `Box` — a polymorphic layout primitive with a token-first `sx` engine (#92), a deliberate subset of MUI's `sx`: spacing shorthands (`m`/`p`/`gap` family) resolve off the HDS 4px scale and named layout steps, `color`/`bgcolor`/`borderColor`/`fill`/`stroke` resolve dotted token keys to semantic CSS vars, responsive `{ xs, sm, md, lg, xl }` values compile to `min-width` media queries, and `&`-prefixed keys compose nested selectors. Resolves to a deterministic, hash-cached, SSR-safe injected CSS class (`src/app/components/box-sx.ts`).
- 0b3738f: Add the `@hirobius/design-system/brand` subpath (#64): a framework-free palette → HDS-semantic overlay bridge. `brandOverlayVars` / `brandOverlayStyle` / `brandOverlayCss` map a small brand palette (six colours + optional font/radius) onto the HDS semantic custom properties, so a downstream render target (a static Astro site, an SSR shell, an email) can theme itself from a brand palette while inheriting HDS's contrast-checked semantics, accent states, and radius. Interactive accent states are derived with CSS `color-mix()` — no colour-math dependency. Imports no React and no Node built-ins. This is the seam that lets the `hirobius/clients` Astro factory consume HDS instead of maintaining a parallel `--brand-*` token system.
- 6a4f0f6: CSS-in-JS → Tailwind (#60): migrate `ActivityFeed` to Tailwind + `cva`, formalizing the status axis as a `tone` variant (`activityToneVariants` / `activityAvatarVariants`). Typography composites (`heading3`/`body`/`ui`/`technical`) and the avatar/list resets move from inline `style` objects onto var()-bound Tailwind classes on the exact same `--semantic-*`/`--primitive-*` custom properties — no visual change.

  **Value rename (non-breaking):** `ActivityEvent`'s color axis now follows the HDS tone vocabulary (`neutral | danger | success | warning | info`) via a new optional `tone` prop, matching the fixed contract in `docs/architecture/variant-contract.md`. The old `status` prop (`ActivityStatus`, including `'error'`) is deprecated but still fully supported: `status="error"` resolves to the same `danger` tone as `tone="danger"` (proven by a byte-for-byte render-output test). New code should use `tone`; `status`/`ActivityStatus` will be removed in a future major.

- 254d9eb: Drop the `Hds` prefix from 12 net-new leaf component families — step 1 of retiring the `Hds` prefix fleet-wide. **Breaking rename shipped as a `minor` per the pre-1.0 semver-zero convention (0.x: breaking changes bump the minor)** — safe now because these families are new in this release cycle with only fresh, first-party consumers. These families shipped in 0.12.0/0.13.0 with zero external consumers, so the rename is safe to land as the first cut. Compound sub-exports (e.g. `HdsAlertDialog.Trigger`), `*Props`/`*Component` types, and source filenames (`hds-*.tsx` → `*.tsx`) all moved together. `scripts/scaffold-component.mjs` and `scripts/component-discovery.mjs` were flipped in the same PR: new components must now be plain PascalCase, and a leading `Hds` is the namespace violation going forward (not the absence of one).

  | Old                                                                                                                                                             | New                                       |
  | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
  | `HdsToggleButton`                                                                                                                                               | `ToggleButton`                            |
  | `HdsAlertDialog` (+ `.Trigger`/`.Portal`/`.Overlay`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`/`.Action`/`.Cancel`)                                 | `AlertDialog` (same compounds)            |
  | `HdsHoverCard` (+ `.Trigger`/`.Content`)                                                                                                                        | `HoverCard` (same compounds)              |
  | `HdsContextMenu` (+ `.Trigger`/`.Content`/`.Item`/`.CheckboxItem`/`.RadioGroup`/`.RadioItem`/`.Label`/`.Separator`/`.Group`/`.Sub`/`.SubTrigger`/`.SubContent`) | `ContextMenu` (same compounds)            |
  | `HdsAspectRatio`                                                                                                                                                | `AspectRatio`                             |
  | `HdsMultiSelector` (+ `HdsMultiSelectorOption`)                                                                                                                 | `MultiSelector` (+ `MultiSelectorOption`) |
  | `HdsLightbox`                                                                                                                                                   | `Lightbox`                                |
  | `HdsCalendar`                                                                                                                                                   | `Calendar`                                |
  | `HdsTimeInput`                                                                                                                                                  | `TimeInput`                               |
  | `HdsDateInput`                                                                                                                                                  | `DateInput`                               |
  | `HdsDateRangeInput`                                                                                                                                             | `DateRangeInput`                          |
  | `HdsDateTimeInput`                                                                                                                                              | `DateTimeInput`                           |

  Consumers importing any of the above must update to the new names; there is no compatibility alias. Everything else — the `hds-` CSS class namespace, `data-*` attributes, the JSX-compiler DSL tags (`HdsFrame`/`HdsHeading`/`HdsLabel`/`HdsPhosphor`/`HdsCaption`), the provider/theme surface, the manifest type surface, and the `Form`/`FormField`/`ThemeProvider`/`Tooltip` collision families — is unchanged and out of scope for this PR.

- 7f48641: Add the "every-layout" layout primitives (#96): `Cluster` (wrapping flex row with tokenized gap/align/justify), `Center` (max-width column with auto margins and an optional tokenized gutter), `Sidebar` (fixed-width rail + fluid content that wraps to stacked via flex-basis/flex-grow disparity, no media query), `Switcher` (flips a row to a column below a `threshold` via the flex-basis calc() technique, with a `limit` to force stacking), `Cover` (vertical shell with an optional header/footer and an auto-margin-centered main region), `Frame` (aspect-ratio-locked, token-clipped media box — a thin radius/overflow skin over `AspectRatio`), and `Bleed` (controlled negative-margin full-bleed within a padded container). All seven are `as`-polymorphic, `forwardRef`, and token-driven — spacing resolves off the `--semantic-space-layout-*` scale, never raw px.
- 3faaea9: CSS-in-JS→Tailwind migration (#93): convert `Table` and `Disclosure` off inline
  `CSSProperties` objects onto Tailwind semantic classNames, then adopt `cva`.
  - `Table`: `density` (`comfortable | compact`) — the variant contract's
    canonical density example — plus column `align` and `stickyHeader` are now
    `cva` axes (`tableHeaderCellVariants`, `tableDataCellVariants`) driving
    Tailwind padding/min-height/position utilities bound to the same semantic
    tokens the previous inline styles referenced. Sort/selection are not
    implemented on `Table` (none existed pre-migration); `stickyHeader`
    positioning behavior is unchanged.
  - `Disclosure`: the `variant` (`panel | nav | card`) trigger styling is now
    `cva`-driven (`disclosureTriggerVariants`). Open/closed state moved from a
    JS `hovered`-state-driven inline style to a Radix-style
    `data-state="open"|"closed"` attribute with `data-[state=open]:` Tailwind
    selectors — same visual result, no more mousemove-triggered re-renders. The
    `motion/react` height/opacity/chevron-rotation animation is untouched (still
    JS-driven, not a CSS transition).

  No public prop or export renames — both components keep their existing prop
  API. `tableHeaderCellVariants`/`tableDataCellVariants`/
  `disclosureTriggerVariants` are new `@internal` cva-helper exports (same
  pattern as `buttonVariants`) — compose via component props, not directly.

- e1a127c: CSS-in-JS → Tailwind (#93): migrate `Token` fully to Tailwind + `cva` (`tokenShellVariants` / `tokenNodeInlineVariants` / `tokenLabelVariants`), replacing `Token.module.css` (deleted) and a duplicate inline-style `isSelected` override with one variant set on the same `--semantic-*`/`--component-*`/`--primitive-*` custom properties — no visual or prop changes.

  `SegmentedControl`'s active×hover×pressed×disabled×secondary state matrix is also converted to `cva` compound variants (`segmentedControlWrapperVariants` / `segmentedControlRailVariants` / `segmentedControlItemVariants` / `segmentedControlIndicatorVariants` / `segmentedControlDescriptionVariants` / `segmentedControlLabelVariants` / `segmentedControlFocusRingVariants`), replacing the inline `style` objects with the same tokens. Per ADR-015 the component keeps its own hover/focus tracking (not the shared `useInteractionState` hook, out of scope here) — only the class composition changed.

  No breaking changes: all public props, prop vocabularies, and rendered DOM/ARIA structure are unchanged for both components. The new `*Variants` exports are additive (compose via component props instead, per the variant-contract convention).

- 36e3eb1: Remove `InfoPage` from the public API (#49) — a breaking change, bumped as
  `minor` per the pre-1.0 semver-zero convention (0.x.y: breaking changes
  increment the minor).

  `InfoPage` was dead-portfolio scaffolding: a branded profile surface built
  for the portfolio landing page that hardcoded the (already-deleted)
  `/assets/adrian.webp` asset. It had no design-system-consumer use. Also
  removes `src/app/data/projects.ts`, the portfolio project data it and the
  now-deleted portfolio pages depended on — it has zero remaining importers.

  Migration: none. `InfoPage` was never intended for consumption outside the
  portfolio landing page; there is no drop-in replacement.

- b1057ac: Add `Reveal` and `Pin` scroll primitives (#116) to the core library — CSS scroll-driven, **zero JS and zero dependencies**. `Reveal` fades/slides/scales content in as it enters the viewport via `animation-timeline: view()` (`animation`: `fade | fade-up | fade-down | scale`); `Pin` is a token-friendly `position: sticky` wrapper (`top` offset) for pinned scroll scenes. Both are progressive-enhancement-safe: content is fully visible by default and the effect applies only where `animation-timeline` is supported and the user has not requested reduced motion (a `@media (prefers-reduced-motion: reduce)` + `@supports` fallback). Composes with the opt-in `@hirobius/design-system/scroll` primitives (`SmoothScroll`, `useScrollProgress`) for the full "pinned scale-reveal" hero effect on our own stack — no GSAP, no Lenis required (Lenis remains an optional add-on for momentum). See ADR-021.
- b1057ac: Add the `@hirobius/design-system/scroll` subpath (#116): opt-in scroll-motion primitives. `SmoothScroll` is a Lenis momentum-scroll provider (reduced-motion-first — skips Lenis entirely when the user prefers reduced motion — and SSR-safe), `useLenis` re-exports Lenis's React hook, and `useScrollProgress` is a Motion-based `0→1` scroll-progress hook (no new dependency; works with or without `SmoothScroll`). `lenis` is an **optional peer dependency** (`pnpm add lenis` to use `SmoothScroll`) and is externalized from the build, so it never lands in the main barrel and consumers who don't import `/scroll` pay nothing. Refines ADR-021: GSAP stays out of the library; Lenis is in as an opt-in subpath rather than downstream-only.
- 4420596: Variant contract (#60, Phase 1): establish the standard `cva` axis vocabulary — `variant` (structural), `tone` (`neutral | danger | success | warning | info`), `size` (`sm | md | lg`), `density` (`comfortable | compact`) — documented in `docs/architecture/variant-contract.md` and enforced by the extended `check-prop-vocabulary` gate (new tone/density allowlist rules). Converts the first reference batch to the contract: `Tag`, `Divider`, `Stat`, `Field`, `AvatarGroup`, `CircularProgress`.

  Breaking (value rename): `Stat` and `Field` rename their `tone="default"` value to `tone="neutral"` to align with the fixed tone set — pass `neutral`, or omit it (it remains the default). `Divider` gains a `variant="default" | "strong"` axis; the existing `strong` boolean is retained as deprecated back-compat and still works.

- cca9ba0: Variant contract (#60, Phase 3): convert className-based composites/overlays to `cva`. New cva adopters: `Card`, `Breadcrumb`, `Carousel`, `CommandPalette` (coverage: 35/123, was 31/123). `AlertDialog`, `Dialog`, `Tabs`, `Menu`, `ContextMenu`, `HoverCard`, `Popover`, `HdsTooltip` were reviewed and have no prop-driven className branching to formalize (their Radix `data-[state=…]` styling already lives directly in a single class string, contract-compliant as-is) — skipped, nothing to convert. `AspectRatio` has no className surface at all (thin Radix passthrough). The legacy `Tooltip` (image-expand pill) is CSS-in-JS/`framer-motion`-driven — flagged for a future inline-style→Tailwind migration before it can adopt `cva`. `ToggleButton` was already cva-converted in an earlier phase.

  Breaking (value rename): `Card`'s single `tone` prop is now two axes — `variant` (`'default' | 'accent'`, the former structural values) and `tone` (fixed `neutral | danger | success | warning | info`). Migrate:
  - `<Card tone="default">` → `<Card variant="default">` (or omit both — same default)
  - `<Card tone="accent">` → `<Card variant="accent">`
  - `<Card tone="success" | "warning" | "danger">` → unchanged (still valid on `tone`)

  `Card.Progress` and `Card.Metric`'s `tone` prop drops the `'accent'` value (no known internal consumers) and renames `'default'` → `'neutral'` (same default rendering — content-accent fill for Progress, content-primary color for Metric). Both gain a new `'info'` tone value for fixed-vocab completeness.

### Patch Changes

- 157990d: Variant contract (#60): migrate `HeadingStack` from CSS-in-JS (inline `style` + a `LEVEL_STYLES` `CSSProperties` map) to Tailwind + `cva`, formalizing `level` (`heading1 | heading2 | heading3`) as a cva variant and `gap` (`px4 | px8`) as a second, layout-axis variant (mirroring `Divider`'s `orientation`). Every emitted class binds the exact same `--semantic-typography-*`/`--semantic-color-content-*`/`--primitive-space-*` custom property the removed inline styles referenced — zero visual change. Public prop API, defaults, and tag overrides (`as`/`headingAs`/`subheadingAs`) are unchanged; non-breaking.
- f86ab1a: CSS-in-JS → Tailwind (#60): migrate `SideNav` to Tailwind + `cva` (`sideNavVariants`), formalizing the `level` (`root` | `nested`) axis as a cva variant alongside the existing rest/hover/focus/active/disabled `state` matrix. Replaces the inline `style` object and the removed `BG`/`TEXT` token maps with the same `--semantic-*`/`--component-*`/`--primitive-*` custom properties, bound 1:1.

  The `useFrozenState` (Storybook demo-state freeze) override is preserved exactly, including its pre-existing quirks: only `hover`/`active`/`disabled`/`pressed`/`press` freeze values are recognized (unlike `NavItem`, `focused`/`rest` fall through to live interaction state), and a frozen `pressed` state shares `active`'s visual tokens but does not set `aria-current="page"` the way a frozen `active` state does. Resolved state is now exposed via `data-state`/`data-level` attributes for testability, mirroring `nav-item.tsx`'s established pattern (ADR-015). Modality-aware focus-visible detection now goes through the shared `useFocusVisible` hook instead of a duplicated inline implementation.

  No breaking changes: the public prop API, defaults, RTL-aware indent math, the titleLabel/button/anchor branching, and the 44px minimum interactive size are all unchanged.

- 4c72ebc: CSS-in-JS → Tailwind (#60): migrate `DocLinkCard` to Tailwind + `cva` (`docLinkCardVariants`), formalizing the `variant` (`feature` | `pager`) axis. Inline `style` objects for layout (padding, gap, flex direction, absolute positioning, margins) are replaced with Tailwind classes bound to the same `--semantic-space-*` custom properties; typography composites (`heading3`/`ui`/`caption`) stay inline per the existing HDS pattern, with color/margin moved onto the shared `text-primary`/`text-secondary` utility classes. RTL (`isRtl`) and directional-affordance logic are preserved exactly — the pager icon/title left-right decision is now a single derived boolean equivalent to the prior nested ternaries. `motion/react` icon-nudge animations (`headerIconControls` / `pagerIconControls`) are untouched.

  No breaking changes: all public props, defaults, and rendered DOM/ARIA structure are unchanged. `docLinkCardVariants` is an additive `@internal` export (compose via `DocLinkCard` props instead, per the variant-contract convention).

## 0.11.0

### Minor Changes

- 39e5e4d: Autonomous issue sweep — additive components, tokens, and tooling (non-breaking):
  - **HdsTooltip** (#69): new accessible hover/focus tooltip on Radix Tooltip — collision-aware positioning, ARIA, keyboard, delay; inverse-surface skin with arrow.
  - **HdsThemeProvider + `useHdsTheme`** (#61): framework-agnostic theming contract over the four `data-*`/CSS-var dials (theme, density, brand, font), zero-JS compatible.
  - **Textarea** (#73): new multi-line text-field primitive mirroring Input's token skin, with label/helper/error slots and Default/Focus/Error/Disabled states.
  - **`semantic.typography.caption`** (#71): new 12/16 caption type composite in the token pipeline; `hds.typeStyles.caption` now resolves to it instead of aliasing `ui`.
  - **Alert** (#72): lighter icon stroke (2 → 1.5) and title alignment nudge to match the Figma spec.
  - Tooling (not shipped in the bundle): `pnpm hds:new` one-command component scaffold (#63) and a `design.md` → brand-overlay harvester (#67); source hygiene and suppression triage (#57).

## 0.10.0

### Minor Changes

- d371372: **BREAKING:** remove the `./protocol` subpath export. It carried the signed
  WebSocket envelope for the legacy hand-rolled Figma bridge, which has been
  archived (`archive/figma-bridge` branch) in favor of the official Figma MCP
  server + Code Connect (ADR-019). No consumer app imports it — it existed only
  to share the envelope with the custom Figma plugin. All other exports
  (components, stylesheets, `tokens`, `cn`, `manifest`, `contexts`, `form`,
  `mui`) are unchanged. If you did import `@hirobius/design-system/protocol`,
  pin `<0.10.0` or vendor `protocol/envelope.mjs` from the archive branch.

## 0.9.0

### Minor Changes

- 27e293a: Add a reset-free component stylesheet on a new subpath:
  `@hirobius/design-system/styles.css`. It ships the full component styling
  (design tokens + Tailwind utilities + embedded fonts) but **no global reset** —
  HDS's own base styles are scoped to `[data-hds]`, so importing `styles.css`
  styles every HDS component and changes **zero** host-element styles (`*`,
  `html`, `body`, headings, `button`, `a`, form controls are untouched). This is
  the clean way to run HDS alongside MUI `<CssBaseline>` / Emotion or any host with
  its own global CSS.

  `tokens.css` is unchanged (batteries-included: `styles.css` **plus** the global
  Tailwind preflight) and remains the default for HDS-first apps. A scoped
  box-model reset was added to the `[data-hds]` base so components keep their
  border-box model without the global preflight. The `smoke:consumer` gate now
  asserts `styles.css` carries components/utilities/fonts and no global reset.

- 27e293a: Add a semantic **`tone`** axis to `Button` (`neutral | danger | success |
warning | info`), driven by the feedback tokens, so destructive and status
  actions read as first-class buttons instead of falling back to a host framework:
  `<Button tone="danger">Delete</Button>`. Tones apply a token-driven tonal fill
  (tinted surface + matching feedback text) that clears WCAG AA in **both** light
  and dark, composes with any `variant`, and defaults to `neutral` (no change to
  existing buttons). `Badge` gains the matching `inProgress` tone, completing its
  status set. Backed by named `feedback-*` Tailwind utilities (no arbitrary color
  values).
- 27e293a: Add an **in-progress / secondary** semantic feedback hue and gate the feedback
  palette for accessibility. New `--semantic-color-feedback-inProgress` (violet:
  `#6d28d9` light / `#a78bfa` dark) plus its tinted-surface pair
  `--semantic-color-feedback-bg-inProgress`, backed by a new `violet` primitive
  ramp. This completes the status palette (success / warning / info / error /
  in-progress) so consumers can theme status UI — Saved / Applied / Interviewing /
  Offer / Rejected — from HDS tokens alone, with no local status hex.

  `scripts/check-contrast.mjs` now asserts every hex feedback token clears WCAG AA
  for small text on **both** the page and card (`raised`) surfaces, in light and
  dark. `docs/CONSUMING.md` publishes the feedback token names for downstream
  mapping.

- 27e293a: Add an optional Material UI theme preset on a new subpath:
  `@hirobius/design-system/mui`. `hdsMuiThemeOptions()` returns an MUI
  `ThemeOptions`-shaped object whose palette is wired to HDS token CSS variables
  (`error`/`warning`/`info`/`success` map to the same feedback tokens as
  `<Button tone>` / `<Badge tone>`), so MUI-based apps theme from HDS without a
  local token-copy step. It imports no MUI code (structural return type), so it
  adds zero weight and no peer requirement unless imported. Designed for MUI v6+
  CSS-variables mode: `createTheme({ cssVariables: true, ...hdsMuiThemeOptions() })`.

## 0.8.1

### Patch Changes

- ab78052: Publish to the **public npm registry** instead of GitHub Packages. Consumers now
  install with a plain `npm install @hirobius/design-system` — no `.npmrc`, no auth
  token, and no registry configuration. The package `exports`, build output, styles,
  and API are unchanged; only the distribution target moved.

## 0.8.0

### Minor Changes

- 3f48fc9: Ship built TypeScript declarations instead of source, so the package typechecks
  cleanly in a consumer.
  - `types` and every `exports[*].types` now point at emitted `dist/types/**/*.d.ts`
    (via a new `build:types` step using `tsconfig.dts.json`), not raw `.ts`/`.tsx`
    source. Consumers no longer compile our source, so the prior errors
    (`import.meta.env`, `Cannot find module './lab/tokenUtils'`/`'./Token.module.css'`)
    are gone — under `skipLibCheck`, `.d.ts` are skipped.
  - Source is no longer published (`files` drops `src`); the tarball ships only
    `dist/` (+ protocol, tokens json, manifest). Nothing published references a
    pruned path.
  - The `manifest` and raw-`tokens` exports are typed (`SystemManifest` / inlined
    DTCG shape) so the emitted `.d.ts` is self-contained (no JSON-path imports);
    CSS side-effect imports are stripped from `.d.ts`.
  - Verified: a Vite-style consumer (strict, `skipLibCheck`, bundler resolution)
    can `import { Button } from '@hirobius/design-system'` (and from subpaths) and
    pass `tsc --noEmit` with only react/react-dom installed. `smoke:consumer` now
    gates on that consumer typecheck plus `publint`.

- 2c8ca1c: Host-safe CSS + verified consumer build (packaging task C-partial / D / E).
  - **New `@hirobius/design-system/variables.css`** — design tokens as CSS custom
    properties ONLY (no Tailwind preflight, no `@layer base` reset, no utilities).
    Importing it cannot restyle a host app's elements, so it's the safe path for
    embedding HDS tokens inside MUI/another design system. The full `tokens.css`
    is unchanged (greenfield).
  - **`sideEffects`** tightened to `["**/*.css"]` (source no longer ships), so
    bundlers tree-shake unused JS exports while keeping CSS side-effectful.
  - **`smoke:consumer` now also runs a consumer `vite build`** of a `Button`-only
    app with NONE of `react-router`/`react-hook-form`/`zod`/`@hookform/resolvers`
    installed — proving leaf imports don't drag in the router/form stack (they're
    optional peers, absent from the main bundle graph). Plus the consumer
    `tsc --noEmit` + `publint` gates added previously.
  - **docs/CONSUMING.md** documents the vars-only path for MUI coexistence and the
    verified "leaf imports stay light" guarantee.

  Note: scoping the full stylesheet's global Tailwind **preflight** reset is a
  tracked follow-up (needs visual-regression verification); `variables.css` is the
  host-safe path in the meantime.

## 0.7.0

### Minor Changes

- a37eef7: Bundle web fonts into the package. `@hirobius/design-system/tokens.css` now embeds the Satoshi, Clash Display, and Geist Mono `woff2` files directly (base64), so a fresh consumer importing `tokens.css` renders the real typefaces with zero extra setup — no need to copy font files into a web root. Self-contained at the cost of a larger `tokens.css`.
- 06df9d6: Add **HdsCheckbox** — a custom-drawn checkbox primitive with `checked`, `indeterminate` (aria-checked="mixed" + DOM property), disabled, and label support, on the shared interaction-state seam.

  Also export the existing input-family primitives that were built but missing from the public barrel: **HdsToggle**, **HdsRadio**, and **HdsSlider**. Consumers can now import the full form-control set (`Input`, `Field`, `Select`, `SegmentedControl`, `HdsCheckbox`, `HdsToggle`, `HdsRadio`, `HdsSlider`) from the package root.

- 76aed0a: Add **Combobox** — a searchable single-select built on the HDS Popover. The trigger shows the current selection; opening reveals a search field that filters the option list. Full keyboard support (↑/↓ to move, Enter to choose, Esc/outside-click to close), listbox/option ARIA, and controlled `value`/`onChange`. Closes the autocomplete gap in the form-control family.
- 9223f6a: Add **Form** + **FormField** — a validation-agnostic form seam. `Form` is a styled `<form>` with consistent field rhythm; `FormField` owns the a11y wiring (label↔control association, `aria-invalid`, `aria-describedby` for description + error, required marker) and accepts a plain `error` string. HDS takes **no** form/validation dependency — the validation source is whatever the consumer brings (native constraint validation, react-hook-form, zod, Formik). Mirrors the router-adapter philosophy: works with zero deps, richer when you inject your own. (The `Input` primitive already self-wires its label/error, so use its props directly; `FormField` is for controls that don't, e.g. native inputs, `Select`, `Combobox`, checkboxes.)
- 9adfe22: Add an optional React Hook Form + Zod form adapter on a new subpath:
  `@hirobius/design-system/form`. It exports `useHdsForm(schema)` (RHF's `useForm`
  pre-wired with a Zod resolver and `onTouched` validation), `HdsForm` (wraps the
  presentational `Form` in RHF's `FormProvider` and routes submit through
  `handleSubmit` + `noValidate`), and `HdsFormField` (a render-prop that binds a
  control to RHF by `name` and surfaces the field's Zod error through the existing
  HDS label/error/aria markup).

  `react-hook-form`, `zod`, and `@hookform/resolvers` are **optional** peer
  dependencies — only apps importing this subpath pull them in, so the main barrel
  stays validation-agnostic and zero-dependency. The core `form` module also now
  exports `FormFieldShell` + `useFieldWiring` (a non-cloning field-markup shell and
  the shared id/aria computation) for controls that manage their own callback ref.

- 8b3fe5b: Add four presentational primitives that consumers hit immediately: **Spinner** (indeterminate loading indicator), **Skeleton** (content-loading shimmer, `text`/`rectangular`/`circular`), **Progress** (linear determinate/indeterminate bar), and **Avatar** (image with initials fallback). All token-driven, accessible (`role="status"`/`progressbar"`/`img`), and honor `prefers-reduced-motion`.
- f444c6e: Add **Menu** — a Radix-backed dropdown-menu primitive (compound parts: `Menu`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.CheckboxItem`, `Menu.RadioGroup`/`RadioItem`, `Menu.Label`, `Menu.Separator`, `Menu.Group`, `Menu.Sub`/`SubTrigger`/`SubContent`) themed with the overlay role tokens to match Dialog/Popover. Roving focus, type-ahead, checkbox/radio items, submenus, and dismissal come from Radix. Promotes the dropdown that previously lived privately inside the theme-toggle into a public component (no new dependency — `@radix-ui/react-dropdown-menu` was already present).
- 8529e25: Add **Popover** — a Radix-backed floating-surface primitive (compound parts: `Popover`, `Popover.Trigger`, `Popover.Anchor`, `Popover.Content`, `Popover.Close`) themed with the overlay role tokens to match Dialog. Collision-aware positioning, outside-click + ESC dismissal, focus management, and portal mounting out of the box. Adds `@radix-ui/react-popover` as a dependency.
- 93171e1: Components no longer require react-router. Navigation is sourced from an injectable adapter (`RouterContext`): by default links render as plain anchors and navigation falls back to `window.location`, so HDS works with zero router. react-router / Next.js consumers inject their router once at the app root via `<HdsRouterProvider adapter={...}>`. `react-router` is now an optional peer dependency.
- 45fe9ab: Scope the design-system base styles (element resets, body/heading type baseline, theme transition) to a `[data-hds]` subtree so HDS can drop into a section of a non-HDS app (e.g. one running MUI `<CssBaseline>`) without competing resets or font-cascade fights. Namespaced token custom properties stay on `:root` (harmless).

  **Migration:** add `data-hds` to your app root (or the section that hosts HDS) so the base styles apply — e.g. `<html data-hds>` or `<div data-hds>…</div>`. Without it, components still receive their token-driven styling but the global type baseline/resets won't apply. See `docs/adr/016-scoped-base-styles.md`. Tailwind preflight remains global for now (documented follow-up).

- 01cdcd9: Add **Toast** — transient feedback notifications backed by Radix Toast. Wrap the app once in `<ToastProvider>`, then call `useToast().toast({ title, description, tone })` imperatively from anywhere. Tones (`neutral`/`info`/`success`/`danger`/`warning`) tint the leading icon via the feedback tokens; auto-dismiss, swipe-to-dismiss, the a11y live region, and the viewport portal come from Radix. Adds `@radix-ui/react-toast`.

## 0.6.0

### Minor Changes

- 82fbcf0: Alert: unify the feedback prop with Badge/Card/Callout. `variant` is renamed to
  `tone`, and the destructive value `"error"` is renamed to `"danger"` (the
  feedback red is `danger` everywhere now). The token CSS variables are unchanged.

  Migration: `pnpm codemod -t codemods/alert-tone-to-danger.cjs <path>`

- 82fbcf0: Button / IconButton: remove the deprecated `isDark` prop. Button chrome is
  theme-aware via CSS variables, so the prop was a no-op. Remove it from call
  sites.

  Migration: `pnpm codemod -t codemods/remove-button-isdark.cjs <path>`

- 82fbcf0: SegmentedControl: move `size` onto the shared `sm | md | lg` ramp used by
  Button/Input/IconButton. `size="default"` → `size="md"`, `size="compact"` →
  `size="sm"`. Rendering is unchanged.

  Migration: `pnpm codemod -t codemods/segmentedcontrol-size.cjs <path>`

## 0.5.0

### Minor Changes

- 23cfdae: Make the package publishable and consumable.
  - Publish target set to GitHub Packages (`publishConfig.registry`); `private`
    removed so `npm publish` is allowed.
  - Declare `react`, `react-dom`, and `react-router` as peer dependencies so
    consumers provide a single copy (no duplicate-React hook errors).
  - Wire up Changesets (`changeset add` / `version` / `release`) and a CI release
    workflow that publishes on merge to `main`.

- 390a877: Harden and slim the consumable package surface.

  **Packaging**
  - Cut the published tarball from ~49 MB / ~400 files to ~0.55 MB / ~207 files:
    the library build no longer copies the 47 MB `public/` tree (portfolio PNGs,
    fonts, JSON) into the package (`publicDir: false`), no longer ships sourcemaps
    (`sourcemap: false`), and no longer drags the whole component-preview universe
    (every component via `import.meta.glob`, the 3D mobius-scene chunk, the lab
    modules, the component-api/token-audit artifacts) into the bundle.
  - Excluded demo/lab/3D source (`src/stories`, `src/app/components/lab`, the
    mobius/shaders modules) from the package `files`.

  **Consumer resolution (fixes latent breakage in 0.4.0/0.4.1)**
  - Externalize `motion/react` correctly so the bundle imports it (resolved via the
    `motion` dependency) instead of emitting a bare `framer-motion` import — a
    package that was never a dependency, which broke every consumer of a
    motion-based component (tooltip, alert, disclosure, …).
  - Demote app-only runtime deps (`three`, `@react-three/*`, `postprocessing`,
    `express`, `cors`, `fuse.js`, `zustand`) from `dependencies` to
    `devDependencies`; consumers no longer transitively install the three.js
    ecosystem.

  **API surface**
  - Added subpath export `@hirobius/design-system/protocol` (bridge envelope).
  - BREAKING: removed `ComponentDocPage` and `SpecimenBlock` from the main barrel
    — they are docs-shell renderers, not consumable primitives. Import them from
    the in-repo doc site directly if needed.
    </content>

All notable changes to the Hirobius Design System (HDS) are documented in this file.

This project uses [Changesets](https://github.com/changesets/changesets) for structured
release management. When `@changesets/cli` is installed (`pnpm add -D @changesets/cli`),
run `pnpm changeset:add` to stage a user-visible change entry before merging a PR.

**Tooling note:** the `## Unreleased` section below is generated by
`scripts/generate-changelog.mjs` from git history. Re-run it after merges to refresh.
Once the changeset workflow is active, `pnpm changeset:version` will auto-aggregate
`.changeset/*.md` files and bump this file alongside `package.json`.

---

## Phase history overview

| Phase    | Milestone                                                                                         | Status      |
| -------- | ------------------------------------------------------------------------------------------------- | ----------- |
| Phase 0  | Project bootstrap — Vite + React + Tailwind v4 + token pipeline                                   | Complete    |
| Phase 8  | shadcn pivot — Radix primitives + cva/clsx/cn + HdsButton/Input/Card/Dialog                       | Complete    |
| Phase 9D | Three-column doc shell, cmd-k palette, scrollspy TOC, theme toggle                                | Complete    |
| Phase 10 | Token governance, component completeness, Figma plugin bridge v1                                  | Complete    |
| Phase 11 | Approval app — orchestration schema, bridge endpoints, list/detail views                          | Complete    |
| Phase 12 | HDS refinement — strict TypeScript, ESLint hardening, multi-tenant architecture, LLM prompt suite | In progress |

Current version: `0.0.1` (pre-1.0; semantic versioning enforced after first stable release tag)

---

## Unreleased

### ⚠ Breaking changes — public API (13y-20)

Four `Hds*`-prefixed primitives were renamed or removed during the
shadcn pivot (Phase 8). The new names are stable and re-exported from
`@hirobius/design-system` per the `src/index.ts` barrel.

| Old              | New          | Notes                                                                                    |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `HdsButton`      | `Button`     | Same API; prefix dropped during shadcn alignment                                         |
| `HdsSurface`     | `Surface`    | Same API; prefix dropped                                                                 |
| `HdsIconButton`  | `IconButton` | Same API; prefix dropped                                                                 |
| `HdsButtonGroup` | _removed_    | No drop-in replacement — use a `Stack direction="row"` with multiple `<Button>` children |

Migration: `import { HdsButton } from '@hirobius/design-system'` →
`import { Button } from '@hirobius/design-system'`. For `HdsButtonGroup`,
replace with a `Stack` wrapping multiple `Button` children.

ADRs (`docs/adr/005-north-star-primitives.md`,
`001-shadcn-baseline-distribution.md`, `006-four-tier-classification.md`,
`008-slot-vocab-radix-aligned.md`) reference the old `Hds*` names as
historical record — that is intentional and they should NOT be
rewritten. The migration applies to consumers, not to history.

### Features

- **ops:** 10o-14 derive-routes script ([289f9b7](#))
- **infra:** 10o-13-og-meta-validation static head-tag audit ([c39496f](#))
- **infra:** 10o-15-font-file-validation @font-face source existence check ([e45c2db](#))
- **bridge:** 12h-2 add --check-config mode + /pair pairing endpoint ([5b88183](#))
- **docs:** 10a-7 system scope page ([ebf293f](#))
- **orchestration:** multi-agent overnight burndown protocol + watcher ([9fdb059](#))
- **infra:** 12v-token-rebake-in-pre-commit detect generated-token drift in pre-commit ([57489cd](#))
- **tokens:** 12v-token-rename-detection-test guard against silent token renames ([d959d4c](#))
- **orch:** claim protocol — agents lock units before working to prevent collisions ([3dd9cf7](#))
- **infra:** 12s-infra-worktree-isolation-verification dispatch-pod.mjs pre-commit guard ([032dbcd](#))
- **toc:** 12j-doc-toc-scrollspy-dynamic-content observe DOM mutations for late-rendered headings ([123ea78](#))
- **theme:** 12j-doc-theme-prefers-color-scheme-listener subscribe to OS theme changes ([2fcb952](#))
- **tokens:** 12v-token-line-height-none-alias add semantic lineHeight.none alias + drop bypass ([ff6ae30](#))
- **infra:** 12s-infra-strengths-audit-script weekly cron audit of documented differentiators ([2fd3a1e](#))
- **llm:** 12k-llm-prompt-regression-suite scaffold + 8 canonical prompts ([9f9fe75](#))
- **architecture:** 12m-multi-tenant decision + token overlay format ([ff600c0](#))
- **ts:** 12i-quality-ts-strict-wave2 enable noUnusedLocals + noUnusedParameters + clean 55 violations ([5512744](#))
- **lint:** 12i-quality-eslint-upgrade install ESLint plugin stack + wire to pre-commit ([c8e09fc](#))
- **ts:** 12i-quality-ts-strict-wave1 enable 6 zero-error strict flags ([eb47347](#))
- **template:** 12b-1 + 12b-2 reconcile InfoPage status + smart-animate expand ([f81590c](#))
- **tokens:** 12a-3 bump Clash Display to medium/500 weight ([85dcdba](#))
- **system:** wave-2 sprint close — font switch, agent infra hardening, agency platform scaffold ([0cc660e](#))
- **docs:** 12d-1 manifest-driven docs pass — project intros from componentSpecs ([7548e5e](#))
- **hds:** 12a-1 remove auto-injected component index from doc shell ([96006c0](#))
- **tokens:** 10m-3-button-padding-tokens-size-segmented size-aware padding ([8e6935c](#))
- **nav:** remove overview page + token-explorer from left nav ([1b071a5](#))
- **bridge:** 10f-7-xpath-query-endpoint subset-XPath /query ([c7962ed](#))
- **figma:** 10f-1-figma-snapshot-adapter normalized snapshot shape ([ecdd38b](#))
- **10p:** tab-focus-ring + asset-validation + decision-log ADRs ([2adcf0e](#))
- **cleanup:** 10o-21-knip-driven-cleanup walk knip orphans + soft-wire ([681782a](#))
- **tokens:** 10t-7-clash-display-font Clash Display for headings only ([6a12bc9](#))
- **approval-app:** 11a-4 approval app per-unit detail view ([faa2928](#))
- **tokens:** 10t-5-type-ramp-composites Swiss-canon 8-style ramp ([19ffb04](#))
- **approval-app:** 11a-3 approval app list view ([8dde9f3](#))
- **docs:** 10d-11 mark lab/Token\* as @deprecated; capture closure note ([7236844](#))
- **docs:** 10d-14 surface componentSpec.figmaLink in doc-page header ([dc7b3d3](#))
- **cleanup:** 10o-22-delete-test-ghost-button remove HdsTestGhost ([e3b1c92](#))
- **approval-app:** 11a-2 bridge approval endpoints ([8112480](#))
- **approval-app:** 11a-1 orchestration schema validator + 11a unit seeds ([0876cfd](#))
- **docs:** 10d-13 remove WIP / under-construction emoji from component docs ([beed27b](#))
- **docs:** 9d-10 doc-page snapshot regression gate + a11y audit (closes 9-D) ([7f848e5](#))
- **bridge:** p6-3 /contrast endpoint (WCAG 2.1 luminance over serialized selection) ([630f794](#))
- **bridge:** p6-4 reverse token sync (Figma Variables → tokens-from-figma.json) ([d6b0e3c](#))
- **docs:** 9d-9 batch-refactor every doc page (shell + header + code-block + TOC + API ref) ([77d01a7](#))
- **bridge:** p6-2 /lint endpoint (run validator suite on serialized selection) ([f246e3f](#))
- **pipeline:** p6-5 fix-mode diff (selection vs LLM proposal) ([cd3f7d8](#))
- **docs:** 9d-6 right-rail TOC + scrollspy + deep-link anchors ([b85d23a](#))
- **plugin:** p6-1 manifest-aware selection serializer ([b176ffc](#))
- **docs:** 9d-5 HdsCodeBlock collapsed-by-default with copy + filename + language ([e285b64](#))
- **docs:** 9d-8 inline collapsed HdsApiReference (props + constraints) ([7a4b13a](#))
- **docs:** 9d-3 system/light/dark theme toggle ([b5ace7b](#))
- **docs:** 9d-2 cmd-k command palette over manifest ([e964600](#))
- **docs:** 9d-4 standardized doc-page header ([13d1a45](#))
- **tokens:** 9d-7 semantic.docs.\* type + spacing scale for doc-site ([f696a66](#))
- **bridge:** p5-4 plugin runtime error channel (render-error → retry loop) ([c1cd3d7](#))
- **manifest:** backlog-2 expand GENERATIVE_SUBSET via 8s-8 AST projection ([38fb002](#))
- **docs:** 9d-1 three-column doc shell (Vercel/Geist baseline) ([343c848](#))
- **bridge:** p5-3 auth — shared secret + HMAC middleware ([88e64e0](#))
- **bridge:** p5-2 request-response correlation (envelope.id pending Map + 30s TTL) ([af1d4a0](#))
- **protocol:** p5-1 message envelope (HMAC + replay-protection) ([1a15de3](#))
- **governance:** 8t-6 public-api-lockdown — package.json exports + barrel + @internal markers ([f1c0e3b](#))
- **docs:** 8t-4 template refactor batch — 5 templates ([f605721](#))
- **component:** 8t-3b pattern batch (heavy) — 4 patterns ([cf034db](#))
- **docs:** 8t-3a pattern doc batch (light) — 4 patterns ([00268ad](#))
- **docs:** 8t-2 template gallery doc shape + HdsInfoPage reference ([b2aa96f](#))
- **docs:** 8t-1 pattern doc template + HdsField reference page ([d78c94b](#))
- **tooling:** 8s-8 project componentSpec from source via TypeScript AST ([0eb5cc3](#))
- **component:** 8s-7 add HdsDialog (shadcn Radix Dialog + role.popover) ([85b031d](#))
- **component:** 8s-6 replace HdsCard with shadcn compound parts + role tokens ([f28ca12](#))
- **component:** 8s-5 replace HdsInput with shadcn baseline + role tokens ([9135ec0](#))
- **component:** 8s-4 replace HdsButton with shadcn baseline + role tokens ([7c7d001](#))
- **spike:** 8s-3 shadcn Button vs HdsButton side-by-side gallery ([36a72ff](#))
- **tooling:** 8s-2 add Radix slot + cva + clsx + tailwind-merge + cn() helper ([401bea6](#))
- **tooling:** 8s-1 reinstall Tailwind v4 with token bridge ([2b5cd72](#))
- **governance:** 8x-6 drop experiment tier; strict contract for componentSpecs ([5ce58d3](#))
- **tokens:** 8e-3 emit tailwind.config.tokens.cjs from DTCG source ([c043726](#))
- **tokens:** 8e-2 role.\* alias layer for shadcn vocabulary ([9584649](#))
- **tokens:** 8e-1 elevation/shadow composites + theme-aware shadow color ([fb2ba89](#))
- **governance:** 8x-5 split tier=utility|experiment into peer sections ([098418b](#))
- **governance:** 8x-4 orphan resolution — drop 5 source-less specs ([0e3ec58](#))
- **governance:** 8x-3 source @tier tagging + tier required on validate ([161cffc](#))
- **governance:** 8x-2 heuristic tier audit + draft TIER_AUDIT.md ([618e058](#))
- **manifest:** 8x-1 tier schema-extension + utilities/experiments sections ([c7ec69f](#))
- **governance:** 8v-6 figma-masters snapshot regression gate ([464a7f0](#))
- **governance:** 8v-5 binding-completeness validator + drift hard-fail ([2b4f44a](#))
- **governance:** 8v-4 binding drift gate (soft) for source ↔ slots[] ([e40922e](#))
- **pipeline:** 8v-3 project figma-masters-batch from manifest slots[] ([33335fb](#))

### Bug Fixes

- **orch:** restore orchestration.json wrapper structure ([8d70f91](#))
- **lint:** wave-1 burndown — clear @typescript-eslint/no-unused-vars from all src/app files ([c4c1f4d](#))
- **scripts:** audit-tokens --scan-source exits 0 cleanly with no patterns ([0fca22f](#))
- **validators:** 12i-1 manifest scanner skip 10 demo helpers + promote validate-manifest to pre-commit hard-fail ([c9931cd](#))
- **a11y:** 12a-4 brand-blue swatch contrast — repair OKLCH→RGB conversion ([b4ffa0c](#))
- **nav:** strip DocLayout navSlot + tocSlot from all HDS doc pages ([53a1e78](#))
- **nav:** remove duplicate sidebar nav from all HDS doc pages ([6103b5f](#))
- **hds:** remove dead system.manifest.json import + SYSTEM_MANIFEST const ([ab8569c](#))
- **nav:** restore HdsNavItem import in HDSLayout post-merge ([e721670](#))
- **a11y:** 10a-1-foundations-contrast-pass resolve two WCAG AA failures ([8899b55](#))
- **visual:** /hds/tokens drift root-cause + targeted re-baseline ([23664c6](#))
- **motion:** 10p-3-motion-tighten remove ornamental motion + Swiss-canon enforce ([757a428](#))
- **pipeline:** 10m-6-iconButton-invert-mapping lock invert behavior with negative + omitted fixtures ([48fbd1f](#))
- **pipeline:** 10m-2-registry-stub-summaries write real summaries + promote check:registry ([94de50c](#))
- **pipeline:** 10m-1-playwright-baseline-rewrite-fix block default visual baseline rewrites ([3342c02](#))
- **plugin:** cleanup-dead-sync-endpoint — remove Step 3 /sync button ([555d872](#))
- **governance:** 8x-6 follow-up — retier 9 doc-exempt non-public components ([77fef27](#))

### Performance

- **bundle:** 12o — lazy HDSLayout Möbius layer + fix pre-existing audit violations ([5c2ea54](#))

### Refactoring

- **hds:** 12i-bloat-hdslayout-health-rail-extract move TokensRail + helpers to HdsHealthRail.tsx ([0440bd1](#))
- **icons:** migrate every Phosphor import site to Lucide ([576c4ee](#))
- **icons:** port HdsIcon wrapper to lucide-react ([50813ca](#))
- **types:** drop 6 unused exported types/symbols (knip drain) ([d99c9fd](#))
- **docs:** drop 10 true-orphan doc-pattern + doc-template files (knip drain) ([47e07fe](#))
- **types:** 12i-bloat-token-audit-types-shared unify TokenAuditReport across HDSLayout + HdsLegacyTokenDetail ([1385486](#))
- **lab:** 12i-bloat-legacy-token-dead-code extract colorUtils + drop voided helpers ([fa94727](#))
- **docs:** 12i-bloat-docprimitives-dead-found-components drop unused foundation primitives ([42ebc99](#))
- **hds:** 12i-bloat-hdslayout-dead-code drop dormant SearchModal + CollapsibleNavGroup + helpers ([89f9df2](#))
- **component:** demote HdsHistoryCard to utility tier + simplify ([117b4a3](#))
- **scripts:** backlog-1 consolidate audit-component-source into audit-tokens --scan-source ([390e147](#))

### Documentation

- **rules:** 12f-1 card anatomy block in llms.txt + REACT_COMPONENTS.md ([71f81c7](#))
- **architecture:** 12n-api-rfc-process-formalization ADR numbering + lifecycle ([5a3094b](#))
- **ai:** autonomous protocol — add claim-before-work step ([94983ee](#))
- **ai:** 12s-infra-no-bulk-lint-fix-policy rescue mark unit done ([71456a0](#))
- **ai:** 12s-infra-sub-agent-prompt-templates rescue add PROMPT_TEMPLATES.md file ([6624058](#))
- **ai:** 12s-infra-no-bulk-lint-fix-policy codify rule in CLAUDE.md + memory ([6e56015](#))
- **ai:** 12s-infra-sub-agent-prompt-templates 5 reusable dispatch templates ([94d5408](#))
- **ops:** strengths catalog + 3 batched prompts for fresh-session dispatch ([a542614](#))
- **ai:** comprehensive session capture — 17 missing units + scorecard + agent guidelines ([8b1595b](#))
- **architecture:** 12i-bloat-hdslayout-architectural-split — full split plan ([1a89edd](#))
- **coherence:** 12j-doc-coherence drain 6 verified contradictions ([f4e41ba](#))
- **icons:** sync all doc surfaces to Lucide-canonical claim ([e6420ca](#))
- **tokens:** 12j-doc-ghost-token-component-inset fix REACT_COMPONENTS.md component.inset -> component.padding ([884dcee](#))
- **typography:** 12j-doc-typography hot-fix wrong family + heading weight in DESIGN/DESIGN-HANDOFF ([802b3b4](#))
- **elevation:** 12i-elevation-reconcile drop sticky + sync 4-role rule across docs ([5b37c19](#))
- **ai:** reconcile ROADMAP + OPERATOR_BRIEF after Sprint 2 close ([f983891](#))
- **ai:** brief reconcile for Wave 2 + Phase 12 spec handoff ([1d4a8db](#))
- **ai:** refresh AUTONOMOUS_BUILD.md gate lists post-overnight ([119c168](#))
- **ai:** reconcile state after overnight push (24 commits, 5 clusters closed) ([ed79beb](#))
- **governance:** p7-3 feature-flag lifecycle policy + flag audit ([2fcf922](#))
- **ai:** sharpen backlog-2 scope to leverage 8s-8 AST projection ([d7af539](#))
- **ai:** queue 9-D-docs-aesthetic cluster (Vercel/Geist-style) ([098086b](#))
- **ai:** reconcile state after 8-V cluster closes ([0a2b246](#))
- **ai:** handoff state after 8v-1/2/3 land ([a1547ed](#))

### Tests

- **perf:** 12p-test-property-based-token-math fast-check property suite for colorUtils ([510c3c0](#))
- **orch:** 12p-test-orchestration-validator-self-test add test file + validator export refactor ([3933d9e](#))
- **orch:** 12p-test-orchestration-validator-self-test cover 8 rules with positive + negative cases ([afad397](#))

### Chores

- **orch:** claim 2 units for session:overnight-2026-05-02-pod-spacing ([fdbc0f5](#))
- **orch:** claim 10a-5-grid-system-doc for session:overnight-2026-05-02-pod-grid ([1c2050a](#))
- **orch:** claim 3 units for session:overnight-2026-05-02-pod-validators ([d7b7aa3](#))
- **orch:** claim 10t-1-relationship-diagram-static for session:overnight-2026-05-02-pod-tokendiagram ([ecdba10](#))
- **orch:** claim 10o-19-changelog-generation for session:overnight-2026-05-02-pod-changelog ([33ecce1](#))
- **orch:** claim 10o-15-font-file-validation for session:overnight-2026-05-02-pod-fonts ([8d20d2a](#))
- **quality:** 12i-quality-dormant-validators-triage document high-value dormant checks ([20f351e](#))
- **orch:** claim 12i-quality-dormant-validators-triage for session:fresh-2026-05-02-w2-a4 ([5adeb12](#))
- **orch:** claim 10o-7-archive-legacy-planning-docs for session:fresh-2026-05-02-w5e ([123dfea](#))
- **orch:** claim 10a-7-scope-doc for session:fresh-2026-05-02-w5c ([0fdc7d0](#))
- **orch:** claim 12h-2-plugin-auth-envelope for session:fresh-2026-05-02-w5a ([3a2acc6](#))
- **orch:** claim 12f-1-card-visual-guidelines for session:fresh-2026-05-02-w5d ([d2c79ec](#))
- **orch:** claim 3 units for session:fresh-2026-05-02-w4b ([64d5fd8](#))
- **orch:** claim 4 units for session:fresh-2026-05-02-w1b ([1c17250](#))
- **orch:** claim 5 units for fresh-session window 4 dispatch ([f56c9e4](#))
- **regen:** refresh component-api.json source-line offsets after wave-1 lint + completeness work ([a7c66f4](#))
- **quality:** 12i-quality-tsconfig-typecheck-realign cover full src tree ([5c9a950](#))
- **github:** 12i-quality-pr-issue-templates rescue land PR + issue templates ([436876f](#))
- **quality:** 12i-quality-component-completeness-burndown burndown + promote to pre-commit ([e505188](#))
- **ops:** 12s-infra-tag-baseline-pre-merge tag v0.2.0-pre-merge + recurring protocol doc ([d110b50](#))
- **github:** 12i-quality-pr-issue-templates add PR + issue templates ([3e20576](#))
- **lint:** 12i-quality-eslint-burndown wave-1 lower baseline 521 -> 206 ([fb40a28](#))
- **ai:** add 5 testing-strategy units (coverage + state-store + property-based + validator-self-test + required-checks-promote) ([99c7339](#))
- **ai:** add 12i-quality-audit-tokens-burndown for 8 token-bridge violations ([d7d3797](#))
- **ai:** add 3 multi-tenant follow-up units (source-canon scope guard + runtime provider + JSON Schema) ([ff0aed0](#))
- **ai:** add 12l-figma-plugin-auth-secret-wiring follow-up unit ([8e0433c](#))
- **flags:** 12k-llm-phase-6 activate selection-serializer + lint + contrast + reverse-token-sync + snapshot + xpath ([92c28f6](#))
- **flags:** 12k-llm-phase-5 activate auth + correlation + runtime errors ([9fbef8e](#))
- **ai:** capture full autonomous queue across 13 clusters ([31bdcd9](#))
- **deps:** drop @phosphor-icons/react dependency ([1bcc990](#))
- **ai:** mark 3 Pod-2 false-positives denied + queue 12f-4 video-ingestion unit ([0e1e1f8](#))
- **history:** post-Pod-6 auto-pipeline regen + commit-history bump ([773c01c](#))
- **history:** post-commit auto-updates after Pod 5 CI workflow merge ([6393d01](#))
- **history:** post-commit auto-update after Pod 3 cherry-picks 1-2 ([136a23f](#))
- **history:** update commit-history.json after elevation reconcile ([09fe8f9](#))
- **repo:** mechanical drains + pre-commit hardening ([d11b51c](#))
- **canon:** 12a-5 zero raw inline typography in non-bypassed source ([1e847c2](#))
- **ai:** add backlog-23 FOUC prevention + delete TASKS.md ([2ce3ece](#))
- **ai:** restore 86-unit backlog scrub + 5 new directive units ([ac424e3](#))
- **ai:** wave-2 close — 13 units → done + 3 ad-hoc + 10c-1 denied ([a5a4d93](#))
- refresh commit-history.json post Pod 1-7 merges ([25c313e](#))
- **ai:** wave-2 reconcile — 5 done + 3 in-progress (worktrees) ([af25302](#))
- **ai:** wave-2 prep — eco-rule + 22 unit specs + Wave 1 reconcile ([2c0fb73](#))
- **visual:** refresh baselines after typography swap ([3ee1732](#))
- **governance:** 8t-5 orphan-final-cleanup — drop ComponentDocPage alias + capture HdsErrorBoundary ([aa99475](#))
- **orchestration:** mark 8x-6 and 8s-1 completed ([bc3a6ee](#))

### CI

- **llm:** 12k-llm-daily-synthetic-cron daily regression run against 8 prompt goldens ([82b0847](#))
- **github:** 12p-test-required-checks-promote wire responsive + collision suites + policy doc ([74ee0e5](#))
- **github:** 12i-quality-ci-hardening-bundle quality.yml + visual + a11y + token-scan + build step ([22b380b](#))
- **github:** 12i-quality-ci-pr-gates add Quality-gates workflow on PR ([280d1d0](#))

### other

- merge: overview page removal + nav cleanup (token-explorer + overview hidden) ([324c116](#))
- merge: Pod 8 redo + tokens drift docs — 10a-1 contrast + 10m-3 button padding ([a9a8912](#))
- merge: Pod 4 — 11a-1..4 approval app schema + bridge + list + detail ([dd1bb44](#))
- merge: Pod 7 — 10p-3 motion tighten ([a0b373e](#))
- merge: Pod 2 — 10d-13 emoji + 10d-14 figmaLink + 10d-11 token-explorer deferral ([e9d9b44](#))
- merge: Pod 3 (third commit) — 10m-6 iconButton invert fixtures ([917e98b](#))
- merge: Pod 1 — 10o-22 ghost button delete + 10o-21 Knip drain ([13a3b65](#))

_Older history truncated. Run with --all to see full log._
