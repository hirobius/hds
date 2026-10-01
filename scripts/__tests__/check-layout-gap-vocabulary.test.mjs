/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-layout-gap-vocabulary.mjs (hds#404).
 *
 * The findViolationsInText tests run in memory. The last block reads the
 * registry and the pre-commit hook, and runs the gate on its fixtures and on
 * src/.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findViolationsInText,
  isExempt,
  LAYOUT_GAP_NAMES,
} from '../check-layout-gap-vocabulary.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = 'scripts/check-layout-gap-vocabulary.mjs';

const find = (text) => findViolationsInText(text, 'fake.tsx');
const names = (text) => find(text).map((v) => v.name);

/** The map Cluster, Grid, Sidebar, Cover, Switcher, Bleed and Center each kept on 8e53a8a. */
const PRIVATE_MAP = [
  'const gapMap: Record<LayoutGap, string> = {',
  "  tight: 'var(--semantic-space-scale-sm)',",
  "  normal: 'var(--semantic-space-scale-md)',",
  "  inset: 'var(--semantic-space-scale-lg)',",
  "  spacious: 'var(--semantic-space-scale-xl)',",
  '};',
].join('\n');

describe('LAYOUT_GAP_NAMES', () => {
  it('are the four names box-sx.ts maps', () => {
    expect([...LAYOUT_GAP_NAMES]).toEqual(['tight', 'normal', 'inset', 'spacious']);
  });
});

describe('findViolationsInText: what a second copy looks like', () => {
  it('flags each entry of the private map the eight components kept, on its own line', () => {
    const violations = find(PRIVATE_MAP);
    expect(violations.map((v) => [v.line, v.name, v.step])).toEqual([
      [2, 'tight', 'sm'],
      [3, 'normal', 'md'],
      [4, 'inset', 'lg'],
      [5, 'spacious', 'xl'],
    ]);
    expect(violations[0]).toMatchObject({
      file: 'fake.tsx',
      raw: expect.stringContaining('tight'),
    });
  });

  it('flags a name read through SPACE_SCALE, as Stack spelled it before hds#404', () => {
    expect(names('const g = { tight: SPACE_SCALE.sm, gap: SPACE_SCALE.xs };')).toEqual(['tight']);
  });

  it('flags a name read through the token bridge or an element access', () => {
    const text = [
      'const g = {',
      '  normal: hds.semantic.space.scale.md,',
      "  inset: SPACE_SCALE['lg'],",
      '};',
    ].join('\n');
    expect(names(text)).toEqual(['normal', 'inset']);
  });

  it('flags a quoted key, a template literal and a scale var wrapped in calc()', () => {
    const text = [
      'const g = {',
      "  'tight': `var(--semantic-space-scale-sm)`,",
      "  spacious: 'calc(-1 * var(--semantic-space-scale-xl))',",
      '};',
    ].join('\n');
    expect(names(text)).toEqual(['tight', 'spacious']);
  });

  it('sees through `as` and parentheses', () => {
    expect(names("const g = { tight: ('var(--semantic-space-scale-sm)' as string) };")).toEqual([
      'tight',
    ]);
  });

  it('flags a [name, step] entry pair, the shape a Map or Object.fromEntries takes', () => {
    const text = "const g = new Map([['inset', 'var(--semantic-space-scale-lg)']]);";
    expect(names(text)).toEqual(['inset']);
  });

  it('flags a switch case that returns a step for a name', () => {
    const text = [
      'function gapFor(g: string) {',
      '  switch (g) {',
      "    case 'tight':",
      '      return SPACE_SCALE.sm;',
      '    default:',
      '      return undefined;',
      '  }',
      '}',
    ].join('\n');
    expect(find(text).map((v) => [v.line, v.name])).toEqual([[3, 'tight']]);
  });

  it('follows fall-through to the case that produces the step', () => {
    const text = [
      'switch (g) {',
      "  case 'inset':",
      "  case 'spacious':",
      '    gap = `calc(-1 * ${SPACE_SCALE.xl})`;',
      '    break;',
      '}',
    ].join('\n');
    expect(find(text).map((v) => [v.name, v.step])).toEqual([
      ['inset', 'xl'],
      ['spacious', 'xl'],
    ]);
  });

  it('flags a comparison that picks a step for a name', () => {
    const text = "const v = gap === 'normal' ? 'var(--semantic-space-scale-md)' : undefined;";
    expect(names(text)).toEqual(['normal']);
  });
});

describe('findViolationsInText: what is not a second copy', () => {
  it('ignores the shared vocabulary spread into another one', () => {
    expect(find('const g = { ...LAYOUT_GAP_NAMES, gap: SPACE_SCALE.xs };')).toEqual([]);
  });

  it("ignores the same names on Box sx's fixed layout vars", () => {
    expect(find("const g = { tight: 'var(--semantic-space-layout-tight)' };")).toEqual([]);
  });

  it('ignores the words as CSS keywords and as type members', () => {
    const text = [
      "const s = { fontWeight: 'normal', whiteSpace: 'normal' };",
      "const n = { normal: 'normal', inset: 'inset 0 0 0 1px red' };",
      "type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';",
    ].join('\n');
    expect(find(text)).toEqual([]);
  });

  it('ignores a scale step under any other key', () => {
    expect(
      find("const g = { sm: 'var(--semantic-space-scale-sm)', gap: SPACE_SCALE.xs };"),
    ).toEqual([]);
  });

  it('honours // layout-gap-ok: <reason> on the same or the preceding line', () => {
    const text = [
      'const g = {',
      "  tight: 'var(--semantic-space-scale-sm)', // layout-gap-ok: reason",
      '  // layout-gap-ok: reason',
      "  normal: 'var(--semantic-space-scale-md)',",
      "  inset: 'var(--semantic-space-scale-lg)',",
      '};',
    ].join('\n');
    expect(names(text)).toEqual(['inset']);
  });
});

describe('isExempt', () => {
  it('exempts box-sx.ts, the one copy, and test files, which pin rendered output', () => {
    expect(isExempt('src/app/components/box-sx.ts')).toBe(true);
    expect(isExempt('src/app/components/stack.test.tsx')).toBe(true);
    expect(isExempt('src/app/components/box-sx.test.ts')).toBe(true);
    expect(isExempt('src/app/components/card.spec.tsx')).toBe(true);
  });

  it('scans components, stories and everything else under src/', () => {
    expect(isExempt('src/app/components/cluster.tsx')).toBe(false);
    expect(isExempt('src/stories/cluster.stories.tsx')).toBe(false);
    expect(isExempt('src/app/components/box.tsx')).toBe(false);
  });
});

describe('the gate blocks at pre-commit', () => {
  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  const entry = registry.gates.find((g) => g.id === 'check-layout-gap-vocabulary');

  it('is registered as an error that fires at pre-commit, with its fixtures', () => {
    expect(entry).toMatchObject({
      gateScript: GATE,
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
      fixturePath: 'fixtures/check-layout-gap-vocabulary',
      supportsJson: true,
    });
  });

  it('runs in .husky/pre-commit', () => {
    const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-layout-gap-vocabulary\.mjs$/m);
  });

  const runOn = (fixture) =>
    spawnSync(process.execPath, [GATE, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: `fixtures/check-layout-gap-vocabulary/${fixture}`,
      },
    });

  it('exits 1 on the violating fixture, reporting each private entry as an error', () => {
    const run = runOn('violating.example.tsx');
    expect(run.status).toBe(1);
    const { violations } = JSON.parse(run.stdout);
    expect(violations.map((v) => v.message.split(' ')[0])).toEqual([
      'tight',
      'normal',
      'inset',
      'spacious',
      'tight',
      'normal',
    ]);
    expect(new Set(violations.map((v) => v.severity))).toEqual(new Set(['error']));
    expect(new Set(violations.map((v) => v.rule))).toEqual(new Set(['layout-gap-second-copy']));
  });

  it('exits 0 on the passing fixture', () => {
    const run = runOn('passing.example.tsx');
    expect(JSON.parse(run.stdout).violations).toEqual([]);
    expect(run.status).toBe(0);
  });

  it('finds nothing in src/ (pnpm test runs this in CI, where the hook does not)', () => {
    const run = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});
