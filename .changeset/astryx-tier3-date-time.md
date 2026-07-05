---
'@hirobius/design-system': minor
---

Add the Tier-3 date/time family, completing the Astryx coverage build (#76) per ADR-020 (react-day-picker v10 + date-fns):

- **HdsCalendar** (`Inputs`, primitive) — HDS-token-skinned month calendar over `react-day-picker`; passes through `mode` (single/range/multiple), `selected`, `onSelect`, disabled/min/max, locale. The foundation the date inputs compose.
- **HdsTimeInput** (`Inputs`, primitive) — token-skinned native `<input type="time">` (no calendar dependency).
- **HdsDateInput** (`Inputs`, pattern) — single-date text field with a calendar Popover; date-fns parse/format.
- **HdsDateRangeInput** (`Inputs`, pattern) — date-range trigger + range calendar Popover.
- **HdsDateTimeInput** (`Inputs`, pattern) — combined date (calendar Popover) + time (`HdsTimeInput`) producing one `Date`.

Each ships colocated tests (Radix Popover jsdom polyfills), a Storybook story, a Code Connect stub, and a Swiss-canon fixture. Dependencies `react-day-picker` and `date-fns` (added as ADR-020 groundwork) are now in use; they tree-shake out of consumer bundles that don't import a date component (verified by `smoke:consumer`, and the app `size-limit` main-entry budget is unchanged).
