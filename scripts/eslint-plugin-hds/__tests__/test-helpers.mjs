import { RuleTester } from 'eslint';

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
