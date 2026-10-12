> **Archived 2026-10-12 (hds#612).** This is history, not current state: a stale component inventory; the live one is public/hds-manifest.json. Paths and numbers below are not kept up to date.

# HDS Content Inventory & Migration Map (`inventory.md`)

> **Hand-off Note for Muse / Claude**
>
> - **App Location:** The Fumadocs app now lives in `docs-site/` (hds#506; `pnpm docs:dev`, `pnpm docs:build`) and renders `content/docs/**` directly. It grew out of the proof of concept on branch `origin/claude/docs-poc-fumadocs` (`docs-poc/fumadocs/`, superseded). Content layout is `content/docs/` (e.g. `content/docs/button.mdx`, `content/docs/colors.mdx`, `content/docs/meta.json`). MDX content in this repository should target `content/docs/` to drop directly into the Fumadocs app shell.
> - **npm v0.20.0 Parity & Core Set:** Ground truth for core components is `scripts/lib/core-components.mjs` (43 names: 40 core UI components + 3 providers). The 3 provider components (`HdsRouterProvider`, `HdsThemeProvider`, `ToastProvider`) are grouped into a single shared "Providers & Setup" guide (`content/docs/guides/providers.mdx`). `StatusDot` was deprecated at 0.20.0 and is documented exclusively in `guides/deprecation.mdx`.
> - **Pattern Modules:** The 27 pattern modules encompass composite UI surfaces, layouts, and sub-systems exported from `@hirobius/design-system/patterns`, `@hirobius/design-system/form`, `@hirobius/design-system/scroll`, and `@hirobius/design-system/brand`.
> - **Removed Components:** 32 components were removed outright in v0.20.0 with no survivor (e.g., `AppShell`, `Calendar`, `Carousel`, `SideNav`, `TopNav`, `ContextMenu`, `HoverCard`, `ButtonGroup`, date pickers) and 13 folded into survivors (e.g., `IconButton` -> `Button`, `SelectableCard` -> `Card`, `TileGrid` -> `Grid`). Removed components MUST NOT be documented as live components (only referenced in `guides/deprecation.mdx`).
> - **Generated Token Rule:** Token tables and swatch maps in foundations (Color, Typography, Spacing, Motion) are **generated at build time**. MDX sources must use generated markers (`{/* generated: tokens */}`) rather than hardcoded hex or pixel values.
> - **No Invented Props Rule:** All prop tables are transcribed from `src/app/data/component-api.json` or component TypeScript interfaces. Where specs are missing, `{/* props: TODO — source missing */}` is left.

---

## 1. Content Layout Structure

The proposed Fumadocs `content/docs/` layout structure:

```
content/docs/
├── foundations/
│   ├── color.mdx
│   ├── typography.mdx
│   ├── spacing.mdx
│   └── motion.mdx
├── components/
│   ├── alert.mdx
│   ├── avatar.mdx
│   ├── badge.mdx
│   ├── box.mdx
│   ├── breadcrumb.mdx
│   ├── button.mdx
│   ├── card.mdx
│   ├── checkbox.mdx
│   ├── combobox.mdx
│   ├── container.mdx
│   ├── dialog.mdx
│   ├── disclosure.mdx
│   ├── divider.mdx
│   ├── empty-state.mdx
│   ├── field.mdx
│   ├── grid.mdx
│   ├── icon.mdx
│   ├── inline-link.mdx
│   ├── input.mdx
│   ├── kbd.mdx
│   ├── menu.mdx
│   ├── pagination.mdx
│   ├── popover.mdx
│   ├── progress.mdx
│   ├── radio.mdx
│   ├── segmented-control.mdx
│   ├── select.mdx
│   ├── skeleton.mdx
│   ├── slider.mdx
│   ├── spinner.mdx
│   ├── stack.mdx
│   ├── surface.mdx
│   ├── table.mdx
│   ├── tabs.mdx
│   ├── tag.mdx
│   ├── text.mdx
│   ├── textarea.mdx
│   ├── toggle.mdx
│   ├── tooltip.mdx
│   └── visually-hidden.mdx
├── patterns/
│   ├── alert-dialog.mdx
│   ├── asset-img.mdx
│   ├── avatar-group.mdx
│   ├── blockquote.mdx
│   ├── callout.mdx
│   ├── code-block.mdx
│   ├── data-table-section.mdx
│   ├── destructive-section.mdx
│   ├── error-pattern.mdx
│   ├── form-actions.mdx
│   ├── form.mdx
│   ├── hds-form.mdx
│   ├── inline-code.mdx
│   ├── metadata-list.mdx
│   ├── metric-tiles.mdx
│   ├── page-header.mdx
│   ├── page.mdx
│   ├── pin.mdx
│   ├── reveal.mdx
│   ├── scroll.mdx
│   ├── sidebar.mdx
│   ├── stat.mdx
│   ├── status-list-item.mdx
│   ├── status-tile.mdx
│   ├── switcher.mdx
│   ├── timestamp.mdx
│   └── toast.mdx
└── guides/
    ├── getting-started.mdx
    ├── providers.mdx
    ├── tokens.mdx
    ├── upgrade.mdx
    └── deprecation.mdx
```

---

## 2. Foundations Inventory

| Current Docs Route | Proposed MDX Path                         | Source Type              | Notes                                                |
| :----------------- | :---------------------------------------- | :----------------------- | :--------------------------------------------------- |
| `/hds/color`       | `content/docs/foundations/color.mdx`      | Generated + Hand-written | Swatch grids generated from `hirobius.tokens.json`.  |
| `/hds/typography`  | `content/docs/foundations/typography.mdx` | Generated + Hand-written | Type ramp generated from `hirobius.tokens.json`.     |
| `/hds/spacing`     | `content/docs/foundations/spacing.mdx`    | Generated + Hand-written | Spacing scale generated from `hirobius.tokens.json`. |
| `/hds/motion`      | `content/docs/foundations/motion.mdx`     | Generated + Hand-written | Motion duration/easing tokens generated.             |

---

## 3. Core Components Inventory (40 Core UI Components)

Ground truth = `scripts/lib/core-components.mjs` (40 core UI components + 3 providers mapped to `guides/providers.mdx`).

| Component Name       | Current Docs-App Route          | Proposed MDX Path                               | Source Type |
| :------------------- | :------------------------------ | :---------------------------------------------- | ----------- |
| **Alert**            | `/hds/components/feedback`      | `content/docs/components/alert.mdx`             | Docs-App    |
| **Avatar**           | `/hds/components/display`       | `content/docs/components/avatar.mdx`            | Docs-App    |
| **Badge**            | `/hds/components/feedback`      | `content/docs/components/badge.mdx`             | Docs-App    |
| **Box**              | `/hds/components/layout`        | `content/docs/components/box.mdx`               | Docs-App    |
| **Breadcrumb**       | `/hds/components/navigation`    | `content/docs/components/breadcrumb.mdx`        | Docs-App    |
| **Button**           | `/hds/components/actions`       | `content/docs/components/button.mdx`            | Docs-App    |
| **Card**             | `/hds/components/display`       | `content/docs/components/card.mdx`              | Docs-App    |
| **Checkbox**         | `/hds/components/inputs`        | `content/docs/components/checkbox.mdx`          | Docs-App    |
| **Combobox**         | `/hds/components/inputs`        | `content/docs/components/combobox.mdx`          | Docs-App    |
| **Container**        | `/hds/components/layout`        | `content/docs/components/container.mdx`         | Docs-App    |
| **Dialog**           | `/hds/components/overlays`      | `content/docs/components/dialog.mdx`            | Docs-App    |
| **Disclosure**       | `/hds/components/layout`        | `content/docs/components/disclosure.mdx`        | Docs-App    |
| **Divider**          | `/hds/components/layout`        | `content/docs/components/divider.mdx`           | Docs-App    |
| **EmptyState**       | `/hds/components/display`       | `content/docs/components/empty-state.mdx`       | Docs-App    |
| **Field**            | `/hds/components/display`       | `content/docs/components/field.mdx`             | Docs-App    |
| **Grid**             | `/hds/components/layout`        | `content/docs/components/grid.mdx`              | Docs-App    |
| **Icon**             | `/hds/components/display`       | `content/docs/components/icon.mdx`              | Docs-App    |
| **InlineLink**       | `/hds/components/navigation`    | `content/docs/components/inline-link.mdx`       | Docs-App    |
| **Input**            | `/hds/components/inputs`        | `content/docs/components/input.mdx`             | Docs-App    |
| **Kbd**              | `/hds/components/display`       | `content/docs/components/kbd.mdx`               | Docs-App    |
| **Menu**             | `/hds/components/overlays`      | `content/docs/components/menu.mdx`              | Docs-App    |
| **Pagination**       | `/hds/components/navigation`    | `content/docs/components/pagination.mdx`        | Docs-App    |
| **Popover**          | `/hds/components/overlays`      | `content/docs/components/popover.mdx`           | Docs-App    |
| **Progress**         | `/hds/components/feedback`      | `content/docs/components/progress.mdx`          | Docs-App    |
| **Radio**            | `/hds/components/inputs`        | `content/docs/components/radio.mdx`             | Docs-App    |
| **SegmentedControl** | `/hds/components/inputs`        | `content/docs/components/segmented-control.mdx` | Docs-App    |
| **Select**           | `/hds/components/inputs`        | `content/docs/components/select.mdx`            | Docs-App    |
| **Skeleton**         | `/hds/components/feedback`      | `content/docs/components/skeleton.mdx`          | Docs-App    |
| **Slider**           | `/hds/components/inputs`        | `content/docs/components/slider.mdx`            | Docs-App    |
| **Spinner**          | `/hds/components/feedback`      | `content/docs/components/spinner.mdx`           | Docs-App    |
| **Stack**            | `/hds/components/layout`        | `content/docs/components/stack.mdx`             | Docs-App    |
| **Surface**          | `/hds/components/layout`        | `content/docs/components/surface.mdx`           | Docs-App    |
| **Table**            | `/hds/components/display`       | `content/docs/components/table.mdx`             | Docs-App    |
| **Tabs**             | `/hds/components/navigation`    | `content/docs/components/tabs.mdx`              | Docs-App    |
| **Tag**              | `/hds/components/inputs`        | `content/docs/components/tag.mdx`               | Docs-App    |
| **Text**             | `/hds/typography`               | `content/docs/components/text.mdx`              | Docs-App    |
| **Textarea**         | `/hds/components/inputs`        | `content/docs/components/textarea.mdx`          | Docs-App    |
| **Toggle**           | `/hds/components/inputs`        | `content/docs/components/toggle.mdx`            | Docs-App    |
| **Tooltip**          | `/hds/components/overlays`      | `content/docs/components/tooltip.mdx`           | Docs-App    |
| **VisuallyHidden**   | `/hds/components/doc-utilities` | `content/docs/components/visually-hidden.mdx`   | Docs-App    |

---

## 4. Pattern Modules Inventory (27 Pattern Modules)

Composite surfaces, layout section templates, and domain adapters.

| Pattern Name           | Current Docs-App Route     | Proposed MDX Path                               | Source Type |
| :--------------------- | :------------------------- | :---------------------------------------------- | ----------- | ------------- |
| **AlertDialog**        | `/hds/components/overlays` | `content/docs/patterns/alert-dialog.mdx`        | Docs-App    |
| **AssetImg**           | `/hds/components/display`  | `content/docs/patterns/asset-img.mdx`           | Docs-App    |
| **AvatarGroup**        | `/hds/components/display`  | `content/docs/patterns/avatar-group.mdx`        | Docs-App    |
| **Blockquote**         | `/hds/typography`          | `content/docs/patterns/blockquote.mdx`          | Docs-App    |
| **Callout**            | `/hds/components/feedback` | `content/docs/patterns/callout.mdx`             | Docs-App    |
| **CodeBlock**          | `/hds/components/display`  | `content/docs/patterns/code-block.mdx`          | Docs-App    |
| **DataTableSection**   | `/hds/components/display`  | `content/docs/patterns/data-table-section.mdx`  | Docs-App    |
| **DestructiveSection** | `/hds/components/actions`  | `content/docs/patterns/destructive-section.mdx` | Docs-App    |
| **ErrorPattern**       | `/hds/components/feedback` | `content/docs/patterns/error-pattern.mdx`       | Docs-App    |
| **Form**               | `/hds/components/inputs`   | `content/docs/patterns/form.mdx`                | Docs-App    |
| **FormActions**        | `/hds/components/actions`  | `content/docs/patterns/form-actions.mdx`        | Docs-App    |
| **HdsForm Adapter**    | `/hds/components/inputs`   | `content/docs/patterns/hds-form.mdx`            | TS Source   | N/A (Adapter) |
| **InlineCode**         | `/hds/components/display`  | `content/docs/patterns/inline-code.mdx`         | Docs-App    |
| **MetadataList**       | `/hds/components/display`  | `content/docs/patterns/metadata-list.mdx`       | Docs-App    |
| **MetricTiles**        | `/hds/components/display`  | `content/docs/patterns/metric-tiles.mdx`        | Docs-App    |
| **Page**               | `/hds/components/layout`   | `content/docs/patterns/page.mdx`                | Docs-App    |
| **PageHeader**         | `/hds/components/layout`   | `content/docs/patterns/page-header.mdx`         | Docs-App    |
| **Pin**                | `/hds/components/layout`   | `content/docs/patterns/pin.mdx`                 | Docs-App    |
| **Reveal**             | `/hds/motion`              | `content/docs/patterns/reveal.mdx`              | Docs-App    |
| **Scroll Motion**      | `/hds/motion`              | `content/docs/patterns/scroll.mdx`              | Docs-App    |
| **Sidebar**            | `/hds/components/layout`   | `content/docs/patterns/sidebar.mdx`             | Docs-App    |
| **Stat**               | `/hds/components/display`  | `content/docs/patterns/stat.mdx`                | Docs-App    |
| **StatusListItem**     | `/hds/components/display`  | `content/docs/patterns/status-list-item.mdx`    | Docs-App    |
| **StatusTile**         | `/hds/components/display`  | `content/docs/patterns/status-tile.mdx`         | Docs-App    |
| **Switcher**           | `/hds/components/layout`   | `content/docs/patterns/switcher.mdx`            | Docs-App    |
| **Timestamp**          | `/hds/components/display`  | `content/docs/patterns/timestamp.mdx`           | Docs-App    |
| **Toast Surface**      | `/hds/components/feedback` | `content/docs/patterns/toast.mdx`               | Docs-App    |

---

## 5. Guides Inventory

| Guide Title                | Proposed MDX Path                         | Description                                                                                                                                   |
| :------------------------- | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Getting Started**        | `content/docs/guides/getting-started.mdx` | Installation, setup, first component, and router integration.                                                                                 |
| **Providers & Setup**      | `content/docs/guides/providers.mdx`       | Consolidated setup guide covering `HdsThemeProvider`, `HdsRouterProvider`, and `ToastProvider`.                                               |
| **Tokens & Architecture**  | `content/docs/guides/tokens.mdx`          | Token pipeline (DTCG -> CSS/TS/Figma), 3-tier architecture, theme dials.                                                                      |
| **Upgrade Path**           | `content/docs/guides/upgrade.mdx`         | Versioning policy, running release codemods, breaking-change windows.                                                                         |
| **Deprecation & Removals** | `content/docs/guides/deprecation.mdx`     | Documenting the 46 deprecated components (`StatusDot` was removed in 0.21.0), 32 removed 0.20 components, replacements, and removal timeline. |

---

## 6. Removed Components (Exactly 32 Excluded from Component Docs)

These 32 components were removed in v0.20.0 with no survivor and MUST NOT have live component doc pages. They are documented strictly in `guides/deprecation.mdx`:

1. `ActivityFeed`
2. `AppShell`
3. `ButtonGroup`
4. `Calendar`
5. `Carousel`
6. `CinematicLink`
7. `CommandPalette`
8. `ComponentInstanceMatrix`
9. `ContextMenu`
10. `DateInput`
11. `DateRangeInput`
12. `DateTimeInput`
13. `DocLinkCard`
14. `ErrorBoundary`
15. `FileInput`
16. `FoundationSwatch`
17. `HeadingStack`
18. `HistoryCard`
19. `HoverCard`
20. `Lightbox`
21. `NavGroup`
22. `NavItem`
23. `OverflowList`
24. `SideNav`
25. `Sketch`
26. `StackedCardRail`
27. `Stepper`
28. `StepperField`
29. `TextLockup`
30. `Token`
31. `Tokenizer`
32. `Toolbar` (along with `TopNav` & `TreeList` docs-shell helpers)

---

## 7. Parity Gaps & Reconciliation Notes

1. **Deprecated Component Routing:**
   - `StatusDot` was removed in v0.21.0 (use `<Badge dot>`) and is covered in `guides/deprecation.mdx`, with no component page.
2. **Docs App Route Coverage:**
   - Current custom docs app routes under `/hds/` mapped 1:1 to Fumadocs `content/docs/` hierarchy.
