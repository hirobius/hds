/**
 * The ESLint plugin as a consumer reaches it: `@hirobius/design-system/eslint-plugin`
 * through the package `exports` map (a self-reference here, the installed tarball in
 * smoke:consumer), linting real JSX with its `recommended` config.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import hds from '@hirobius/design-system/eslint-plugin';

const lint = (code) => {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, [
    { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    ...hds.configs.recommended,
  ]);
};

describe('@hirobius/design-system/eslint-plugin', () => {
  it('exports a flat recommended config that registers the hds rules', () => {
    expect(Array.isArray(hds.configs.recommended)).toBe(true);
    expect(Object.keys(hds.configs.recommended[0].rules)).toEqual(
      expect.arrayContaining(['hds/no-raw-hex', 'hds/no-raw-controls']),
    );
  });

  it('flags raw hex, raw px and raw controls as errors', () => {
    const messages = lint(
      'export const A = () => <form><div style={{ color: "#fff", padding: "8px" }} /><button>Go</button></form>;',
    );
    const errors = messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
    expect(errors).toEqual(
      expect.arrayContaining(['hds/no-raw-hex', 'hds/no-raw-px-spacing', 'hds/no-raw-controls']),
    );
  });

  it('passes a screen built from HDS components and props', () => {
    const messages = lint(
      'export const A = () => <Form onSubmit={save}><Textarea label="Notes" /><FormActions primary={<Button type="submit">Save</Button>} /></Form>;',
    );
    expect(messages.filter((m) => m.severity === 2)).toEqual([]);
  });
});
