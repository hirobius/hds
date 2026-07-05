---
'@hirobius/design-system': minor
---

Complete the Tier-2 pattern layer (Astryx coverage, #76) with 4 more components:

- **Toolbar** (`Actions`) — control group with roving focus on `@radix-ui/react-toolbar`; compound `Toolbar.Button` / `Separator` / `ToggleGroup` / `ToggleItem` / `Link`, skinned to match Menu.
- **TreeList** (`Navigation`) — hierarchical expand/collapse list with correct `role="tree"` / `treeitem` / `group` ARIA (native, no dep).
- **Stepper** (`Navigation`) — wizard/progress step indicator with complete/current/upcoming states (distinct from the existing `StepperField` number input).
- **Carousel** (`Display`) — native CSS scroll-snap track with Prev/Next affordances (no carousel library).

Adds one dependency: `@radix-ui/react-toolbar`. Each ships colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture.

Also lands **ADR-020** (date/time components on react-day-picker v10 + date-fns) and installs those dependencies as groundwork for the Tier-3 date/time family — no Tier-3 components ship in this change yet.
