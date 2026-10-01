---
'@hirobius/design-system': minor
---

**BREAKING (0.x minor): 32 components with no survivor are removed, and the root `*Variants` helpers are private (hds#394 wave 4a, hds#389 decision update).** No consumer imports any of them (ops, the one product app, has 0 import sites, and it pins `^0.16`, which never resolves to 0.20). Every removed name has a row in MIGRATIONS.md under "0.20.0 removals", with its replacement where one exists.

- **Removed from the root:** `CaseStudyLayout`, `HdsSystemDocLayout`, `HdsDocsShell`, `ErrorBoundary`, `HistoryCard`, `NavGroup`, `Tokenizer`, `StepperField`, `HeadingStack`, `TextLockup`, `DateInput`, `DateRangeInput`, `DateTimeInput`, `ContextMenu`, `HoverCard` and `ButtonGroup`, with their props types and helpers. `HeadingStack` and `TextLockup` become `Stack` + `Text` (recipe in docs/rules/REACT_COMPONENTS.md); `StepperField` becomes `Input type="number"`.
- **Removed from `/patterns`:** `ActivityFeed`, `AppShell`, `Calendar`, `Carousel`, `CommandPalette`, `DocLinkCard`, `FileInput`, `Lightbox`, `NavItem`, `OverflowList`, `SideNav`, `StackedCardRail`, `Stepper`, `Toolbar`, `TopNav` and `TreeList`, with their props types, parts and `*Variants`. The date pickers have no replacement (ADR-034 supersedes ADR-020); use a native `<input type="date">`.
- **The root exports no `*Variants` cva helper** (38 names such as `buttonVariants`, `badgeVariants`, `cardVariants`). Each still styles its own component; style through the component's props. `/patterns` keeps its exports.
- **`hds-patterns-subpath --check` reports a named import or re-export of any removed name** (from the root or `/patterns`) as "removed in 0.20.0, no replacement" for a manual edit, instead of passing or moving it to a subpath that no longer has it. The list ships as `codemods/removed-0.20.json`. A removed name read through a namespace import or a dynamic `import()` is left to the type checker.
- `ButtonGroup`, `ContextMenu` and `HoverCard` leave the curated core set (`scripts/lib/core-components.mjs`), which is 39 components now.
