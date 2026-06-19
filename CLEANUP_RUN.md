# CLEANUP_RUN — consumable-surface hardening

Autonomous hardening of the published `@hirobius/design-system` package surface.
Branch: `claude/design-system-hardening-2xc2re`. One row per queue item.

## Status table

| #   | Item                                   | Status | Result                                                          |
| --- | -------------------------------------- | ------ | --------------------------------------------------------------- |
| 1   | Slim the published package             | doing  | dist 57MB→0.65MB; pack 49MB→~0.55MB, files ~400→204 (see below) |
| 2   | Consumer smoke test                    | todo   | —                                                               |
| 3   | Reproducible release (changesets + CI) | todo   | —                                                               |
| 4   | Fix secrets-hook gap                   | todo   | wrapper already graceful; husky still calls raw `gitleaks`      |
| 5   | Prune scripts                          | todo   | —                                                               |
| 6   | Reconcile generated-artifact policy    | todo   | —                                                               |

## Decisions log (DEFAULT-DECISION RULE)

- **Sourcemaps:** `sourcemap: false` in vite.config.lib.ts. Consumers don't need
  them; the 3D scene map alone was ~5.8MB. Debugging happens against this repo.
- **publicDir:** `publicDir: false` in the lib build. Vite was copying the entire
  47MB `public/` tree (portfolio PNGs in `_archive/mds`, fonts, JSON) into the
  package. Fonts use absolute `/fonts/...` URLs that resolve against the
  _consumer's_ web root, so bundling them was dead weight — consumer-neutral.
- **Barrel curation:** removed `specimen-block` (HdsSpecimenBlock) and
  `ComponentDocPage` from `src/index.ts`. Both transitively reach
  `componentPreviewRegistry.tsx`, whose `import.meta.glob('./*.tsx')` +
  `glob('./lab/*.tsx')` pulled EVERY component (incl. the 3D `mobius-scene`),
  every lab module, and the `component-api.json` / `token-audit-report.json`
  artifacts into the library bundle. They remain importable by the in-repo doc
  site via direct path. **API-SURFACE CHANGE — ops must re-verify** (see below).
- **Source trimming:** kept the types-from-source contract (documented in
  CONSUMING.md §6) — still ship `src`. Excluded only provably-private,
  out-of-closure trees via `files` negations: `src/stories` (Storybook demos),
  `src/app/components/lab`, and the 3D modules (`mobius-*`, `shaders`,
  `mobiusStore`/`mobiusCurve`). Verified against the 70-file published
  type-closure; all closure files (incl. CSS side-effect deps) still ship.
- **/protocol subpath:** added `@hirobius/design-system/protocol` →
  `protocol/envelope.mjs` (pure Node ESM, native crypto, zero deps — shipped
  raw, no bundling).

## API-SURFACE CHANGES (ops must re-pin / re-verify)

- **Removed from `.` barrel:** `SpecimenBlock` (+ any specimen-block exports),
  `ComponentDocPage`. These were docs-shell renderers; ops should not depend on
  them. `docs/api/api-baseline.json` regenerated via `pnpm api:update`.
- **Added subpath:** `@hirobius/design-system/protocol`.
- No version bump performed yet (see item 3 — release prep only, no publish).
  </content>
  </invoke>
