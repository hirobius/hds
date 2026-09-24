/**
 * .size-limit.cjs — bundle budgets for the PUBLISHED @hirobius/design-system
 * LIBRARY (dist/*.js + dist/*.css from `pnpm build:lib`, vite.config.lib.ts).
 *
 * The portfolio APP build (dist/assets/index-*.js, vendor-react-*, etc.) was
 * removed in the ADR-018 teardown (#49/#51) — `pnpm build` and the app's
 * `dist/assets/*` output no longer exist, so those budgets are gone.
 * size-limit now measures the actual published product: the entries listed
 * in package.json#exports, produced by `pnpm build:lib`. Always run this
 * through `pnpm check:size` (= `pnpm build:lib && size-limit`), which builds
 * `dist/` first so these paths exist.
 *
 * HARD-FAIL MODE (carried over from the app-build config): CI fails the merge
 * if any entry exceeds its budget — this is intentional. To update a budget,
 * measure a new baseline and justify the change in the PR.
 *
 * Baseline (gzip, library build, 2026-07-07, ADR-018 teardown cleanup):
 *   hirobius-ui.js (main barrel)     : 157.29 kB -> budget 185 kB
 *   manifest.js (hds-manifest.json)  :  40.34 kB -> budget  47 kB
 *   tokens.css (fonts embedded)      : 120.74 kB -> budget 140 kB
 *   styles.css (scoped-only bundle)  : 120.15 kB -> budget 140 kB
 *   tokens.js (token bridge consts)  :   5.67 kB -> budget   7 kB
 *
 * Re-baselined 2026-09-21, manifest entry only: 45.43 kB -> 47.46 kB, which
 * broke the 47 kB budget. The cause is content, not bloat — the manifest now
 * describes 139 components rather than 120, and `componentSpecs` carries the
 * extra 19 along with their descriptions and Figma links. Holding 47 kB would
 * mean refusing to document components the library actually ships. New budget
 * 55 kB keeps the ~17% headroom the other entries use and absorbs the
 * `figmaUrl` / `figmaLink` fields the remaining Figma work will add. Approved
 * by Adrian 2026-09-21. The other four budgets are unchanged and still
 * measured against the 2026-07-07 baseline.
 *
 * Re-baselined 2026-09-24, main entry only: 184.23 kB -> 202.06 kB, which broke
 * the 185 kB budget. Measured both sides rather than assumed: `origin/main`
 * (33fc32a) built in a worktree is 1,040.00 kB raw / 184.23 kB gzipped and
 * passes; this branch is 1,249.17 kB / 202.06 kB and fails. The cause is
 * content, not bloat, and it is one field — `observedTokens` in
 * `src/app/data/component-api.json` grew by 171,879 bytes (every other field:
 * delta 0) because scripts/lib/token-references.mjs now detects all three ways
 * this codebase references a token (`hds.typeStyles.*` objects, `var(--token)`
 * in Tailwind arbitrary values, and named utilities like `bg-primary`), taking
 * coverage from 50 to 116 of 128 components. Three files under src/ import that
 * JSON — api-reference.tsx, component-instance-matrix.tsx and
 * componentPreviewRegistry.tsx — so it ships in the library bundle. Holding
 * 185 kB would mean refusing to describe tokens the components actually use.
 * New budget 205 kB keeps the ~17% headroom the other entries use. Approved by
 * Adrian 2026-09-24.
 *
 * Rejected alternative, tracked in #279: move `observedTokens` out of the
 * shipped bundle entirely and have the docs site read it from disk. That is the
 * better architecture — a design system's runtime bundle should not carry its
 * documentation corpus, and it would put the main entry BELOW main's current
 * size — but it removes runtime-only token rows from the `api-reference`
 * component as published, which is a behaviour change for anyone embedding it.
 * Deliberately not smuggled into the docs-site PR.
 *
 * Note for whoever re-baselines this next: `sourceLine` on each observed-token
 * entry (16,660 bytes across 1020 references) is read by nothing in src/. It is
 * the only free saving here; `raw`, `tokenPath` and `sourceSnippet` are all
 * consumed by buildObservedTokenRows in tokenTableUtils.ts.
 *
 * Known redundancy, not yet acted on: `figmaUrl` and `figmaLink` are
 * byte-identical on all 44 linked components. Dropping one would shrink this
 * entry, but it is a breaking change for manifest consumers.
 *
 * Entries NOT tracked here (sub-1.5 kB gzip, trivial): cn.js, mui.js,
 * form.js, contexts.js. Add a budget for one of these if it grows to carry
 * real weight.
 *
 * Note: unlike the old app build, library entry filenames are NOT
 * content-hashed (vite.config.lib.ts `fileName: (_, name) => \`${name}.js\`),
 * so paths below are exact, not globs.
 *
 * Architecture decisions: docs/architecture/bundle-budget-decision.md
 */

module.exports = [
  {
    name: 'main entry (hirobius-ui.js)',
    path: 'dist/hirobius-ui.js',
    limit: '205 kB',
    gzip: true,
  },
  {
    name: 'manifest (hds-manifest.json ESM)',
    path: 'dist/manifest.js',
    limit: '55 kB',
    gzip: true,
  },
  {
    name: 'tokens.css (CSS bundle, fonts embedded)',
    path: 'dist/tokens.css',
    limit: '140 kB',
    gzip: true,
  },
  {
    name: 'styles.css (scoped-only CSS bundle)',
    path: 'dist/styles.css',
    limit: '140 kB',
    gzip: true,
  },
  {
    name: 'tokens.js (token bridge constants)',
    path: 'dist/tokens.js',
    limit: '7 kB',
    gzip: true,
  },
];
