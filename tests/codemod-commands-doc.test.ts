// @vitest-environment node
/**
 * The codemod bins (`hds-patterns-subpath`, `hds-prefix`) exist only inside
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

describe('documented codemod commands', () => {
  it('FIRST_SHIPPED covers every bin package.json declares', () => {
    expect(Object.keys(JSON.parse(read('package.json')).bin).sort()).toEqual(
      Object.keys(FIRST_SHIPPED).sort(),
    );
  });

  for (const file of DOCS) {
    it(`${file}: every npx call of a codemod bin pins a package version that ships it`, () => {
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
      expect(bad).toEqual([]);
    });
  }

  it('MIGRATIONS.md does not claim hds-prefix ships before 0.20.0', () => {
    expect(read('MIGRATIONS.md')).not.toMatch(/both need the package at 0\.17/);
  });
});
