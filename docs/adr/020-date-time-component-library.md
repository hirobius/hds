# ADR-020: Date/time components on react-day-picker v10 + date-fns

- **Status:** Accepted
- **Date:** 2026-07-05
- **Decider:** Adrian (default applied by the Astryx coverage build, #76)
- **Related:** Issue #76 (Astryx coverage — Tier 3), ADR-013 (escape-hatch policy), `.size-limit.cjs` (bundle budgets)

## Context

The Astryx coverage benchmark (#76) surfaced a date/time component family HDS
does not yet cover: `HdsCalendar`, `HdsDateInput`, `HdsDateRangeInput`,
`HdsDateTimeInput`, `HdsTimeInput`. Unlike the Tier-1/Tier-2 work, these cannot
be built cleanly from existing primitives — a correct calendar is a large,
subtle surface (month grids, locale/first-day-of-week, keyboard grid nav, range
selection, disabled/min/max, ARIA `grid` semantics, DST-safe date math). Hand
-rolling it would be a maintenance liability and an accessibility risk.

Three options were weighed:

1. **Hand-rolled** — full control, zero deps, but high cost and high a11y risk;
   rejected (the calendar-grid a11y contract is exactly what a library earns us).
2. **Radix** — Radix has no calendar/date primitive at time of writing, so it
   does not help here (we would still hand-roll the grid).
3. **react-day-picker v10 + date-fns** — the de-facto React calendar, headless
   enough to skin entirely with HDS tokens, ships correct grid ARIA and keyboard
   nav, and uses `date-fns` (already a common, tree-shakeable date library) for
   locale-aware formatting/parsing. This is the shadcn/ui calendar foundation,
   so the token-skin pattern is well-trodden.

## Decision

Adopt **`react-day-picker` (current major, v10 at time of writing) + `date-fns`** as the foundation for the HDS
date/time family, skinned with HDS role tokens (the same SURFACE/ITEM/`hds-focus`
vocabulary used by Menu/Dialog):

1. **`HdsCalendar`** — thin token-skin over `react-day-picker`'s `DayPicker`
   (single / range / multiple modes passed through). Owns the visual contract;
   the text inputs compose it inside a `Popover`.
2. **`HdsDateInput` / `HdsDateRangeInput` / `HdsDateTimeInput`** — a text field
   (parsed/formatted with `date-fns`) paired with an `HdsCalendar` in a
   `Popover` for picking. `HdsDateTimeInput` adds a time field.
3. **`HdsTimeInput`** — a native-`<input type="time">`-backed, token-skinned
   time field (no calendar dependency); keeps the family complete without
   pulling calendar weight for the time-only case.

`date-fns` is the only formatting/parsing dependency; we do **not** add moment,
luxon, or dayjs. `react-day-picker` bundles its own minimal internals.

## Consequences

- **New dependencies:** `react-day-picker` (v10) and `date-fns`. Both are
  tree-shakeable; consumers only pay for them if they import a date component
  (the barrel is `export *` per-module, and app/consumer builds tree-shake
  unused subpaths — verified by `smoke:consumer`).
- **Bundle budgets:** the date components are heavier than other primitives.
  They land behind their own size-limit accounting; if `check:size` / CI budgets
  need adjustment when they ship, that is measured and justified in the PR (per
  the `.size-limit.cjs` header), exactly as the manifest-chunk bump was.
- **Tiering:** shipped as their own sub-project (Tier 3), NOT folded into the
  Tier-1/Tier-2 minors, so the dependency addition is an isolated, reviewable
  change.
- **Escape hatches:** `HdsCalendar` forwards `react-day-picker` props where it
  is safe to do so; the token skin is applied via `classNames`, never via raw
  hex/px (ADR-013 discipline holds).
