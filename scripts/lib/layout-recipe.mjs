/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * layout-recipe.mjs — the shared screen layout recipe and negative rules.
 * Consumed by generate-llms-txt.mjs and generate-consumer-skill.mjs so both
 * project the same text.
 */

export const layoutRecipeSteps = [
  '`Page` (or `Container`/`Center` for a full-bleed, non-page surface) for the outermost width constraint. Never import `Container` directly inside `src/app/pages/**` — use `Page`, which wraps it and owns vertical rhythm.',
  '`Stack` (vertical rhythm between sections) or `Grid` (two-dimensional/column layout) for the structural skeleton. One section = one Section/Stack — never add a second wrapper to fake a section boundary.',
  'Reach for a named every-layout primitive before hand-rolling flex/grid math for a common intent: `Cluster` (wrapping row of same-ish things), `Center` (centered max-width column with optional gutter), `Sidebar` (fixed-width rail + fluid content, no media query), `Switcher` (row that flips to a column below a threshold, no media query), `Cover` (full-height shell with a centered main region), `Frame` (aspect-ratio-locked clipped media box), `Bleed` (controlled negative margin to escape a parent padding).',
  '`Surface` for any background-bearing, padded wrapper (card, panel, inset). Never a raw element with backgroundColor + padding hand-rolled inline.',
  'Use the screen patterns (`@hirobius/design-system/patterns`) for the parts every screen repeats: `PageHeader` once at the top (breadcrumb, `heading2` title, status, actions), `MetricTiles` for any row of headline numbers, `FormActions` for a form footer (primary right-most and last in DOM order, destructive on the far left). Pick between `MetricTiles`, `Stat`, `Card.Metric` and `StatusTile` with the "Which one, when" table in `DESIGN.md`.',
  '`Box` `sx` LAST — only for genuinely one-off layout that no named primitive covers. `sx` spacing/color keys MUST be HDS token keys, never raw hex/px.',
];

export const layoutNegativeRules = [
  'No inline margins on children to fake spacing between siblings — gap/spacing on the parent (Stack/Grid/Cluster/Switcher/Sidebar/Cover) owns rhythm, not margin on the child.',
  'No raw px or hex values in any layout or color prop — every spacing value comes from the semantic gap scale (`tight | normal | inset | spacious`, or a component/subgrid step) and every color comes from a `semantic.color.*` token.',
  'No repeated outlined cards as the default structure for roadmap/status/process/overview UI — use open bands, dividers, rails, disclosures, and whitespace instead.',
];
