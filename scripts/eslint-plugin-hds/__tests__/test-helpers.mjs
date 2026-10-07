import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

// Run by `pnpm test` (vitest): RuleTester reports each case as a vitest test.
RuleTester.describe = describe;
RuleTester.it = it;

/** Shared RuleTester preconfigured for JSX-bearing TSX-shaped source. */
export function makeRuleTester() {
  return new RuleTester({
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
}
