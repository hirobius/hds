/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * layout-recipe.mjs — the shared screen layout recipe and negative rules.
 * Consumed by generate-llms-txt.mjs and generate-consumer-skill.mjs so both
 * project the same text.
 */

export const layoutRecipeSteps = [
  '`Page` (from `@hirobius/design-system/patterns`; or `Container` for a full-bleed, non-page surface, with a `Box` inside it for a horizontal gutter) for the outermost width constraint. Never import `Container` directly inside `src/app/pages/**` — use `Page`, which wraps it and owns vertical rhythm.',
  '`Stack` (vertical rhythm between sections) or `Grid` (two-dimensional/column layout) for the structural skeleton. One section = one Section/Stack — never add a second wrapper to fake a section boundary.',
  'Reach for a named layout primitive before hand-rolling flex/grid math for a common intent: `Stack direction="row" wrap="wrap"` (wrapping row of same-ish things), `Sidebar` (fixed-width rail + fluid content, no media query), `Switcher` (row that flips to a column below a threshold, no media query). A full-height shell with a centered main region, an aspect-ratio-locked media box or a negative margin that escapes a parent padding is a `Box` with `style` (not `sx`, which applies on the client only).',
  '`Surface` for any background-bearing, padded wrapper (card, panel, inset). Never a raw element with backgroundColor + padding hand-rolled inline.',
  'Use the screen patterns (`@hirobius/design-system/patterns`) for the parts every screen repeats: `PageHeader` once at the top (breadcrumb, `heading2` title, status, actions), `MetricTiles` for any row of headline numbers, `FormActions` for a form footer (primary right-most and last in DOM order, destructive on the far left), `DataTableSection` for a titled table (toolbar slot, consumer row actions, empty state, scrolls on narrow widths without a caller `minWidth`), and `DestructiveSection` last for an irreversible action (danger button, then an `AlertDialog` confirm). Pick between `MetricTiles`, `Stat`, `Card.Metric` and `StatusTile`, and between `Card` and `Surface`, with the "Which one, when" table in `DESIGN.md`.',
  '`Box` `sx` LAST — only for genuinely one-off layout that no named primitive covers. `sx` spacing/color keys MUST be HDS token keys, never raw hex/px.',
];

export const layoutNegativeRules = [
  'No inline margins on children to fake spacing between siblings — gap/spacing on the parent (Stack/Grid/Switcher/Sidebar) owns rhythm, not margin on the child.',
  'No raw px or hex values in any layout or color prop — every spacing value comes from the semantic gap scale (`tight | normal | inset | spacious`, or a component/subgrid step) and every color comes from a `semantic.color.*` token.',
  'No repeated outlined cards as the default structure for roadmap/status/process/overview UI — use open bands, dividers, rails, disclosures, and whitespace instead.',
];
