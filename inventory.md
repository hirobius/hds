# HDS Content Inventory & Migration Map (`inventory.md`)

> **Hand-off Note for Muse / Claude**
> - **POC Location:** Located in branch `origin/claude/docs-poc-fumadocs` under `docs-poc/fumadocs/`. Content layout is `content/docs/` (e.g. `content/docs/button.mdx`, `content/docs/colors.mdx`, `content/docs/meta.json`). MDX content in this repository should target `content/docs/` to drop directly into the Fumadocs app shell.
> - **npm v0.20.0 Parity & Core Set:** The ratified core consists of 42 core component pages + 27 pattern module pages. 32 components were removed outright in v0.20.0 (e.g., `AppShell`, `Calendar`, `Carousel`, `SideNav`, `TopNav`, `ContextMenu`, `HoverCard`, `ButtonGroup`, date pickers) and 13 folded into survivors (e.g., `IconButton` -> `Button`, `SelectableCard` -> `Card`, `TileGrid` -> `Grid`). Removed components MUST NOT be documented as live components (only referenced in `guides/deprecation.mdx`).
> - **Storybook Parity Gaps:** Storybook has 71 story files in `src/stories/`. Some stories cover internal/static primitives (`static-primitives.stories.tsx`, `type-specimen.stories.tsx`, `design-parameters.ts`) or obsolete layout patterns (`patterns-client-detail.stories.tsx`, `patterns-layout.stories.tsx`, `patterns-scroll.stories.tsx`). These are flagged below as parity gaps to reconcile before Storybook retirement.
> - **Generated Token Rule:** Token tables and swatch maps in foundations (Color, Typography, Spacing, Motion) are **generated at build time**. MDX sources must use generated markers (`{/* generated: tokens */}`) rather than hardcoded hex or pixel values.
> - **No Invented Props Rule:** All prop tables are transcribed from `src/app/data/component-api.json` or component TypeScript interfaces. Where specs are missing, `/* props: TODO — source missing */` is left.

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
│   ├── alert-dialog.mdx
│   ├── alert.mdx
│   ├── avatar-group.mdx
│   ├── avatar.mdx
│   ├── badge.mdx
│   ├── blockquote.mdx
│   ├── box.mdx
│   ├── button.mdx
│   ├── callout.mdx
│   ├── card.mdx
│   ├── checkbox.mdx
│   ├── container.mdx
│   ├── dialog.mdx
│   ├── divider.mdx
│   ├── field.mdx
│   ├── grid.mdx
│   ├── icon.mdx
│   ├── inline-code.mdx
│   ├── inline-link.mdx
│   ├── input.mdx
│   ├── kbd.mdx
│   ├── menu.mdx
│   ├── popover.mdx
│   ├── progress.mdx
│   ├── radio.mdx
│   ├── segmented-control.mdx
│   ├── select.mdx
│   ├── sidebar.mdx
│   ├── skeleton.mdx
│   ├── slider.mdx
│   ├── spinner.mdx
│   ├── stack.mdx
│   ├── stat.mdx
│   ├── status-dot.mdx
│   ├── status-list-item.mdx
│   ├── surface.mdx
│   ├── switcher.mdx
│   ├── table.mdx
│   ├── tag.mdx
│   ├── text.mdx
│   ├── textarea.mdx
│   ├── tooltip.mdx
│   └── visually-hidden.mdx
├── patterns/
│   ├── asset-img.mdx
│   ├── breadcrumb.mdx
│   ├── code-block.mdx
│   ├── combobox.mdx
│   ├── data-table-section.mdx
│   ├── destructive-section.mdx
│   ├── disclosure.mdx
│   ├── empty-state.mdx
│   ├── error-pattern.mdx
│   ├── form-actions.mdx
│   ├── form.mdx
│   ├── metadata-list.mdx
│   ├── metric-tiles.mdx
│   ├── page-header.mdx
│   ├── page.mdx
│   ├── pagination.mdx
│   ├── pin.mdx
│   ├── reveal.mdx
│   ├── status-tile.mdx
│   ├── tabs.mdx
│   ├── timestamp.mdx
│   ├── toast.mdx
│   └── toggle.mdx
└── guides/
    ├── getting-started.mdx
    ├── tokens.mdx
    ├── upgrade.mdx
    └── deprecation.mdx
```

---

## 2. Foundations Inventory

| Current Docs Route / Subject | Proposed MDX Path | Source Type | Notes |
| :--- | :--- | :--- | :--- |
| `/hds/color` | `content/docs/foundations/color.mdx` | Generated + Hand-written | Swatch grids generated from `hirobius.tokens.json`. |
| `/hds/typography` | `content/docs/foundations/typography.mdx` | Generated + Hand-written | Type ramp generated from `hirobius.tokens.json`. |
| `/hds/spacing` | `content/docs/foundations/spacing.mdx` | Generated + Hand-written | Spacing scale generated from `hirobius.tokens.json`. |
| `/hds/motion` | `content/docs/foundations/motion.mdx` | Generated + Hand-written | Motion duration/easing tokens generated. |

---

## 3. Core Components Inventory (42 Core Pages)

| Component Name | Current Docs / Spec Source | Proposed MDX Path | Source Type | Storybook Story |
| :--- | :--- | :--- | :--- | :--- |
| **Alert** | `src/app/components/alert.tsx` | `content/docs/components/alert.mdx` | TSX + Storybook | `alert.stories.tsx` |
| **AlertDialog** | `src/app/components/alert-dialog.tsx` | `content/docs/components/alert-dialog.mdx` | TSX + Storybook | `alert-dialog.stories.tsx` |
| **Avatar** | `src/app/components/avatar.tsx` | `content/docs/components/avatar.mdx` | TSX + Storybook | `avatar.stories.tsx` |
| **AvatarGroup** | `src/app/components/avatar-group.tsx` | `content/docs/components/avatar-group.mdx` | TSX + Storybook | `avatar-group.stories.tsx` |
| **Badge** | `src/app/components/badge.tsx` | `content/docs/components/badge.mdx` | TSX + Storybook | `badge.stories.tsx` |
| **Blockquote** | `src/app/components/blockquote.tsx` | `content/docs/components/blockquote.mdx` | TSX + Storybook | `blockquote.stories.tsx` |
| **Box** | `src/app/components/box.tsx` | `content/docs/components/box.mdx` | TSX + Storybook | `box.stories.tsx` |
| **Button** | `src/app/components/button.tsx` | `content/docs/components/button.mdx` | TSX + Storybook | `button.stories.tsx` |
| **Callout** | `src/app/components/callout.tsx` | `content/docs/components/callout.mdx` | TSX + Storybook | `callout.stories.tsx` |
| **Card** | `src/app/components/card.tsx` | `content/docs/components/card.mdx` | TSX + Storybook | `card.stories.tsx` |
| **Checkbox** | `src/app/components/checkbox.tsx` | `content/docs/components/checkbox.mdx` | TSX + Storybook | `checkbox.stories.tsx` |
| **Container** | `src/app/components/container.tsx` | `content/docs/components/container.mdx` | TSX + Storybook | `container.stories.tsx` |
| **Dialog** | `src/app/components/dialog.tsx` | `content/docs/components/dialog.mdx` | TSX + Storybook | `dialog.stories.tsx` |
| **Divider** | `src/app/components/divider.tsx` | `content/docs/components/divider.mdx` | TSX + Storybook | `divider.stories.tsx` |
| **Field** | `src/app/components/field.tsx` | `content/docs/components/field.mdx` | TSX + Storybook | `field.stories.tsx` |
| **Grid** | `src/app/components/grid.tsx` | `content/docs/components/grid.mdx` | TSX + Storybook | `grid.stories.tsx` |
| **Icon** | `src/app/components/icon.tsx` | `content/docs/components/icon.mdx` | TSX + Storybook | `icon.stories.tsx` |
| **InlineCode** | `src/app/components/inline-code.tsx` | `content/docs/components/inline-code.mdx` | TSX + Storybook | `inline-code.stories.tsx` |
| **InlineLink** | `src/app/components/inline-link.tsx` | `content/docs/components/inline-link.mdx` | TSX + Storybook | `inline-link.stories.tsx` |
| **Input** | `src/app/components/input.tsx` | `content/docs/components/input.mdx` | TSX + Storybook | `input.stories.tsx` |
| **Kbd** | `src/app/components/kbd.tsx` | `content/docs/components/kbd.mdx` | TSX + Storybook | `kbd.stories.tsx` |
| **Menu** | `src/app/components/menu.tsx` | `content/docs/components/menu.mdx` | TSX + Storybook | `menu.stories.tsx` |
| **Popover** | `src/app/components/popover.tsx` | `content/docs/components/popover.mdx` | TSX + Storybook | `popover.stories.tsx` |
| **Progress** | `src/app/components/progress.tsx` | `content/docs/components/progress.mdx` | TSX + Storybook | `progress.stories.tsx` |
| **Radio** | `src/app/components/radio.tsx` | `content/docs/components/radio.mdx` | TSX + Storybook | `radio.stories.tsx` |
| **SegmentedControl** | `src/app/components/segmented-control.tsx` | `content/docs/components/segmented-control.mdx` | TSX + Storybook | `segmented-control.stories.tsx` |
| **Select** | `src/app/components/select.tsx` | `content/docs/components/select.mdx` | TSX + Storybook | `select.stories.tsx` |
| **Sidebar** | `src/app/components/sidebar.tsx` | `content/docs/components/sidebar.mdx` | TSX + Storybook | `sidebar.stories.tsx` |
| **Skeleton** | `src/app/components/skeleton.tsx` | `content/docs/components/skeleton.mdx` | TSX + Storybook | `skeleton.stories.tsx` |
| **Slider** | `src/app/components/slider.tsx` | `content/docs/components/slider.mdx` | TSX + Storybook | `slider.stories.tsx` |
| **Spinner** | `src/app/components/spinner.tsx` | `content/docs/components/spinner.mdx` | TSX + Storybook | `spinner.stories.tsx` |
| **Stack** | `src/app/components/stack.tsx` | `content/docs/components/stack.mdx` | TSX + Storybook | `stack.stories.tsx` |
| **Stat** | `src/app/components/stat.tsx` | `content/docs/components/stat.mdx` | TSX + Storybook | `stat.stories.tsx` |
| **StatusDot** | `src/app/components/status-dot.tsx` | `content/docs/components/status-dot.mdx` | TSX + Storybook | `status-dot.stories.tsx` |
| **StatusListItem** | `src/app/components/status-list-item.tsx` | `content/docs/components/status-list-item.mdx` | TSX + Storybook | `status-list-item.stories.tsx` |
| **Surface** | `src/app/components/surface.tsx` | `content/docs/components/surface.mdx` | TSX + Storybook | `surface.stories.tsx` |
| **Switcher** | `src/app/components/switcher.tsx` | `content/docs/components/switcher.mdx` | TSX + Storybook | `switcher.stories.tsx` |
| **Table** | `src/app/components/table.tsx` | `content/docs/components/table.mdx` | TSX + Storybook | `table.stories.tsx` |
| **Tag** | `src/app/components/tag.tsx` | `content/docs/components/tag.mdx` | TSX + Storybook | `tag.stories.tsx` |
| **Text** | `src/app/components/text.tsx` | `content/docs/components/text.mdx` | TSX + Storybook | `text.stories.tsx` |
| **Textarea** | `src/app/components/textarea.tsx` | `content/docs/components/textarea.mdx` | TSX + Storybook | `textarea.stories.tsx` |
| **Tooltip** | `src/app/components/hds-tooltip.tsx` | `content/docs/components/tooltip.mdx` | TSX + Storybook | `hds-tooltip.stories.tsx` |
| **VisuallyHidden** | `src/app/components/visually-hidden.tsx` | `content/docs/components/visually-hidden.mdx` | TSX + Storybook | `visually-hidden.stories.tsx` |

---

## 4. Pattern Modules Inventory (27 Pattern Modules)

| Pattern Name | Source Location | Proposed MDX Path | Source Type | Storybook Story |
| :--- | :--- | :--- | :--- | :--- |
| **AssetImg** | `src/app/components/asset-img.tsx` | `content/docs/patterns/asset-img.mdx` | TSX + Storybook | `asset-img.stories.tsx` |
| **Breadcrumb** | `src/app/components/breadcrumb.tsx` | `content/docs/patterns/breadcrumb.mdx` | TSX + Storybook | `breadcrumb.stories.tsx` |
| **CodeBlock** | `src/app/components/code-block.tsx` | `content/docs/patterns/code-block.mdx` | TSX + Storybook | `code-block.stories.tsx` |
| **Combobox** | `src/app/components/combobox.tsx` | `content/docs/patterns/combobox.mdx` | TSX + Storybook | `combobox.stories.tsx` |
| **DataTableSection** | `src/app/components/data-table-section.tsx` | `content/docs/patterns/data-table-section.mdx` | TSX + Storybook | `data-table-section.stories.tsx` |
| **DestructiveSection** | `src/app/components/destructive-section.tsx` | `content/docs/patterns/destructive-section.mdx` | TSX + Storybook | `destructive-section.stories.tsx` |
| **Disclosure** | `src/app/components/disclosure.tsx` | `content/docs/patterns/disclosure.mdx` | TSX + Storybook | `disclosure.stories.tsx` |
| **EmptyState** | `src/app/components/empty-state.tsx` | `content/docs/patterns/empty-state.mdx` | TSX + Storybook | `empty-state.stories.tsx` |
| **ErrorPattern** | `src/app/components/error-pattern.tsx` | `content/docs/patterns/error-pattern.mdx` | TSX + Storybook | `error-pattern.stories.tsx` |
| **Form** | `src/app/components/form.tsx` | `content/docs/patterns/form.mdx` | TSX + Storybook | `form.stories.tsx` |
| **FormActions** | `src/app/components/form-actions.tsx` | `content/docs/patterns/form-actions.mdx` | TSX + Storybook | `form-actions.stories.tsx` |
| **MetadataList** | `src/app/components/metadata-list.tsx` | `content/docs/patterns/metadata-list.mdx` | TSX + Storybook | `metadata-list.stories.tsx` |
| **MetricTiles** | `src/app/components/metric-tiles.tsx` | `content/docs/patterns/metric-tiles.mdx` | TSX + Storybook | `metric-tiles.stories.tsx` |
| **Page** | `src/app/components/page.tsx` | `content/docs/patterns/page.mdx` | TSX + Storybook | `page.stories.tsx` |
| **PageHeader** | `src/app/components/page-header.tsx` | `content/docs/patterns/page-header.mdx` | TSX + Storybook | `page-header.stories.tsx` |
| **Pagination** | `src/app/components/pagination.tsx` | `content/docs/patterns/pagination.mdx` | TSX + Storybook | `pagination.stories.tsx` |
| **Pin** | `src/app/components/pin.tsx` | `content/docs/patterns/pin.mdx` | TSX + Storybook | `pin.stories.tsx` |
| **Reveal** | `src/app/components/reveal.tsx` | `content/docs/patterns/reveal.mdx` | TSX + Storybook | `reveal.stories.tsx` |
| **StatusTile** | `src/app/components/status-tile.tsx` | `content/docs/patterns/status-tile.mdx` | TSX + Storybook | `status-tile.stories.tsx` |
| **Tabs** | `src/app/components/tabs.tsx` | `content/docs/patterns/tabs.mdx` | TSX + Storybook | `tabs.stories.tsx` |
| **Timestamp** | `src/app/components/timestamp.tsx` | `content/docs/patterns/timestamp.mdx` | TSX + Storybook | `timestamp.stories.tsx` |
| **Toast** | `src/app/components/toast.tsx` | `content/docs/patterns/toast.mdx` | TSX + Storybook | `toast.stories.tsx` |
| **Toggle** | `src/app/components/toggle.tsx` | `content/docs/patterns/toggle.mdx` | TSX + Storybook | `toggle.stories.tsx` |

---

## 5. Guides Inventory

| Guide Title | Proposed MDX Path | Description |
| :--- | :--- | :--- |
| **Getting Started** | `content/docs/guides/getting-started.mdx` | Installation, theme provider setup, router seam, first component. |
| **Tokens & Architecture** | `content/docs/guides/tokens.mdx` | Token pipeline (DTCG -> CSS/TS/Figma), 3-tier architecture, theme dials. |
| **Upgrade Path** | `content/docs/guides/upgrade.mdx` | Versioning policy, running release codemods, breaking-change windows. |
| **Deprecation & Removals** | `content/docs/guides/deprecation.mdx` | 46 deprecated components, 32 removed 0.20 components, replacements, removal timeline. |

---

## 6. Removed Components (32 Excluded from Component Docs)

These 32 components were removed in v0.20.0 and MUST NOT have live component doc pages. They are documented strictly in `guides/deprecation.mdx`:

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
27. `StepperField`
28. `Stepper`
29. `TextLockup`
30. `Token`
31. `Tokenizer`
32. `Toolbar` / `TopNav` / `TreeList`

---

## 7. Parity Gaps & Reconciliation Notes

1. **Storybook-Only / Non-Component Stories:**
   - `static-primitives.stories.tsx`, `type-specimen.stories.tsx`, `design-parameters.ts` — internal design specimens. Folded into Foundation docs.
   - `patterns-client-detail.stories.tsx`, `patterns-layout.stories.tsx`, `patterns-scroll.stories.tsx` — portfolio-specific mock pages. Excluded from core component docs.
2. **Missing Storybook Stories:**
   - All 42 core components and key pattern modules have matching stories in `src/stories/`.
3. **Docs App Route Coverage:**
   - Current custom docs app routes under `/hds/` mapped 1:1 to Fumadocs `content/docs/` hierarchy.
