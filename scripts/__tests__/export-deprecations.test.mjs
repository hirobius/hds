// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectExportDeprecations } from '../lib/export-deprecations.mjs';
import { buildDeprecationsJson } from '../build-deprecations.mjs';

describe('collectExportDeprecations', () => {
  it('lists each exported declaration under a @deprecated JSDoc block', () => {
    const src = `
/**
 * Old tile.
 * @deprecated use Card.
 * @removeIn 1.0.0
 * @useInstead Card
 */
export const OldTile = 1;
/** Live. */
export function Live() {}
/**
 * @deprecated gone soon
 * @removeIn 0.40.0
 */
export interface OldProps {}
`;
    expect(collectExportDeprecations(src, 'x.tsx')).toEqual([
      { name: 'OldTile', file: 'x.tsx', note: 'use Card.', removeIn: '1.0.0', useInstead: 'Card' },
      {
        name: 'OldProps',
        file: 'x.tsx',
        note: 'gone soon',
        removeIn: '0.40.0',
        useInstead: null,
        typeOnly: true,
      },
    ]);
  });

  it('ignores deprecated union members and object props (not exports)', () => {
    const src = `export type V =\n  /**\n   * @deprecated use title\n   * @removeIn 1.0.0\n   */\n  | 'heading3';\n`;
    expect(collectExportDeprecations(src, 'v.ts')).toEqual([]);
  });
});

describe('deprecated-exports.json', () => {
  it('is current with the source (run node scripts/build-deprecations.mjs)', () => {
    const committed = readFileSync(
      new URL('../eslint-plugin-hds/rules/deprecated-exports.json', import.meta.url),
      'utf8',
    );
    expect(committed).toBe(buildDeprecationsJson());
  });

  it('lists MetricTile with its removal version', () => {
    const { exports } = JSON.parse(buildDeprecationsJson());
    expect(exports.find((e) => e.name === 'MetricTile')).toMatchObject({ removeIn: '1.0.0' });
  });
});
