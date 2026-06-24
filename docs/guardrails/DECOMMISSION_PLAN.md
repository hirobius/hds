# Guardrail Decommission & Consolidation Plan

**Status:** proposed — execution tracked as the "Execute guardrail decommission plan" task.
**Basis:** 63 registered gates (registry.json v1.0.0, 2026-06-19).
**Context:** A CVA convergence pass on component primitives (inline `style={{}}` / JS
style-objects → `cva()` variants) plus a new type-level gate forbidding a `style` prop on
primitive interfaces. This makes several **runtime-scanning** gates redundant — the bad
pattern becomes unexpressible by construction. Several other gates are **transitional
ratchets** retired once their migration completes.

**Headline:** 63 → ~49 maintained gates, and a meaningful share of the pre-commit hot path
moved to `ci-pr` / `ci-scheduled`.

> Guiding principle: prefer **delete-don't-maintain** over consolidation. Every gate the type
> system makes unexpressible is a gate removed, not merged.

---

## Execution waves (ranked: max overhead reduction at min risk)

### Wave 1 — Zero-risk scraps (do first, no migration)

1. **SCRAP `check-code-connect`** — self-documents as "no `.figma.tsx` files exist — exits 0."
   Pure pre-commit dead weight. _Live-confirmed 2026-06-24: "No Code Connect files found — skipping."_
   Pre-condition: `find src -name "*.figma.tsx"` empty. When Code Connect ships, replace the stub
   with a real gate rather than un-commenting dead code.
2. **SCRAP `check-legacy-hds-vars`** — `--hds-text-*` → semantic-var migration complete;
   `lastViolationAt: null`. _Live-confirmed: zero references in component files._
   Pre-condition: `grep -r "var(--hds-text-primary\|secondary\|disabled" src/` empty outside `theme.css`.

### Wave 2 — Downgrade pre-commit → ci-pr (high latency win, zero risk)

Batch-edit `firingChannel` in registry.json, then run `node scripts/update-precommit-hash.mjs`
(else `check-validator-wiring` fails the next commit).

| Gate                           | from → to                 | Why                                                                                                    |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `generate-strength-report`     | pre-commit → ci-pr        | Pure observer, never exits 1; ~2s latency for zero enforcement. Also needs Chrome (fails in headless). |
| `audit-batch-deliverables`     | pre-commit → ci-pr        | Post-batch validation misfiled as commit-level.                                                        |
| `check-og-meta`                | pre-commit → ci-pr        | Registry `wiringTodo` says so; index.html meta ~never changes.                                         |
| `check-security-baseline`      | pre-commit → ci-pr        | pkg comment: "dormant/manual — candidate for security CI lane."                                        |
| `check-token-structure`        | pre-commit → ci-pr        | Architectural, not per-commit; `lastViolationAt: null`.                                                |
| `check-contrast`               | pre-commit → ci-pr        | Color-token changes are rare.                                                                          |
| `check-brand`                  | pre-commit → ci-pr        | Doc staleness; `lastViolationAt: null`.                                                                |
| `check-manifest-schema-semver` | pre-commit → ci-pr        | Schema changes rare.                                                                                   |
| `check-route-coverage`         | pre-commit → ci-pr        | Slowest static gate (TS AST parse); routes added infrequently.                                         |
| `check-focus-states`           | pre-commit → ci-pr        | Full-tree scan; old `lastViolationAt`.                                                                 |
| `check-mono-roles`             | pre-commit → ci-pr        | Narrow 3-file scope; not authoring-critical.                                                           |
| `audit-tiers`                  | pre-commit → ci-scheduled | Advisory classifier that writes a markdown table.                                                      |
| `check-token-renames`          | pre-commit → ci-pr        | Near-zero fires; retire when token migration done.                                                     |

### Wave 3 — Merges (medium effort, real consolidation)

Each merge: add a sub-mode flag to the target gate, move/consolidate the source gate's fixture
pair, then remove the source's registry entry **atomically** (`validate-fixture-proof-of-firing`
fails until entry + fixtures are cleaned together).

| Merge                  | Into                                   | Note                                                                            |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `audit-exceptions`     | `check-exemptions --inventory`         | audit-exceptions has empty JSDoc; its sentinel list ⊂ check-exemptions MARKERS. |
| `check-dimensions`     | `check-hardcoded-spacing --dimensions` | Same JS style-prop family, same glob, same exemption pattern.                   |
| `check-reduced-motion` | `check-motion --reduced-motion`        | Same domain (positive + reduce path); always fire together.                     |
| `audit-pages`          | `audit-component-integrity --pages`    | Same hex/rgba/spacing scan, looser threshold, pages dir.                        |
| `check-css-integrity`  | `audit-tokens --css-bridge`            | Both read theme.css + tokens.json.                                              |

### Wave 4 — Promote soft (pnpm-meta) → ci-pr (enforcement without new gates)

- `check-style-discipline` → ci-pr (CSS-values sub-check is correctness-worthy)
- `check-tier-bypass` → ci-pr (token tier hierarchy should block PRs)
- `check-link-integrity` → ci-pr for `--doc-refs-only` + `--route-links-only`; keep `--external-only` soft (network)
- `check-snapshot-staleness` → manual → ci-scheduled

### Wave 5 — CVA-convergence retirements (after CVA + no-style-prop gate land)

- **ADD `check-no-style-prop`** — the type-level gate forbidding a `style` prop on primitive
  interfaces. This is the net-new gate that makes the scanners below redundant.
- Retire `check-style-discipline --inline-only` and `--style-props-only` sub-checks.
- Retire `audit-component-integrity --tokens` (+ the merged `--pages`) hardcoded-style sub-checks.
- Retire `check-typography-discipline --fonts-only` (raw `fontFamily` becomes a type error).
- Retire `check-hardcoded-spacing` once the migration completes (keep as a completeness gate until then).

### Wave 6 — Ratchet retirements (when burn-down completes)

- `check-fixture-stubs-ratchet` — when stub fixtures reach 0. _Live: 56 real / 7 stubs — not yet._
- `audit-gates-supportjson` — when `--json` compliance hits 100% (then severity flips to error & self-destructs).
- `check-token-renames` — when `tokens.lock.json` is stable and TOKEN_MIGRATION.md has no pending entries.

---

## Overlap clusters (the consolidation map)

- **A · Hardcoded-value family** (`check-hardcoded-colors`, `-spacing`, `check-dimensions`,
  `check-hardcoded-breakpoints`, `check-source-canon`, `check-style-discipline --css-values`).
  Merge `check-dimensions`→`check-hardcoded-spacing`. Keep colors (SVG/canvas contexts) and
  breakpoints (JS comparisons) separate; `check-source-canon` stays (Swiss-canon policy, not just tokens).
- **B · Motion pair** → `check-motion` with `--motion-only` / `--reduced-only`.
- **C · Exception/exemption** → `check-exemptions` absorbs `audit-exceptions` (`--inventory`).
- **D · Component token compliance** → `audit-component-integrity --pages` absorbs `audit-pages`.
- **E · CSS/token sync** → `audit-tokens --css-bridge` absorbs `check-css-integrity`.
- **F · Manifest integrity** — keep `check-manifest-drift` + `check-manifest-schema-semver`
  separate (different artifacts); just downgrade the semver one.

---

## Mis-calibration signals (escape-hatch sprawl)

Bypass-annotation counts (live `check-exemptions`, 2026-06-24):

| Marker      |  Count | Signal                                                                                                                                                                                                                |
| ----------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit-ok`  | **97** | **Critical.** Generic catch-all spanning many gates — one annotation silences any scanner. Require a gate-specific qualifier (`audit-ok:dimensions: …`) or migrate to per-gate markers (`dimensions-ok`, `focus-ok`). |
| `tier-ok`   |     36 | High. Achieving tier compliance via annotation, not structure. Audit after promoting `check-tier-bypass` to ci-pr.                                                                                                    |
| `motion-ok` |     31 | Moderate. Heuristic (button/onClick ⇒ requires motion) likely over-fires on static/lab surfaces.                                                                                                                      |
| `inline-ok` |     24 | Moderate — but retires post-CVA. Don't invest in reducing.                                                                                                                                                            |
| `css-ok`    |     21 | Acceptable now; a rising count post-CVA would mean the CSS gate is misfiring.                                                                                                                                         |

**Action:** fold an `audit-ok`-qualifier rule into `check-exemptions`; it's the highest-ROI
calibration fix and directly reduces silent suppression.

---

## Final count

| Verdict                                                     | Δ                | Running total |
| ----------------------------------------------------------- | ---------------- | ------------- |
| Wave 1: scrap `check-code-connect`, `check-legacy-hds-vars` | −2               | 61            |
| Wave 2: 13 channel downgrades                               | 0 (channel only) | 61            |
| Wave 3: 5 merges (source gates removed)                     | −5               | 56            |
| Wave 4: 4 channel promotions                                | 0                | 56            |
| Wave 5: sub-modes retired, +`check-no-style-prop`           | ~−4 +1           | ~53           |
| Wave 6: ratchet retirements                                 | ~−3              | **~49**       |

**~49 maintained gates** ≈ 29 KEEP + ~17 DOWNGRADE (channel-only) + 1 net-new
(`check-no-style-prop`), with 5 merged away + ~4 scrapped outright.

---

## Execution precision notes

- Gate ids are **case-sensitive** and must match registry.json exactly (used by
  `run-gates.mjs --channel` and `check-validator-wiring` hash verification).
- Any `firingChannel` change ⇒ run `node scripts/update-precommit-hash.mjs` or the next commit fails.
- Merges must move the source gate's `fixtures/<gate-id>/` pair and delete its registry entry in
  the **same** change — `validate-fixture-proof-of-firing` is atomic on this.
- `check-code-connect` / `check-legacy-hds-vars` scraps have the grep/`find` pre-conditions above.
