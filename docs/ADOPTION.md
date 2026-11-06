# Adoption ledger

How much of HDS the product apps that use its components actually use, month by month. The README's "In use" section has the current numbers; this page shows how they got there. Every row names the commit it was measured at, so anyone with a clone can re-run the count and get the same table. The data lives in `docs/data/consumer-usage.json`; `scripts/count-consumer-usage.mjs` writes it and renders the block below, and `pnpm test` fails when the two disagree.

<!-- auto:start:adoption-history -->

Numbers only. Each product app is measured from its `main` branch, one row per calendar month in UTC: the last first-parent commit before the month ended (the current month is the branch tip when it was measured). Files and components count `src/` imports of `@hirobius/design-system`, as in the README; raw controls are lowercase `<button>`, `<input>`, `<select>`, `<textarea>` and `<table>` tags in `src/**/*.tsx`; the HDS release is the highest one tagged by the month end. `n/a` means the commit had no `src/`.

Re-measure from a full clone: `node scripts/count-consumer-usage.mjs --root <clone> --history --consumer <id>`.

### Internal operations dashboard

| Month   | Commit    | Files | Components | Raw controls | HDS range | HDS release |
| ------- | --------- | ----- | ---------- | ------------ | --------- | ----------- |
| 2026-07 | `4d8ded4` | 29    | 20         | 43           | ^0.13.0   | 0.13.0      |
| 2026-08 | `4d8ded4` | 29    | 20         | 43           | ^0.13.0   | 0.13.0      |
| 2026-09 | `76ef65e` | 33    | 24         | 33           | ^0.16.0   | 0.19.1      |
| 2026-10 | `aab75a7` | 87    | 34         | 4            | 0.31.0    | 0.32.0      |

### Roleflame, a job-application tracker

| Month   | Commit    | Files | Components | Raw controls | HDS range | HDS release |
| ------- | --------- | ----- | ---------- | ------------ | --------- | ----------- |
| 2026-07 | `3bc74e2` | 16    | 18         | 1            | ^0.13.0   | 0.13.0      |
| 2026-08 | `3ba0c3b` | 17    | 18         | 1            | ^0.13.0   | 0.13.0      |
| 2026-09 | `3ba0c3b` | 17    | 18         | 1            | ^0.13.0   | 0.19.1      |
| 2026-10 | `e946751` | 101   | 43         | 2            | 0.32.0    | 0.32.0      |

### Deprecation cycle

| Change                                                     | App                           | Status             | Commit    | Tracked in |
| ---------------------------------------------------------- | ----------------------------- | ------------------ | --------- | ---------- |
| Pattern components moved to the `/patterns` subpath (0.20) | Internal operations dashboard | applied 2026-10-05 | `39a68bc` | `ops #460` |

### Consistency harness

The latest `source: "harness"` entry of `eval/consistency/ledger.json`, copied when the ledger was measured.

| Date       | Package | HDS commit | Builds | Violations | Axe | Min Jaccard | Pass |
| ---------- | ------- | ---------- | ------ | ---------- | --- | ----------- | ---- |
| 2026-10-14 | 0.25.0  | `a38670c`  | 2 of 3 | 0          | 0   | 0.95        | no   |

<!-- auto:end:adoption-history -->
