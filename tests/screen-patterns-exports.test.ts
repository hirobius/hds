// @vitest-environment node
/**
 * The screen-level patterns (hds#337, hds#338) ship on `./patterns` only. They are new
 * surface, so they never appear on the root barrel: consumers reach them through
 * `@hirobius/design-system/patterns`, like every other pattern since 0.20.0
 * removed the root re-exports (hds#254, hds#389).
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readModuleExports } from './helpers/module-exports';

const ROOT = resolve(__dirname, '..');
const PATTERNS = resolve(ROOT, 'src/patterns.ts');
const INDEX = resolve(ROOT, 'src/index.ts');

const VALUES = [
  'PageHeader',
  'MetricTiles',
  'MetricTile',
  'FormActions',
  'DestructiveSection',
  'DataTableSection',
];
const TYPES = [
  'PageHeaderProps',
  'MetricTilesProps',
  'MetricTileProps',
  'FormActionsProps',
  'DestructiveSectionProps',
  'DataTableSectionProps',
  'DataTableSectionRow',
];

const exportedNames = (entry: string) =>
  new Set(readModuleExports(entry).exports.map((s) => s.name));

describe('screen patterns entry points (hds#337)', () => {
  it('src/patterns.ts exports the components and their Props types', () => {
    const names = exportedNames(PATTERNS);
    for (const name of [...VALUES, ...TYPES]) {
      expect(names.has(name), `${name} missing from src/patterns.ts`).toBe(true);
    }
  }, 60_000);

  it('src/index.ts does not export them', () => {
    const names = exportedNames(INDEX);
    for (const name of [...VALUES, ...TYPES]) {
      expect(names.has(name), `${name} must not be on the root barrel`).toBe(false);
    }
  }, 60_000);
});
