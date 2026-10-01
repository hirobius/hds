# ADR-034: Remove the Date Pickers; TimeInput Stays Native

**Status:** Accepted (2026-10-01). Supersedes ADR-020. Decider: Adrian (hds#389 D4, recorded on hds#389 2026-10-01); implemented by hds#394 wave 4a.

## Context

ADR-020 added a date/time family on `react-day-picker` and `date-fns` to close
an Astryx coverage gap (#76): `Calendar`, `DateInput`, `DateRangeInput`,
`DateTimeInput` and `TimeInput`. The hds#389 prune measured who uses what. No
consumer imports any of the five: ops (the one product app) has 0 import sites
on origin/main, folio and concrete import only `variables.css`, and site-engine
has no HDS dependency. The family carried two runtime dependencies, its own
popover, grid, keyboard and range code, and a Figma staging drawing per
component, all for no consumer.

Adrian's D4 call: remove `Calendar`, `DateInput`, `DateRangeInput` and
`DateTimeInput` with no survivor, and fold `TimeInput` into `Input type="time"`.
The prune ships as removals in the 0.20.0 minor (ADR-014's 2026-10-01
amendment), not as deprecations.

## Decision

1. **Removed in 0.20.0:** `Calendar` (`/patterns`), `DateInput`,
   `DateRangeInput` and `DateTimeInput` (root), with their props types. There is
   no HDS calendar or date picker. A product that needs a date uses the
   platform's `<input type="date">`; one that needs a custom calendar builds it
   in the app.
2. **`TimeInput` is not removed here.** It is already a token skin over native
   `<input type="time">`, and it waits for `Input type="time"` (hds#393) before
   it goes in wave 4b (hds#394).
3. **Dependencies:** nothing under `src/` imports `react-day-picker` or
   `date-fns` after this change. Dropping them from `package.json` needs a
   lockfile update and is a separate step.

## Rationale

The calendar grid was the one part of the family that justified a library
(ADR-020, option 3), and nobody renders it. Keeping it costs dependency
updates, an accessibility contract to keep green and a Figma component to keep
in sync. The native date input covers the common case with the browser's own
keyboard and screen-reader support.

## Consequences

- MIGRATIONS.md lists each removed name under "0.20.0 removals" with "no
  replacement". No codemod: no consumer imports them.
  `hds-patterns-subpath --check` flags an import of `Calendar` for a manual
  edit (`codemods/removed-0.20.json`).
- The icon set's `Calendar` (Lucide) no longer collides with an HDS component.
- If a consumer later needs a picker, it comes back as a new proposal measured
  against a real use, not as a restore of ADR-020.
