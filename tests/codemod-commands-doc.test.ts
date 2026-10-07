// @vitest-environment node
/**
 * The codemod bins (`hds-patterns-subpath`, `hds-prefix`, `hds-not-found-pattern`,
 * `hds-tile-grid`) exist only inside
 * @hirobius/design-system. A bare `npx hds-prefix` in a project that has not
 * installed a version carrying the bin falls through to the npm registry, where
 * those names are unregistered (anyone could publish them). Every documented
 * npx call therefore pins the package with `-p @hirobius/design-system@<range>`,
 * and the range must reach a version that ships the bin (hds#389 R1 review).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

/** The first minor that ships each bin. */
const FIRST_SHIPPED: Record<string, [number, number]> = {
  'hds-patterns-subpath': [0, 17],
  'hds-prefix': [0, 20],
  'hds-not-found-pattern': [0, 20],
  'hds-tile-grid': [0, 20],
  // Not a codemod, but a bin all the same: the hds MCP server (hds#515).
  'hds-mcp': [0, 21],
};

const DOCS = [
  'MIGRATIONS.md',
  'CONSUMING.md',
  'docs/CONSUMING.md',
  'README.md',
  ...readdirSync(resolve(ROOT, '.changeset'))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => `.changeset/${f}`),
];

/**
 * Source comments count too: src/patterns.ts ships as dist/types/src/patterns.d.ts,
 * so its JSDoc reaches consumers' editors (hds#389 R1a review).
 */
const SOURCES = [
  ...readdirSync(resolve(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => `src/${f}`),
  ...readdirSync(resolve(ROOT, 'codemods'))
    .filter((f) => f.endsWith('.mjs'))
    .map((f) => `codemods/${f}`),
];

/** `file:line: npx …` for every npx call of a codemod bin that does not pin a version shipping it. */
function unpinned(file: string): string[] {
  const bad: string[] = [];
  read(file)
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(/npx\s+(?:-p\s+(\S+)\s+)?(hds-[a-z-]+)/g)) {
        const [, pkg, bin] = m;
        const first = FIRST_SHIPPED[bin];
        if (!first) continue;
        const v = /^@hirobius\/design-system@\^?(\d+)\.(\d+)/.exec(pkg ?? '');
        const ok =
          !!v &&
          (Number(v[1]) > first[0] || (Number(v[1]) === first[0] && Number(v[2]) >= first[1]));
        if (!ok) bad.push(`${file}:${i + 1}: ${m[0]}`);
      }
    });
  return bad;
}

describe('documented codemod commands', () => {
  it('FIRST_SHIPPED covers every bin package.json declares', () => {
    expect(Object.keys(JSON.parse(read('package.json')).bin).sort()).toEqual(
      Object.keys(FIRST_SHIPPED).sort(),
    );
  });

  for (const file of DOCS) {
    it(`${file}: every npx call of a codemod bin pins a package version that ships it`, () => {
      expect(unpinned(file)).toEqual([]);
    });
  }

  it('source comments (src/, codemods/): every npx call of a codemod bin pins a version', () => {
    expect(SOURCES).toEqual(expect.arrayContaining(['src/index.ts', 'src/patterns.ts']));
    expect(SOURCES.flatMap(unpinned)).toEqual([]);
  });

  it('MIGRATIONS.md does not claim hds-prefix ships before 0.20.0', () => {
    expect(read('MIGRATIONS.md')).not.toMatch(/both need the package at 0\.17/);
  });
});
