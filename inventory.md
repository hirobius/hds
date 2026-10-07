# HDS Content Inventory & Migration Map (`inventory.md`)

> **Hand-off Note for Muse / Claude**
>
> - **App Location:** The Fumadocs app now lives in `docs-site/` (hds#506; `pnpm docs:dev`, `pnpm docs:build`) and renders `content/docs/**` directly. It grew out of the proof of concept on branch `origin/claude/docs-poc-fumadocs` (`docs-poc/fumadocs/`, superseded). Content layout is `content/docs/` (e.g. `content/docs/button.mdx`, `content/docs/colors.mdx`, `content/docs/meta.json`). MDX content in this repository should target `content/docs/` to drop directly into the Fumadocs app shell.
> - **npm v0.20.0 Parity & Core Set:** Ground truth for core components is `scripts/lib/core-components.mjs` (43 names: 40 core UI components + 3 providers). The 3 provider components (`HdsRouterProvider`, `HdsThemeProvider`, `ToastProvider`) are grouped into a single shared "Providers & Setup" guide (`content/docs/guides/providers.mdx`). `StatusDot` was deprecated at 0.20.0 and is documented exclusively in `guides/deprecation.mdx`.
> - **Pattern Modules:** The 27 pattern modules encompass composite UI surfaces, layouts, and sub-systems exported from `@hirobius/design-system/patterns`, `@hirobius/design-system/form`, `@hirobius/design-system/scroll`, and `@hirobius/design-system/brand`.
> - **Removed Components:** 32 components were removed outright in v0.20.0 with no survivor (e.g., `AppShell`, `Calendar`, `Carousel`, `SideNav`, `TopNav`, `ContextMenu`, `HoverCard`, `ButtonGroup`, date pickers) and 13 folded into survivors (e.g., `IconButton` -> `Button`, `SelectableCard` -> `Card`, `TileGrid` -> `Grid`). Removed components MUST NOT be documented as live components (only referenced in `guides/deprecation.mdx`).
> - **Storybook Parity Gaps:** Storybook has 71 story files in `src/stories/`. Some stories cover internal/static primitives (`static-primitives.stories.tsx`, `type-specimen.stories.tsx`, `design-parameters.ts`) or obsolete layout patterns (`patterns-client-detail.stories.tsx`, `patterns-layout.stories.tsx`, `patterns-scroll.stories.tsx`). These are flagged below as parity gaps to reconcile before Storybook retirement.
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

| Component Name       | Current Docs-App Route          | Proposed MDX Path                               | Source Type          | Storybook Story                 |
| :------------------- | :------------------------------ | :---------------------------------------------- | :------------------- | :------------------------------ |
| **Alert**            | `/hds/components/feedback`      | `content/docs/components/alert.mdx`             | Docs-App + Storybook | `alert.stories.tsx`             |
| **Avatar**           | `/hds/components/display`       | `content/docs/components/avatar.mdx`            | Docs-App + Storybook | `avatar.stories.tsx`            |
| **Badge**            | `/hds/components/feedback`      | `content/docs/components/badge.mdx`             | Docs-App + Storybook | `badge.stories.tsx`             |
| **Box**              | `/hds/components/layout`        | `content/docs/components/box.mdx`               | Docs-App + Storybook | `box.stories.tsx`               |
| **Breadcrumb**       | `/hds/components/navigation`    | `content/docs/components/breadcrumb.mdx`        | Docs-App + Storybook | `breadcrumb.stories.tsx`        |
| **Button**           | `/hds/components/actions`       | `content/docs/components/button.mdx`            | Docs-App + Storybook | `button.stories.tsx`            |
| **Card**             | `/hds/components/display`       | `content/docs/components/card.mdx`              | Docs-App + Storybook | `card.stories.tsx`              |
| **Checkbox**         | `/hds/components/inputs`        | `content/docs/components/checkbox.mdx`          | Docs-App + Storybook | `checkbox.stories.tsx`          |
| **Combobox**         | `/hds/components/inputs`        | `content/docs/components/combobox.mdx`          | Docs-App + Storybook | `combobox.stories.tsx`          |
| **Container**        | `/hds/components/layout`        | `content/docs/components/container.mdx`         | Docs-App + Storybook | `container.stories.tsx`         |
| **Dialog**           | `/hds/components/overlays`      | `content/docs/components/dialog.mdx`            | Docs-App + Storybook | `dialog.stories.tsx`            |
| **Disclosure**       | `/hds/components/layout`        | `content/docs/components/disclosure.mdx`        | Docs-App + Storybook | `disclosure.stories.tsx`        |
| **Divider**          | `/hds/components/layout`        | `content/docs/components/divider.mdx`           | Docs-App + Storybook | `divider.stories.tsx`           |
| **EmptyState**       | `/hds/components/display`       | `content/docs/components/empty-state.mdx`       | Docs-App + Storybook | `empty-state.stories.tsx`       |
| **Field**            | `/hds/components/display`       | `content/docs/components/field.mdx`             | Docs-App + Storybook | `field.stories.tsx`             |
| **Grid**             | `/hds/components/layout`        | `content/docs/components/grid.mdx`              | Docs-App + Storybook | `grid.stories.tsx`              |
| **Icon**             | `/hds/components/display`       | `content/docs/components/icon.mdx`              | Docs-App + Storybook | `icon.stories.tsx`              |
| **InlineLink**       | `/hds/components/navigation`    | `content/docs/components/inline-link.mdx`       | Docs-App + Storybook | `inline-link.stories.tsx`       |
| **Input**            | `/hds/components/inputs`        | `content/docs/components/input.mdx`             | Docs-App + Storybook | `input.stories.tsx`             |
| **Kbd**              | `/hds/components/display`       | `content/docs/components/kbd.mdx`               | Docs-App + Storybook | `kbd.stories.tsx`               |
| **Menu**             | `/hds/components/overlays`      | `content/docs/components/menu.mdx`              | Docs-App + Storybook | `menu.stories.tsx`              |
| **Pagination**       | `/hds/components/navigation`    | `content/docs/components/pagination.mdx`        | Docs-App + Storybook | `pagination.stories.tsx`        |
| **Popover**          | `/hds/components/overlays`      | `content/docs/components/popover.mdx`           | Docs-App + Storybook | `popover.stories.tsx`           |
| **Progress**         | `/hds/components/feedback`      | `content/docs/components/progress.mdx`          | Docs-App + Storybook | `progress.stories.tsx`          |
| **Radio**            | `/hds/components/inputs`        | `content/docs/components/radio.mdx`             | Docs-App + Storybook | `radio.stories.tsx`             |
| **SegmentedControl** | `/hds/components/inputs`        | `content/docs/components/segmented-control.mdx` | Docs-App + Storybook | `segmented-control.stories.tsx` |
| **Select**           | `/hds/components/inputs`        | `content/docs/components/select.mdx`            | Docs-App + Storybook | `select.stories.tsx`            |
| **Skeleton**         | `/hds/components/feedback`      | `content/docs/components/skeleton.mdx`          | Docs-App + Storybook | `skeleton.stories.tsx`          |
| **Slider**           | `/hds/components/inputs`        | `content/docs/components/slider.mdx`            | Docs-App + Storybook | `slider.stories.tsx`            |
| **Spinner**          | `/hds/components/feedback`      | `content/docs/components/spinner.mdx`           | Docs-App + Storybook | `spinner.stories.tsx`           |
| **Stack**            | `/hds/components/layout`        | `content/docs/components/stack.mdx`             | Docs-App + Storybook | `stack.stories.tsx`             |
| **Surface**          | `/hds/components/layout`        | `content/docs/components/surface.mdx`           | Docs-App + Storybook | `surface.stories.tsx`           |
| **Table**            | `/hds/components/display`       | `content/docs/components/table.mdx`             | Docs-App + Storybook | `table.stories.tsx`             |
| **Tabs**             | `/hds/components/navigation`    | `content/docs/components/tabs.mdx`              | Docs-App + Storybook | `tabs.stories.tsx`              |
| **Tag**              | `/hds/components/inputs`        | `content/docs/components/tag.mdx`               | Docs-App + Storybook | `tag.stories.tsx`               |
| **Text**             | `/hds/typography`               | `content/docs/components/text.mdx`              | Docs-App + Storybook | `text.stories.tsx`              |
| **Textarea**         | `/hds/components/inputs`        | `content/docs/components/textarea.mdx`          | Docs-App + Storybook | `textarea.stories.tsx`          |
| **Toggle**           | `/hds/components/inputs`        | `content/docs/components/toggle.mdx`            | Docs-App + Storybook | `toggle.stories.tsx`            |
| **Tooltip**          | `/hds/components/overlays`      | `content/docs/components/tooltip.mdx`           | Docs-App + Storybook | `hds-tooltip.stories.tsx`       |
| **VisuallyHidden**   | `/hds/components/doc-utilities` | `content/docs/components/visually-hidden.mdx`   | Docs-App + Storybook | `visually-hidden.stories.tsx`   |

---

## 4. Pattern Modules Inventory (27 Pattern Modules)

Composite surfaces, layout section templates, and domain adapters.

| Pattern Name           | Current Docs-App Route     | Proposed MDX Path                               | Source Type          | Storybook Story                   |
| :--------------------- | :------------------------- | :---------------------------------------------- | :------------------- | :-------------------------------- |
| **AlertDialog**        | `/hds/components/overlays` | `content/docs/patterns/alert-dialog.mdx`        | Docs-App + Storybook | `alert-dialog.stories.tsx`        |
| **AssetImg**           | `/hds/components/display`  | `content/docs/patterns/asset-img.mdx`           | Docs-App + Storybook | `asset-img.stories.tsx`           |
| **AvatarGroup**        | `/hds/components/display`  | `content/docs/patterns/avatar-group.mdx`        | Docs-App + Storybook | `avatar-group.stories.tsx`        |
| **Blockquote**         | `/hds/typography`          | `content/docs/patterns/blockquote.mdx`          | Docs-App + Storybook | `blockquote.stories.tsx`          |
| **Callout**            | `/hds/components/feedback` | `content/docs/patterns/callout.mdx`             | Docs-App + Storybook | `callout.stories.tsx`             |
| **CodeBlock**          | `/hds/components/display`  | `content/docs/patterns/code-block.mdx`          | Docs-App + Storybook | `code-block.stories.tsx`          |
| **DataTableSection**   | `/hds/components/display`  | `content/docs/patterns/data-table-section.mdx`  | Docs-App + Storybook | `data-table-section.stories.tsx`  |
| **DestructiveSection** | `/hds/components/actions`  | `content/docs/patterns/destructive-section.mdx` | Docs-App + Storybook | `destructive-section.stories.tsx` |
| **ErrorPattern**       | `/hds/components/feedback` | `content/docs/patterns/error-pattern.mdx`       | Docs-App + Storybook | `error-pattern.stories.tsx`       |
| **Form**               | `/hds/components/inputs`   | `content/docs/patterns/form.mdx`                | Docs-App + Storybook | `form.stories.tsx`                |
| **FormActions**        | `/hds/components/actions`  | `content/docs/patterns/form-actions.mdx`        | Docs-App + Storybook | `form-actions.stories.tsx`        |
| **HdsForm Adapter**    | `/hds/components/inputs`   | `content/docs/patterns/hds-form.mdx`            | TS Source            | N/A (Adapter)                     |
| **InlineCode**         | `/hds/components/display`  | `content/docs/patterns/inline-code.mdx`         | Docs-App + Storybook | `inline-code.stories.tsx`         |
| **MetadataList**       | `/hds/components/display`  | `content/docs/patterns/metadata-list.mdx`       | Docs-App + Storybook | `metadata-list.stories.tsx`       |
| **MetricTiles**        | `/hds/components/display`  | `content/docs/patterns/metric-tiles.mdx`        | Docs-App + Storybook | `metric-tiles.stories.tsx`        |
| **Page**               | `/hds/components/layout`   | `content/docs/patterns/page.mdx`                | Docs-App + Storybook | `page.stories.tsx`                |
| **PageHeader**         | `/hds/components/layout`   | `content/docs/patterns/page-header.mdx`         | Docs-App + Storybook | `page-header.stories.tsx`         |
| **Pin**                | `/hds/components/layout`   | `content/docs/patterns/pin.mdx`                 | Docs-App + Storybook | `pin.stories.tsx`                 |
| **Reveal**             | `/hds/motion`              | `content/docs/patterns/reveal.mdx`              | Docs-App + Storybook | `reveal.stories.tsx`              |
| **Scroll Motion**      | `/hds/motion`              | `content/docs/patterns/scroll.mdx`              | Docs-App + Storybook | `patterns-scroll.stories.tsx`     |
| **Sidebar**            | `/hds/components/layout`   | `content/docs/patterns/sidebar.mdx`             | Docs-App + Storybook | `sidebar.stories.tsx`             |
| **Stat**               | `/hds/components/display`  | `content/docs/patterns/stat.mdx`                | Docs-App + Storybook | `stat.stories.tsx`                |
| **StatusListItem**     | `/hds/components/display`  | `content/docs/patterns/status-list-item.mdx`    | Docs-App + Storybook | `status-list-item.stories.tsx`    |
| **StatusTile**         | `/hds/components/display`  | `content/docs/patterns/status-tile.mdx`         | Docs-App + Storybook | `status-tile.stories.tsx`         |
| **Switcher**           | `/hds/components/layout`   | `content/docs/patterns/switcher.mdx`            | Docs-App + Storybook | `switcher.stories.tsx`            |
| **Timestamp**          | `/hds/components/display`  | `content/docs/patterns/timestamp.mdx`           | Docs-App + Storybook | `timestamp.stories.tsx`           |
| **Toast Surface**      | `/hds/components/feedback` | `content/docs/patterns/toast.mdx`               | Docs-App + Storybook | `toast.stories.tsx`               |

---

## 5. Guides Inventory

| Guide Title                | Proposed MDX Path                         | Description                                                                                                                       |
| :------------------------- | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Getting Started**        | `content/docs/guides/getting-started.mdx` | Installation, setup, first component, and router integration.                                                                     |
| **Providers & Setup**      | `content/docs/guides/providers.mdx`       | Consolidated setup guide covering `HdsThemeProvider`, `HdsRouterProvider`, and `ToastProvider`.                                   |
| **Tokens & Architecture**  | `content/docs/guides/tokens.mdx`          | Token pipeline (DTCG -> CSS/TS/Figma), 3-tier architecture, theme dials.                                                          |
| **Upgrade Path**           | `content/docs/guides/upgrade.mdx`         | Versioning policy, running release codemods, breaking-change windows.                                                             |
| **Deprecation & Removals** | `content/docs/guides/deprecation.mdx`     | Documenting the 46 deprecated components (including `StatusDot`), 32 removed 0.20 components, replacements, and removal timeline. |

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

1. **Storybook-Only / Non-Component Stories:**
   - `static-primitives.stories.tsx`, `type-specimen.stories.tsx`, `design-parameters.ts` — internal design specimens. Folded into Foundation docs.
   - `patterns-client-detail.stories.tsx`, `patterns-layout.stories.tsx`, `patterns-scroll.stories.tsx` — portfolio-specific mock pages. Excluded from core component docs.
2. **Deprecated Component Routing:**
   - `StatusDot` is deprecated at v0.20.0 (use `<Badge dot>`) and is routed to `guides/deprecation.mdx` rather than having a live component page.
3. **Docs App Route Coverage:**
   - Current custom docs app routes under `/hds/` mapped 1:1 to Fumadocs `content/docs/` hierarchy.
