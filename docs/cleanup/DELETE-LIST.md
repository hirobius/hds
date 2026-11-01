# Delete list — knip + jscpd sweep (hds#766)

The F8 code-freeze cleanup inventory. Two tools produce it:

- **knip** finds unused files, dependencies, exports and types. Those are
  true deletes: batches 1–6 below, one PR each, delete-only, no behaviour
  change.
- **jscpd** finds duplicated code. Duplicates are not deletes — removing
  one copy means extracting a shared helper, which is a behaviour-preserving
  refactor. They are batches J1–J4, sequenced after the delete-only batches
  so the freeze stays honest.

Regenerate the raw data any time:

```sh
pnpm exec knip
pnpm check:dupes -- --reporters console,json --output report/
```

## Ratchets

| Gate  | Where                                          | Count on 2026-10-31                                          | Rule                                                                                           |
| ----- | ---------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| knip  | `pnpm check:knip-ratchet` (`--max-issues`)     | 0 (was 12, then 7)                                           | Error-level issues only; lower it in the PR that removes them                                  |
| jscpd | `pnpm check:dupes` (`.jscpd.json` `threshold`) | 1.883% of 188,904 lines (348 clones, 3,557 duplicated lines) | Threshold sits at 1.76 (1.75% after hds#1010 batch J3); lower it in the PR that removes clones |

jscpd ignores generated files (`generated-*.ts`), `fixtures/` and
`*.golden.json`: inputs and outputs, not code anyone can deduplicate.
Without those ignores the headline number is 2.27%, and most of it is the
generated token tables copying each other.

## knip batches

### Batch 1 — done (PR #932)

Four unused devDependencies (`cors`, `express`, `jscodeshift`, `@lhci/cli`),
one broken type-test file, two redundant knip ignores.
Ratchet 12 → 7.

### Batch 2 — done (PR #978)

Dead fixture, proof-of-concept and validator files for the retired
`10f-7-xpath-query-endpoint` surface.

### Batch 3 — this PR

Two parts, both proven against the tree before touching anything:

1. **The type-test directory under `tests` deleted** (8 `*.test-d.ts`
   files + their tsconfig; the exact paths are in this PR's diff — the
   state-surfaces gate quite rightly refuses to let a living doc point at
   files that no longer exist). Nothing referenced the directory, no gate
   includes it (typecheck covers `src/**` and the Figma templates only),
   and running its own documented command today fails: `tsc --noEmit -p`
   on its tsconfig exits 2 with stale-prop errors (Alert `variant`, Card
   tones) against APIs that have since changed. Broken and unrun, same as
   batch 1's type-test file.
2. **Seven "unused" devDependencies are not unused** — each is spawned or
   resolved in a way knip cannot see, so they move to
   `ignoreDependencies` in `knip.config.ts` with the evidence inline, and
   the ratchet drops 7 → 0:

   | Dependency                 | Really used by                                                                    |
   | -------------------------- | --------------------------------------------------------------------------------- |
   | `@arethetypeswrong/cli`    | `scripts/check-published-types.mjs` (the `attw` binary)                           |
   | `@axe-core/playwright`     | `scripts/lib/axe-gate.mjs`, `tests/helpers/axe.ts` (resolved from `node_modules`) |
   | `@cyclonedx/cyclonedx-npm` | `scripts/audit-sbom.mjs`                                                          |
   | `editorconfig-checker`     | `scripts/lib/mojibake.mjs` (`check:mojibake`)                                     |
   | `publint`                  | `scripts/smoke-consumer.mjs`                                                      |
   | `react-router`             | Optional peer; `src/app/context/RouterContext.tsx` imports it                     |
   | `vite-bundle-visualizer`   | `scripts/audit-bundle.mjs`                                                        |

   `jscpd` itself joins the same ignore list: `scripts/check-dupes.mjs`
   runs it via `pnpm exec`, which knip cannot see either.

### Batch 4 — unused exports and types in `src` (15)

knip reports these at warn level. For each one: if the symbol is used
inside its own file, drop only the `export` keyword; if it is used
nowhere, delete the declaration. No public entry point is involved.

- `src/app/components/scroll-edge-fade.ts` — `revealInline`
- `src/app/components/token-field-model.ts` — `tokenSpans`, `TokenSegment`, `TokenEdit`
- `src/app/components/button-wipe.ts` — `WipeEdge`
- `src/app/components/combobox-creatable.tsx` — `CreatableComboboxProps`
- `src/app/data/manifest-types.ts` — `ManifestPropSpec`, `ManifestUsage`,
  `ManifestKeyboardEntry`, `ManifestSlot`, `ManifestApiPropRow`,
  `RoleToken`, `ManifestComponentSpec`, `ManifestApiComponent`,
  `ComponentApiManifest`

### Batch 5 — unused exports and types in tests (7)

Same method as batch 4, test helpers only:

- `tests/helpers/console-budget.ts` — `ALLOWLIST_COMMENT`, `ConsoleLevel`, `AllowlistEntry`
- `tests/helpers/dom-a11y.ts` — `readerLines`
- `tests/helpers/token-sheet.ts` — `Theme`
- `tests/visual/tenant-matrix.ts` — `Theme`, `MatrixCase`

### Batch 6 — duplicate default exports + knip binary noise (4)

Needs a consumer check first: `src/mui/index.ts` is a public entry point,
so removing a default export is an API change if any consumer imports it
that way. Check ops, job-hunt and folio before deleting.

- `src/app/components/callout.tsx` — `Callout` is also the default export
- `src/mui/index.ts` — `hdsMuiThemeOptions` is also the default export
- knip "unlisted binaries" `build` and `dev` (from `package.json`) —
  investigate and silence by config or by fixing the script text knip
  mis-parses

## jscpd batches (dedupe by extraction — refactors, not deletes)

Counts are clones whose first file sits in the area, from the 2026-10-31
run (348 clones total). Test boilerplate dominates: the same arrange/act
scaffolding copied across gate tests.

### Batch J1 — `scripts/__tests__` boilerplate (138 clones, 1,333 lines)

The biggest pool. Shared spawn/assert helpers in `scripts/lib` or a test
utilities module; one gate family per PR.

### Batch J2 — `src` components and styles (74 clones, 812 lines)

`src/app` (61 clones, 627 lines) and `src/styles` (13 clones, 185 lines).
Component-internal repetition: extract a local helper or subcomponent per
component, never a cross-component abstraction invented for the occasion.

### Batch J3 — gate scripts and `scripts/lib` (~65 clones, ~750 lines)

The `scripts/check-*.mjs` gates share arg-parsing, file-walking and
reporting boilerplate (worst pairs: `check-hardcoded-spacing`,
`check-no-custom-tracking` ↔ `check-no-status-clutter` ↔
`check-no-uppercase`). `scripts/lib` already exists for exactly this;
move the shared shapes there one family at a time.

### Batch J4 — validators and repo tests (~46 clones, ~420 lines)

`validators/*.mjs` (a11y-validator, binding-completeness, correlation,
contrast) plus `tests/primitive-contracts` (16 clones, 136 lines) and the
root `tests/*.test.*` files.

## Not delete candidates

- The seven devDependencies in batch 3's table, and `@microsoft/api-extractor`
  (already ignored): used, just not import-visible to knip.
- Generated token files and fixtures: jscpd noise, ignored in `.jscpd.json`.
- Forward-looking exports knip flags at warn level stay visible in every
  `pnpm exec knip` run; batches 4–6 work through them, nothing is hidden
  by config.
