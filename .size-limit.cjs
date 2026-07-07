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
    limit: '185 kB',
    gzip: true,
  },
  {
    name: 'manifest (hds-manifest.json ESM)',
    path: 'dist/manifest.js',
    limit: '47 kB',
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
