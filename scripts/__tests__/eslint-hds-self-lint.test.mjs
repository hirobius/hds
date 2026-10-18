/**
 * HDS lints its own src/ with the rules it ships to consumers (hds/recommended).
 * This pins the repo's eslint.config.mjs: the three token-discipline rules must
 * stay on for src/ (and fire on a violation), so nobody quietly switches them
 * off. Primitive implementers (src/app/components/**), tests and compile-only
 * __fixtures__ are the one carve-out, for the rules about raw controls and ad-hoc layout.
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(code, filePath) {
  const [res] = await eslint.lintText(code, { filePath });
  return res.messages.map((m) => m.ruleId);
}

describe('hds/* rules are enforced on src/', () => {
  const page = 'src/app/pages/__fixture__.tsx';

  it('hds/no-raw-hex flags a hex in an inline style', async () => {
    const ids = await ruleIds(
      `export const A = () => <div style={{ color: '#ff0000' }} />;\n`,
      page,
    );
    expect(ids).toContain('hds/no-raw-hex');
  });

  it('hds/no-raw-px-spacing flags a raw px padding', async () => {
    const ids = await ruleIds(
      `export const A = () => <div style={{ padding: '16px' }} />;\n`,
      page,
    );
    expect(ids).toContain('hds/no-raw-px-spacing');
  });

  it('hds/sx-token-first flags a px string in sx', async () => {
    const ids = await ruleIds(`export const A = () => <div sx={{ width: '300px' }} />;\n`, page);
    expect(ids).toContain('hds/sx-token-first');
  });

  it('hds/no-raw-controls flags a raw <button> outside the primitives', async () => {
    const ids = await ruleIds(`export const A = () => <button>x</button>;\n`, page);
    expect(ids).toContain('hds/no-raw-controls');
  });

  it('a primitive implementer may render the raw control it wraps', async () => {
    const ids = await ruleIds(
      `export const A = () => <button>x</button>;\n`,
      'src/app/components/__fixture__.tsx',
    );
    expect(ids).not.toContain('hds/no-raw-controls');
  });

  it('a compile-only __fixtures__ file may render raw controls (hds#676)', async () => {
    const ids = await ruleIds(
      `export const A = () => <input />;\n`,
      'src/form/__fixtures__/__fixture__.tsx',
    );
    expect(ids).not.toContain('hds/no-raw-controls');
  });
});
