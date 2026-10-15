import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // The published library entries (vite.config.lib.ts `entry`, mirrored by
    // package.json `exports`). knip reads `exports` as dist/ paths and cannot
    // map them back to src/, so without these the package's own entry files
    // (and what only they import) show up as unused (hds#442).
    'src/index.ts', // .
    'src/lib/utils.ts', // ./cn
    'src/app/design-system/tokens.ts', // ./tokens
    'src/lib/manifest-entry.ts', // ./manifest
    'src/app/context/index.ts', // ./contexts
    'src/form/index.ts', // ./form
    'src/mui/index.ts', // ./mui
    'src/brand/index.ts', // ./brand
    'src/scroll/index.ts', // ./scroll
    'src/patterns.ts', // ./patterns
    'src/icons.ts', // ./icons
    // The portfolio app (App.tsx, routes.tsx, index.html, src/main.tsx) was
    // removed in the ADR-018 teardown (#49/#51) — this is a library-only
    // package now, so there is no app entry to declare.
    'scripts/**/*.mjs!',
    // Validator pipeline — entries to surface acorn/acorn-jsx + AST helpers
    // that knip's project graph cannot reach via the React app alone.
    'validators/**/*.mjs!',
    // Vitest + Playwright test files — entries so knip picks up
    // test-only imports (e.g. helpers/* in tests/*.spec.ts).
    'tests/**/*.{test,spec}.{ts,tsx}!',
    // Compile-only type fixtures, read from disk by their *.test.ts (hds#676).
    'src/**/__fixtures__/**/*.{ts,tsx}!',
  ],
  project: [
    'src/**/*.{ts,tsx}!',
    'scripts/**/*.mjs!',
    'validators/**/*.mjs!',
    'tests/**/*.{ts,tsx}!',
  ],
  ignore: [
    // Generated files — knip should not report these as orphans
    'src/app/design-system/generated-tokens.ts',
    // Generated token descriptions — read directly from disk by
    // scripts/check-token-description-quality.mjs (filesystem consumer,
    // not a TS import).
    'src/app/design-system/generated-token-descriptions.ts',
    // Figma Code Connect templates — generated, consumed by the `figma connect`
    // CLI via figma.config.json and executed in Figma's template runtime (the
    // `figma` import is provided there), not part of the TS module graph.
    'src/app/components/*.figma.ts',
  ],
  ignoreDependencies: [
    // Type-only consumer (JSDoc `@type {{ ... }}` in scripts/build-tokens.mjs);
    // the runtime tailwind plugin loaded by vite is `@tailwindcss/vite`.
    'tailwindcss',
    // Used only via npx in api-extractor scripts; not a runtime dep.
    '@microsoft/api-extractor',
    // Peer of @testing-library/react (now an explicit devDep, imported by
    // tests/primitive-contracts/*.contract.test.tsx). @testing-library/dom is
    // resolved transitively at runtime, not imported in source, so knip can't see it.
    '@testing-library/dom',
  ],
  ignoreBinaries: [
    // `npx tsx` is invoked from the test:figma script (Figma Make sync) and
    // is fetched on demand — intentionally not declared as a project dep.
    'tsx',
    // Knip mis-parses the `_comment:a11y-high-value` script entry in
    // package.json (it's a documentation comment, not a real script) and
    // treats the first token "The" as a binary. Ignore.
    'The',
  ],
  // Forward-looking exports (multi-tenant context, etc.)
  // and phantom devDeps for in-flight surfaces are intentional. Surface as
  // warnings so knip doesn't fail the pretest gate; real cleanup is tracked
  // separately and these stay visible in the warning list.
  rules: {
    exports: 'warn',
    types: 'warn',
    nsExports: 'warn',
    nsTypes: 'warn',
    unlisted: 'warn',
    binaries: 'warn',
    duplicates: 'warn',
    enumMembers: 'warn',
  },
};

export default config;
