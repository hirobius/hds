---
'@hirobius/design-system': minor
---

New `AsyncState` pattern (from `@hirobius/design-system/patterns`): one wrapper for the four states of async content. Loading shows skeleton rows (`rows`, default 3) with a polite status line that becomes "Still trying…" after `slowAfterMs` (default 10 s); error shows a danger `Alert` with the `error` message and a Retry `Button` (`onRetry`), worded as offline when the browser is offline; empty shows your `empty` node; ready shows the children. The wrapper is a labelled region with aria-busy while loading. Replaces the hand-rolled loading, error and empty panels in consumers (hds#818).
