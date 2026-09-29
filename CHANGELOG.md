# Changelog

## 0.16.0

### Minor Changes

- f20513f: - **New exports:** `HdsSelect` and its `SelectProps` are now reachable from the package root (hds#231), and `HdsDocsShell` is a new 3-column docs layout with independently sticky rails (hds#280).
  - **New token:** `primitive.size.interactive.minCompact` (24px). Tokenizer's remove button now uses it, so it meets the WCAG 2.2 2.5.8 minimum target size (hds#287).
  - **Fixes:** Radio's colour transition now actually animates (hds#257); StackedCardRail no longer breaks its styles when server-rendered (hds#284).
  - **Deprecations:** `ComponentInstanceMatrix`, `FoundationSwatch`, `Sketch`, `Token` and `CinematicLink` are docs-internal and now warn once. They leave the published barrel in 1.0.0 (hds#232).
  - **Smaller bundle:** the main entry drops from 202 to 183 kB gzip, because the docs-only token corpus no longer ships in the published library (hds#279).
- Type-ramp prerequisites (hds#283, steps 0–3). **Removes six unused primitive tokens**: `--primitive-typography-size-2xs`, `--primitive-typography-weight-light`, `--primitive-typography-weight-semibold`, and `--primitive-typography-letterSpacing-tighter` / `-wide` / `-wider`. None had a consumer in hds, ops or concrete. Icons are now sized from `primitive.size.16/20/24` instead of the type scale; a `tracking-caps` utility replaces stock `tracking-wide` for eyebrow text; DateInput and DateTimeInput calendar buttons no longer collapse under flexbox; and a type specimen story documents the scale.

## 0.15.0

### Minor Changes

- a5d33b6: Every props type behind a component the package exports is now exported too, so a
  consumer can name it.

  41 of them were not. `src/index.ts` re-exports each public module with `export *`, so a
  type ships only if its module exports it — and for `Alert`, `Container`, `Stack`,
  `Grid`, `CardHeader`, `ErrorBoundary` and 35 others it did not. The single most ordinary
  thing a consumer writes,

  ```tsx
  const Wrapped = (props: AlertProps) => <Alert {...props} />;
  ```

  did not compile, and the author had to fall back to `React.ComponentProps<typeof Alert>`
  or restate the shape by hand. Nothing here could see it: `tsc` is satisfied because the
  type is in scope inside its own module, the component renders fine, and every test in
  this repo imports from `src/`, where the barrel is irrelevant.

  The rule is reachability, not the `Props` suffix. A type is exported iff it annotates the
  props of a component the module exports — directly, through a trailing `export { … }`, or
  through an `Object.assign` compound like `Grid`. That deliberately leaves internal: the 33
  `VariantProps<typeof xVariants>` cva aliases (`button.tsx` sets that convention),
  composition bases such as `NavNativeProps`, union arms such as `TokenBaseProps`, cast
  targets such as `WiredChildProps`, and the props of sub-components the module keeps to
  itself.

  Purely additive — 41 symbols added, none removed, no module changed.
  `scripts/check-props-exports.mjs` runs from `pretest` and holds the line.

### Patch Changes

- c2b9e86: Every React-bearing bundle now starts with `'use client'`, so the package works in the
  Next.js App Router that `CONSUMING.md` advertises.

  Before this, `dist/` shipped 20 `useState` calls and zero client directives. In the App
  Router a module is a Server Component until it says otherwise, and a Server Component
  that calls a hook fails at render — so the first `import { Button } from
'@hirobius/design-system'` in a Next.js page threw. No existing consumer had hit it
  (ops is Vite, site-engine is Astro), which is exactly why a prospective user would have
  found it first.

  The directive is applied **per chunk, not as a blanket banner**. The framework-free
  subpaths — `brand`, `tokens`, `cn`, `manifest`, `mui` — stay unmarked on purpose:
  `'use client'` turns every export of a module into an opaque client reference when it is
  imported from server or edge code, which would break `tokens.color.primary` in a Server
  Component and defeat `brand`'s documented "static Astro build or edge runtime" use.

  Marked: the main barrel, `contexts`, `form`, `scroll`, and the two shared chunks they
  import. A chunk is marked iff it imports React, or imports a chunk that does.

  Gated: `scripts/check-rsc-directives.mjs` runs from `smoke:consumer` and re-derives the
  rule from the emitted files, in both directions, so neither a missing nor a spurious
  directive can ship again.

## 0.14.0

### Minor Changes

- 22ec2b5: Three shipped guards were dead in every installed copy, baked by our own build.

  Library code read `import.meta.env`, which Vite's library build evaluates at HDS's build
  time rather than the consumer's. It baked to a constant inside `dist/`, so the guards had
  never run for anyone who installed the package:
  - `Icon` never warned about a missing `icon` prop (`import.meta.env.DEV` baked to `false`).
  - `warnOnce` never emitted a deprecation warning (`import.meta.env.PROD` baked to `true`),
    so the whole deprecation channel was silent.
  - `TenantProvider` never wrote `data-brand` / `data-tenant`, because `VITE_TENANT_SLUG` was
    read from HDS's environment and baked to `{}`. It was inert regardless of what a consumer
    set.

  The first two now read `process.env.NODE_ENV`, which consumer bundlers substitute at the
  build that actually knows the answer.

  **Breaking:** `TenantProvider` takes the tenant as a `slug` prop instead of reading an
  environment variable. A library component cannot read its consumer's environment, so there
  is no backwards-compatible version of the old behaviour — but nothing depended on it
  either, since it never worked once installed. Omitting `slug` writes no attribute, which is
  what every existing call site already got.

  ```tsx
  <TenantProvider slug={import.meta.env.VITE_TENANT_SLUG as TenantSlug}>
  ```

  Two standing guards keep the class from returning: `tests/no-shipped-import-meta-env.test.ts`
  fails on any `import.meta.env` reachable from shipped source, including via bracket access
  or destructuring, and `src/lib/env.test.ts` pins the source shape that makes the bundler
  substitution work.

### Patch Changes

- c1561f5: The published types did not resolve for any `node16`/`nodenext` ESM consumer.

  `tsconfig.dts.json` compiles with `moduleResolution: "Node"`, so `tsc` emitted relative
  specifiers the old CommonJS way — `from './app/components/button'`, no extension — into a
  package that declares `"type": "module"`. ESM does not guess extensions, so all 150 of them
  failed to resolve. `attw` reported `InternalResolutionError` against 7 of the 14 entry
  points: `.`, `tokens`, `manifest`, `contexts`, `form`, `brand`, `scroll`.

  In practice a Next.js app, or any `"type": "module"` project on `moduleResolution: node16`,
  installed this package and got broken types for all of it.

  Nothing here could see it. `tsc` typechecks `src/`, every test imports `src/`, and
  `smoke:consumer` proved each subpath _imports_ cleanly — which it does; it is the `.d.ts`
  resolution that was broken. The emitted output is the one artifact nothing read.
  - `scripts/add-dts-extensions.mjs` rewrites each emitted specifier to what it actually
    resolves to (`./button` → `./button.js`, `./context` → `./context/index.js`), and exits 1
    on any specifier that resolves to nothing rather than emitting a path that will fail in
    someone's install. It runs as part of `pnpm build:types`.
  - `scripts/check-published-types.mjs` runs `attw` over the packed tarball from
    `smoke:consumer`, so the regression cannot return. Profile `esm-only`, because this
    package has no CommonJS build and node10 cannot read `exports`; the four CSS subpaths are
    excluded because a stylesheet has no types to resolve.

  Every checked entry point is now green under `node16 (from ESM)` and `bundler`.

## 0.13.1

### Patch Changes

- 68df525: The published `hds-manifest.json` now carries Alert's Figma node URL in `componentSpecs.Alert.figmaUrl`, the single source the repo projects into its README, Storybook and Figma links.
- 5db84a4: Fix Figma mapping drift in the published `hds-manifest.json`. Alert declares its real `tone` axis (`success | danger | warning | info`), not `variant` / `error`. Button's `tone` is now documented. HeadingStack binds `subheading`. Dialog's Title, Description and close toggle bind to its compound parts. Avatar, Card, Divider and TextLockup declare their cva axes.
- f3268b4: **chore(pkg):** the package now declares its own front door. `license` is
  `SEE LICENSE IN NOTICE.md` — the code is MIT (root `LICENSE`), but the embedded
  fonts ship under their own terms, which no single SPDX expression covers — and
  `NOTICE.md` is added to `files` so the published tarball carries those terms.
  `repository`, `homepage`, `bugs` and `keywords` are set, so npm and GitHub link
  back to the repo instead of showing nothing.
- 65a5bf2: **fix(manifest):** `public/hds-manifest.json` no longer fills `figmaLink` with
  `TODO:hds-master:<Name>` placeholders. Each `componentSpecs[]` and `utilities[]`
  entry now carries a real Figma URL or `null`, so tooling can count linked
  components directly. Consumers that treated any non-null `figmaLink`
  as "has a Figma link" now get the right answer.
- 65a5bf2: **fix(tokens):** the generated tenant overlay CSS no longer drops the first
  brand's base rule. Its header comment contained `*/` inside a file glob, which
  closed the comment early and turned the rest of the header into an invalid
  selector prefix for the first `[data-brand]` rule. That brand's light overrides
  now apply.

## 0.13.0

### Minor Changes

- 9e9f19e: **0.13.0 — final clean cut before the shelf.** Rolls up the work merged to `main`
  after 0.12.0 and one bug fix, so the published package matches the shelved repo.
  - **fix(icon):** stop forwarding a token (`var(--primitive-*)`) to Lucide's numeric
    `size` prop, which landed on the SVG `width`/`height` **attribute** and logged a
    console error on every icon render (icons still rendered — the `style` sized them
    — but the console was noisy). Now only a numeric size is forwarded; token sizes
    flow through `style` (valid as CSS). (#123)
  - **feat(styles):** `@hirobius/design-system/static.css` — a CSS-only static-primitive
    layer so a zero-React Astro/HTML page can render `Badge`/`Card`/`Alert`/`Divider`/`Tag`
    via `.hds-*` classes, token-bound and theme-aware. (#64)
  - **docs(scroll):** the llms.txt scroll-driven-sections recipe + golden-path stories
    for the `Reveal`/`Pin`/`useScrollProgress` primitives. (#116)

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

_Releases before 0.5.0 are in git history._
