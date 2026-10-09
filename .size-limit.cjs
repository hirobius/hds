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
 * A failing budget is a performance-optimization task first (skill:
 * .claude/skills/performance-optimization/SKILL.md; `pnpm size-limit` prints the
 * pointer via scripts/run-size-limit.mjs). Raising a limit is a last resort that
 * needs Adrian's approval, never a way to get a branch green.
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
 * Re-baselined 2026-09-24 (hds#279): the alternative rejected above was taken.
 * `observedTokens` no longer ships in src/app/data/component-api.json at all —
 * grep confirmed `buildObservedTokenRows` (module since deleted, hds#391; the one
 * function that reads observedTokens rows) had ZERO importers anywhere in src/, so there
 * was no "runtime-only token rows" behaviour to preserve in the first place;
 * the concern above turned out to be unfounded once checked. The three actual
 * importers of component-api.json (api-reference.tsx, component-instance-matrix.tsx,
 * componentPreviewRegistry.tsx) only ever read `props`/`description`/`filePath`.
 * `scripts/generate-component-api.mjs` now writes the full corpus (observedTokens
 * incl. sourceLine) to docs/generated/component-api-full.json instead — gitignored,
 * read only in Node by scripts/generate-component-page.mjs for the docs site's
 * styling-reference token table, never bundled. Measured: main entry
 * 183.18 kB gzipped, BELOW the pre-#278 205 kB budget and even below the
 * 184.23 kB origin/main figure #278 regressed from. New budget 200 kB — modest
 * headroom over the measured 183.18 kB, deliberately tighter than the ~17%
 * other entries carry, since the whole point of this re-baseline is to stop
 * documentation corpus growth from silently riding along in the runtime bundle.
 *
 * Note (hds#286, 2026-09-26): `componentPreviewRegistry.tsx`, named above (twice) as
 * one of `component-api.json`'s three importers, was deleted along with its two
 * exclusive consumers — a dead island reachable from nothing, superseded by the
 * Storybook-built reference site. `component-api.json` now has two importers:
 * api-reference.tsx and component-instance-matrix.tsx. See docs/adr/029-decisions-carried-over.md.
 *
 * Note (hds#389 R1, 2026-10-01): both importers named above are gone.
 * api-reference.tsx moved to src/docs-tooling/ in hds#299 and was deleted with
 * that tree in hds#391, and component-instance-matrix.tsx was deleted with
 * ComponentInstanceMatrix in 0.20.0, so nothing under src/ imports
 * component-api.json now (it still ships as a package file). The importer lists
 * above are history; no budget changed.
 *
 * Re-baselined 2026-09-30, manifest entry only: 54.46 kB -> 55.71 kB after
 * hds#334 (Radix passthrough props for 7 overlay parts), hds#342 (the
 * curated icon set) and hds#337 (three screen patterns plus a live
 * patternInventory) landed in one wave, which broke the 55 kB budget by
 * 711 B. Content again, not bloat: every byte is a documented prop, icon
 * or pattern. The rest of the wave (hds#335 container props, hds#339/#340
 * usage-contract tags on every core component, hds#338 two more patterns)
 * adds the same kind of content, so the new budget is 65 kB: the ~17%
 * headroom convention over 55.71 kB. Raised by the wave-2 merge train;
 * Adrian to confirm or tighten.
 *
 * Known redundancy, not yet acted on: `figmaUrl` and `figmaLink` are
 * byte-identical on all 44 linked components. Dropping one would shrink this
 * entry, but it is a breaking change for manifest consumers.
 *
 * Button-only root import (hds#315, 2026-09-29): `import { Button } from
 * '@hirobius/design-system'`, tree-shaken and minified with react/react-dom
 * external, built by scripts/build-button-probe.mjs (run by `pnpm check:size`
 * after `build:lib`). Measured 113.01 kB gzip -> budget 119 kB (+5%), so the
 * shared graph behind the barrel cannot grow silently under a one-component
 * consumer. The 262 kB the issue quotes is the un-shaken chunk graph; this is
 * what a bundler actually ships. Shared chunk at measure time:
 * dist/chunks/activity-feed-*.js, 103.33 kB gzip.
 *
 * Measured again 2026-09-30 (hds#363), budget unchanged: 62.20 kB gzip on
 * main (c17d997) -> 31.62 kB after AlertDialog, Dialog and Card stopped
 * writing their parts onto the Radix Root (one pure Object.assign around a
 * wrapper of our own instead) and every top-level forwardRef / cva /
 * createContext / withHdsPortal call under src/ got its /* @__PURE__ *\/
 * (scripts/check-pure-annotations.mjs, pre-commit). The rollup number alone
 * cannot see a property write on a Radix export — rollup drops it, webpack
 * and esbuild keep it — so scripts/build-button-probe.mjs now also bundles
 * the same entry with esbuild (dist/probe/button-only.esbuild.js, 86.10 kB
 * gzip at measure time, not budgeted) and fails when @radix-ui/react-dialog
 * or @radix-ui/react-alert-dialog code reaches it.
 *
 * Measured again 2026-09-30 (hds#365), budget unchanged: the esbuild probe
 * passed the "no dialog packages" check above while its metafile still
 * listed 33 @radix-ui packages, because ContextMenu, Menu, Toolbar, Popover,
 * Tooltip and HoverCard wrote their parts onto a component the same way (37
 * `X.Part = …` writes). Moved onto the pure Object.assign shape: rollup
 * Button-only 30.81 kB gzip before and after (rollup already dropped the
 * writes); esbuild Button-only 85.58 kB -> 42.11 kB gzip, @radix-ui packages
 * reached 33 -> 2 (react-slot and react-compose-refs, what button.tsx itself
 * pulls in). scripts/build-button-probe.mjs now fails on any @radix-ui
 * package outside that allow-list, and check-pure-annotations also flags a
 * bare Object.assign(<Component>, …) and any top-level `X.Part = …` write.
 *
 * Fonts split out (hds#479, 2026-10-07): the base64-inlined faces were ~85% of
 * tokens.css and styles.css. Fonts now ship as the opt-in fonts.css plus
 * dist/fonts/*.woff2. Measured on the type-ramp branch (4 faces), gzip:
 *   tokens.css 152.76 kB -> 20.28 kB, budget 140 kB -> 23 kB (+~10%)
 *   styles.css 152.17 kB -> 19.64 kB, budget 140 kB -> 22 kB (+~10%)
 *   fonts.css + 4 woff2: 132.16 kB raw (130.27 kB woff2 + 1.88 kB css), budget 146 kB
 * Approved by Adrian 2026-10-07.
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
    limit: '200 kB',
    gzip: true,
  },
  {
    name: 'manifest (hds-manifest.json ESM)',
    path: 'dist/manifest.js',
    limit: '65 kB',
    gzip: true,
  },
  {
    name: 'tokens.css (CSS bundle, no fonts)',
    path: 'dist/tokens.css',
    limit: '23 kB',
    gzip: true,
  },
  {
    name: 'styles.css (scoped-only CSS bundle)',
    path: 'dist/styles.css',
    limit: '22 kB',
    gzip: true,
  },
  {
    // Opt-in fonts (hds#479): fonts.css plus its four woff2 files, raw bytes
    // (woff2 is already compressed, so gzip would only hide the real transfer).
    name: 'fonts.css + woff2 files (opt-in, raw)',
    path: ['dist/fonts.css', 'dist/fonts/*.woff2'],
    limit: '146 kB',
    gzip: false,
    brotli: false,
  },
  {
    name: 'Button-only root import (dist/probe/button-only.js)',
    path: 'dist/probe/button-only.js',
    limit: '119 kB',
    gzip: true,
  },
  {
    name: 'tokens.js (token bridge constants)',
    path: 'dist/tokens.js',
    limit: '7 kB',
    gzip: true,
  },
];
