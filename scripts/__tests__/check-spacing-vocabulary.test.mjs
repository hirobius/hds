/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-spacing-vocabulary.mjs (hds#206).
 *
 * The findViolationsInText tests run in memory. The last block reads the
 * registry and the pre-commit hook, and runs the gate on its fixture.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findViolationsInText, SPACING_KEYS } from '../check-spacing-vocabulary.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('SPACING_KEYS', () => {
  it('covers the full box-sx.ts spacing shorthand set', () => {
    for (const key of ['p', 'm', 'gap', 'px', 'py', 'mx', 'my', 'rowGap', 'columnGap']) {
      expect(SPACING_KEYS.has(key)).toBe(true);
    }
  });
});

describe('findViolationsInText', () => {
  it('flags a raw integer on p inside sx={{ ... }}', () => {
    const text = `<Box sx={{ p: 2, bgcolor: 'surface.raised' }} />`;
    const violations = findViolationsInText(text, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'fake.tsx', key: 'p', value: '2' });
  });

  it('flags multiple spacing keys on the same line', () => {
    const text = `<Box sx={{ p: 2, gap: 4, mt: 9 }} />`;
    const violations = findViolationsInText(text, 'fake.tsx');
    expect(violations.map((v) => v.key)).toEqual(['p', 'gap', 'mt']);
  });

  it('flags across a multi-line sx object literal', () => {
    const text = [
      '<Box',
      '  sx={{',
      '    p: 6,',
      "    bgcolor: 'surface.raised',",
      '  }}',
      '/>',
    ].join('\n');
    const violations = findViolationsInText(text, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(3);
  });

  it('does not flag string values (already named)', () => {
    const text = `<Box sx={{ p: 'md', gap: 'var(--semantic-space-scale-sm)' }} />`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('does not flag numeric literals outside an sx object', () => {
    const text = `<StepperField min={1} max={99} step={1} />`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('does not flag padding/gap style-object props (covered by check-hardcoded-spacing)', () => {
    const text = `<div style={{ padding: 16, gap: 24 }} />`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('honors // spacing-vocab-ok: <reason> on the same line', () => {
    const text = `<Box sx={{ p: 2 }} /> // spacing-vocab-ok: intentional legacy exception`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('honors // spacing-vocab-ok: <reason> on the preceding line', () => {
    const text = [
      '// spacing-vocab-ok: intentional legacy exception',
      '<Box sx={{ p: 2 }} />',
    ].join('\n');
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });
});

describe('findViolationsInText: forms a line scan misses (hds#206 fix round)', () => {
  const found = (text) =>
    findViolationsInText(text, 'fake.tsx').map(({ line, key, value }) => ({ line, key, value }));

  it('flags integers inside a responsive map on a spacing key', () => {
    expect(found(`<Box sx={{ p: { base: 2, md: 4 } }} />`)).toEqual([
      { line: 1, key: 'p', value: '2' },
      { line: 1, key: 'p', value: '4' },
    ]);
  });

  it('flags only the integer in a mixed responsive map, across lines', () => {
    const text = ['<Box', '  sx={{', "    gap: { xs: 'sm',", '      md: 6 },', '  }}', '/>'].join(
      '\n',
    );
    expect(found(text)).toEqual([{ line: 4, key: 'gap', value: '6' }]);
  });

  it('does not flag integers in a responsive map on a non-spacing key', () => {
    expect(found(`<Box sx={{ width: { xs: 120, md: 320 }, p: 'md' }} />`)).toEqual([]);
  });

  it('flags a spacing integer inside a nested &-selector block', () => {
    expect(found(`<Box sx={{ '&:hover': { p: 4 } }} />`)).toEqual([
      { line: 1, key: 'p', value: '4' },
    ]);
  });

  it('flags whitespace variants of the sx attribute', () => {
    expect(found(`<Box sx={ { p: 4 } } />`)).toEqual([{ line: 1, key: 'p', value: '4' }]);
    expect(found(`<Box sx = {{ mt: 2 }} />`)).toEqual([{ line: 1, key: 'mt', value: '2' }]);
    expect(found(['<Box sx={', '  { px: 3 }', '} />'].join('\n'))).toEqual([
      { line: 2, key: 'px', value: '3' },
    ]);
  });

  it('flags a negative integer', () => {
    expect(found(`<Box sx={{ mt: -2 }} />`)).toEqual([{ line: 1, key: 'mt', value: '-2' }]);
  });

  it('is not fooled by braces inside strings', () => {
    expect(found(`<Box sx={{ content: '"}}"', p: 4 }} />`)).toEqual([
      { line: 1, key: 'p', value: '4' },
    ]);
  });

  it('does not scan text after the sx object closes', () => {
    expect(found(`<Box sx={{ p: 'md' }}>px: 6, py: 2 (axis shorthand)</Box>`)).toEqual([]);
  });

  it('follows a same-file const passed by name', () => {
    const text = ['const style = { p: 4 };', '<Box sx={style} />'].join('\n');
    expect(found(text)).toEqual([{ line: 1, key: 'p', value: '4' }]);
  });

  it('follows a typed or as-const hoisted object, and a member of it', () => {
    const text = [
      'const card: SxObject = { gap: 2 };',
      'const styles = { row: { mx: 3 } } as const;',
      '<Box sx={card} />;',
      '<Box sx={styles.row} />;',
    ].join('\n');
    expect(found(text)).toEqual([
      { line: 1, key: 'gap', value: '2' },
      { line: 2, key: 'mx', value: '3' },
    ]);
  });

  it('follows a same-file const spread into an sx object', () => {
    const text = ['const base = { m: 2 };', "<Box sx={{ ...base, p: 'md' }} />"].join('\n');
    expect(found(text)).toEqual([{ line: 1, key: 'm', value: '2' }]);
  });

  it('reports a hoisted object once however often it is used', () => {
    const text = ['const style = { p: 4 };', '<Box sx={style} />;', '<Box sx={style} />;'].join(
      '\n',
    );
    expect(found(text)).toHaveLength(1);
  });

  it('ignores a hoisted object that never reaches sx', () => {
    const text = ['const style = { padding: 4, p: 4 };', '<div style={style} />'].join('\n');
    expect(found(text)).toEqual([]);
  });

  it('honors // spacing-vocab-ok on the line before a hoisted integer', () => {
    const text = [
      'const style = {',
      '  // spacing-vocab-ok: intentional legacy exception',
      '  p: 4,',
      '};',
      '<Box sx={style} />',
    ].join('\n');
    expect(found(text)).toEqual([]);
  });
});

describe('the gate blocks (hds#206: promoted from warn once src/ was clean)', () => {
  it('is error severity and fires at pre-commit in the registry', () => {
    const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
    const entry = registry.gates.find((g) => g.id === 'check-spacing-vocabulary');
    expect(entry).toMatchObject({
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
    });
  });

  it('runs in .husky/pre-commit', () => {
    const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-spacing-vocabulary\.mjs$/m);
  });

  it('reports its findings as errors and exits 1 on the violating fixture', () => {
    const run = spawnSync(process.execPath, ['scripts/check-spacing-vocabulary.mjs', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: 'fixtures/check-spacing-vocabulary/violating.example.tsx',
      },
    });
    expect(run.status).toBe(1);
    const { violations } = JSON.parse(run.stdout);
    expect(violations.map((v) => v.message.split(' ')[0])).toEqual([
      'sx.p:',
      'sx.gap:',
      'sx.mt:',
      'sx.p:',
      'sx.p:',
      'sx.gap:',
    ]);
    expect(new Set(violations.map((v) => v.severity))).toEqual(new Set(['error']));
  });

  it('finds nothing in src/ (pnpm test runs this in CI, where the hook does not)', () => {
    const run = spawnSync(process.execPath, ['scripts/check-spacing-vocabulary.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});

describe('its exemption marker (hds#206)', () => {
  it('is one check-exemptions knows, so pnpm check does not reject it', () => {
    // check:full runs check-exemptions over src/ and scripts/, and an unknown
    // `*-ok:` marker fails it. This gate documents `spacing-vocab-ok`.
    const run = spawnSync(process.execPath, ['scripts/check-exemptions.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: 'scripts/check-spacing-vocabulary.mjs',
      },
    });
    expect(run.stderr).not.toMatch(/unknown exemption marker "spacing-vocab-ok"/);
    expect(run.status).toBe(0);
  });
});
