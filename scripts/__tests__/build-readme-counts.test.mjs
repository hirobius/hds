/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/build-readme-counts.mjs, the generator for the README
 * count bullets.
 *
 * The counting rules and the overclaim check are pinned here on in-memory
 * inputs. The front-door test runs the same functions against the real repo.
 * No filesystem reads or writes.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COUNTS_BLOCK,
  countBarrelComponentModules,
  countTokens,
  buildCountsSection,
  replaceCountsBlock,
  readClaims,
  findOverclaims,
} from '../build-readme-counts.mjs';

const COUNTS = { components: 108, tokens: 361 };

const readmeWith = (section) =>
  [
    '# HDS',
    '',
    `<!-- auto:start:${COUNTS_BLOCK} -->`,
    '',
    section,
    '',
    `<!-- auto:end:${COUNTS_BLOCK} -->`,
    '',
    '- Theming through four root attributes',
    '',
  ].join('\n');

// ── Counting rules ────────────────────────────────────────────────────────────
describe('countBarrelComponentModules', () => {
  it('counts only component re-exports from the public barrel', () => {
    const barrel = [
      "export * from './app/components/button';",
      "export * from './app/components/card';",
      "export * from './app/hooks/use-theme';",
      "export { tokens } from './app/design-system/tokens';",
      "// export * from './app/components/retired';",
    ].join('\n');
    expect(countBarrelComponentModules(barrel)).toBe(2);
  });
});

describe('countTokens', () => {
  it('counts leaf tokens carrying $value and ignores $-prefixed metadata', () => {
    const tree = {
      $schema: 'x',
      $description: 'root',
      primitive: {
        color: {
          $type: 'color',
          blue: { $value: '#1e2efd' },
          white: { $value: '#ffffff', $extensions: { nested: { $value: 'not a token' } } },
        },
      },
      semantic: { bg: { $value: '{primitive.color.white}' } },
    };
    expect(countTokens(tree)).toBe(3);
  });
});

// ── Section generation ────────────────────────────────────────────────────────
describe('buildCountsSection', () => {
  it('states every count as bold bullets the claim reader can read back', () => {
    const section = buildCountsSection(COUNTS);
    expect(section).toContain('**108** public component modules');
    expect(section).toContain('**361** DTCG tokens');
    expect(section).not.toMatch(/storybook/i);
    expect(section).not.toMatch(/chromatic/i);
    expect(readClaims(readmeWith(section))).toEqual(COUNTS);
  });
});

describe('replaceCountsBlock', () => {
  it('rewrites only the marked block, with the blank lines Prettier keeps', () => {
    const before = readmeWith('- **1** public component modules');
    const after = replaceCountsBlock(before, buildCountsSection(COUNTS));
    expect(after).toContain(
      `<!-- auto:start:${COUNTS_BLOCK} -->\n\n- **108** public component modules`,
    );
    expect(after).toMatch(
      new RegExp(`CSS variables and TypeScript constants\\n\\n<!-- auto:end:${COUNTS_BLOCK} -->`),
    );
    expect(after).toContain('- Theming through four root attributes');
    expect(after).not.toContain('**1** public component modules');
  });

  it('is idempotent', () => {
    const once = replaceCountsBlock(readmeWith('old'), buildCountsSection(COUNTS));
    expect(replaceCountsBlock(once, buildCountsSection(COUNTS))).toBe(once);
  });

  it('fails loudly when the README has lost its markers', () => {
    expect(() => replaceCountsBlock('# HDS\n', buildCountsSection(COUNTS))).toThrow(
      /auto:start:front-door-counts/,
    );
  });
});

// ── Overclaim check ───────────────────────────────────────────────────────────
describe('findOverclaims', () => {
  it('accepts a README written before the source grew (merge-order safe)', () => {
    const claims = readClaims(readmeWith(buildCountsSection(COUNTS)));
    const grown = { components: 110, tokens: 365 };
    expect(findOverclaims(claims, grown)).toEqual([]);
  });

  it('reports a claim above the source, such as the file count used as the public count', () => {
    const claims = readClaims(readmeWith(buildCountsSection({ ...COUNTS, components: 133 })));
    expect(findOverclaims(claims, COUNTS)).toEqual([
      { key: 'components', claimed: 133, actual: 108 },
    ]);
  });

  it('reports a missing or zero claim', () => {
    const claims = readClaims('# HDS\n\n- **0** DTCG tokens\n');
    const keys = findOverclaims(claims, COUNTS).map((o) => o.key);
    expect(keys).toEqual(['components', 'tokens']);
  });
});

// ── --check ───────────────────────────────────────────────────────────────────
describe('build-readme-counts --check', () => {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SCRIPT = join(ROOT, 'scripts/build-readme-counts.mjs');
  const INPUTS = [
    'README.md',
    'src/index.ts',
    'src/patterns.ts',
    'hirobius.tokens.json',
    'public/hds-manifest.json',
  ];
  const temps = [];
  afterEach(() => {
    while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
  });
  const copy = () => {
    const root = mkdtempSync(join(tmpdir(), 'readme-counts-'));
    temps.push(root);
    for (const f of INPUTS) {
      mkdirSync(dirname(join(root, f)), { recursive: true });
      cpSync(join(ROOT, f), join(root, f));
    }
    return root;
  };
  const run = (root, ...args) =>
    spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });

  it('passes when the README already holds what the generator would write', () => {
    const res = run(copy(), '--check');
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  it('fails when the counts are stale, names README.md and the fix, and writes nothing', () => {
    const root = copy();
    const readme = join(root, 'README.md');
    const stale = readFileSync(readme, 'utf8').replace(
      /\*\*\d+\*\* DTCG tokens/,
      '**1** DTCG tokens',
    );
    writeFileSync(readme, stale);
    const res = run(root, '--check');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('README.md');
    expect(res.stderr).toContain('pnpm readme:counts');
    expect(readFileSync(readme, 'utf8')).toBe(stale);
  });

  it('without --check, rewrites the stale README', () => {
    const root = copy();
    const readme = join(root, 'README.md');
    writeFileSync(
      readme,
      readFileSync(readme, 'utf8').replace(/\*\*\d+\*\* DTCG tokens/, '**1** DTCG tokens'),
    );
    expect(run(root).status).toBe(0);
    expect(run(root, '--check').status).toBe(0);
  });
});
