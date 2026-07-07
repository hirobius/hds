import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // src/index.ts is auto-detected as the package entry; explicit entry was redundant.
    // The portfolio app (App.tsx, routes.tsx, index.html, src/main.tsx) was
    // removed in the ADR-018 teardown (#49/#51) — this is a library-only
    // package now, so there is no app entry to declare.
    'scripts/**/*.mjs!',
    // Validator pipeline — entries to surface acorn/acorn-jsx + AST helpers
    // that knip's project graph cannot reach via the React app alone.
    'validators/**/*.mjs!',
    // Vitest + Playwright test files — entries so knip picks up
    // test-only imports (e.g. createMobiusStore + PRESETS in
    // tests/mobiusStore.test.ts, helpers/* in tests/*.spec.ts).
    'tests/**/*.{test,spec}.{ts,tsx}!',
    // Storybook stories — entries to a separate harness; knip can't trace
    // them via routes.tsx but they are real consumers of HDS components.
    'src/stories/**/*.stories.{ts,tsx}!',
  ],
  project: [
    'src/**/*.{ts,tsx}!',
    'scripts/**/*.mjs!',
    'validators/**/*.mjs!',
    'tests/**/*.{ts,tsx}!',
  ],
  ignore: [
    // Library subpath build entry — referenced by vite.config.lib.ts as a
    // rollup entry, not via TS imports, so Knip can't trace it.
    'src/lib/manifest-entry.ts',
    // Generated files — knip should not report these as orphans
    'src/app/design-system/generated-tokens.ts',
    // Generated token descriptions — read directly from disk by
    // scripts/check-token-description-quality.mjs (filesystem consumer,
    // not a TS import).
    'src/app/design-system/generated-token-descriptions.ts',
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
    // Storybook stories import this; Storybook itself is not yet wired into
    // the build, so the dep is phantom for now.
    '@storybook/react',
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
  // Forward-looking exports (multi-tenant context, mobius constants, etc.)
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
