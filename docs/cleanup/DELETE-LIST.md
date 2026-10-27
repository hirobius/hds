# Delete list (hds#766)

Source: `pnpm check:knip` and `pnpm check:dupes` (jscpd, threshold 1%, today 0.97%, 52 clones; ratchet down only). Rule: delete only what a tool flags AND a repo-wide grep confirms unreferenced; never a public export of the package entries.

## Batch 1 — unused devDependencies (shipped in #766)

Removed: `@lhci/cli`, `cors`, `express`, `jscodeshift`. Each is absent from every script, workflow, config and import (grep hits are only prose in CHANGELOG, ADRs and the SBOM). knip ratchet 12 → 8.

## Kept, flagged by knip but referenced indirectly

`@arethetypeswrong/cli` (scripts/check-published-types.mjs), `@axe-core/playwright` (resolved by path in scripts/lib/axe-gate.mjs, tests/helpers/axe.ts), `@cyclonedx/cyclonedx-npm` (scripts/audit-sbom.mjs), `editorconfig-checker` (scripts/lib/mojibake.mjs), `publint` (scripts/smoke-consumer.mjs), `react-router` (optional peer), `vite-bundle-visualizer` (scripts/audit-bundle.mjs), `jscpd` (check:dupes). Fix: teach knip these usages (#442), not delete.

## Remaining batches

- Batch 2 — unused exports in `src/app/data/manifest-types.ts` (9 types), `button-wipe.ts` `WipeEdge`, `combobox-creatable.tsx` `CreatableComboboxProps`, `token-field-model.ts` `TokenSegment`/`TokenEdit`/`tokenSpans`, `scroll-edge-fade.ts` `revealInline`: unused outside their file, so drop the `export` keyword only (the code is used internally); check none is a package-entry type first.
- Batch 3 — `tests/types/button.test-d.ts` imports missing `../../src/app/components/HdsButton`: fix or delete the file.
- Batch 4 — jscpd clones: scripts `check-no-status-clutter`/`check-no-uppercase`/`check-no-custom-tracking`; `scripts/lib/explorations/board-index.mjs` and `gaps.mjs`; `radio.tsx`/`toggle.tsx`; `poc/style-dictionary-poc` (delete if the PoC is dead).
