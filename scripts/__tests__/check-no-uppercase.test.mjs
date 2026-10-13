/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-no-uppercase.mjs.
 *
 * findViolationsInText runs in memory. The last blocks read the registry and
 * the pre-commit hook, run the gate on its fixtures, and run it over the repo.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findViolationsInText, isExempt } from '../check-no-uppercase.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = 'scripts/check-no-uppercase.mjs';

const find = (text, file = 'fake.tsx') => findViolationsInText(text, file);
const count = (text, file) => find(text, file).length;

describe('findViolationsInText: what makes ALL CAPS', () => {
  it('flags the Tailwind uppercase class, plain and variant-prefixed', () => {
    expect(count('<p className="text-xs uppercase">x</p>')).toBe(1);
    expect(count("const c = cn('md:uppercase', x);")).toBe(1);
    expect(count("const c = 'uppercase';")).toBe(1);
    expect(count('.a { @apply uppercase tracking-wide; }', 'x.css')).toBe(1);
  });

  it('flags CSS and inline text-transform: uppercase', () => {
    expect(count('.a { text-transform: uppercase; }', 'x.css')).toBe(1);
    expect(count("<p style={{ textTransform: 'uppercase' }}>x</p>")).toBe(1);
    expect(count('"textTransform": "uppercase"', 'tokens.json')).toBe(1);
    expect(count('<p className="[text-transform:uppercase]">x</p>')).toBe(1);
  });

  it('flags small caps', () => {
    expect(count('.a { font-variant: small-caps; }', 'x.css')).toBe(1);
    expect(count('.a { font-variant-caps: all-small-caps; }', 'x.css')).toBe(1);
  });

  it('flags textCase UPPER in tokens or the Figma model', () => {
    expect(count('"textCase": "UPPER"', 'figma/model.json')).toBe(1);
    expect(count("{ textCase: 'UPPER' }")).toBe(1);
    expect(count('"textCase": "ORIGINAL"', 'figma/model.json')).toBe(0);
  });

  it('flags .toUpperCase() and .toLocaleUpperCase() for display', () => {
    expect(count('<span>{name.toUpperCase()}</span>')).toBe(1);
    expect(count('const s = label.toLocaleUpperCase();', 'x.ts')).toBe(1);
  });
});

describe('findViolationsInText: what stays allowed', () => {
  it('allows a first-letter capital (sentence case)', () => {
    expect(count('s.charAt(0).toUpperCase() + s.slice(1)')).toBe(0);
    expect(count('s[0].toUpperCase() + s.slice(1)')).toBe(0);
  });

  it('allows text-transform none and capitalize-free values', () => {
    expect(count('.a { text-transform: none; }', 'x.css')).toBe(0);
    expect(count("<p style={{ textTransform: 'none' }}>x</p>")).toBe(0);
  });

  it('does not read prose or comments as a transform', () => {
    expect(count('<p>Names must not be uppercase here.</p>')).toBe(0);
    expect(count("const m = 'the value must be uppercase';")).toBe(0);
    expect(count('// never text-transform: uppercase\nconst a = 1;')).toBe(0);
    expect(count('/* uppercase labels: text-transform: uppercase */', 'x.css')).toBe(0);
  });

  it('exempts a line with uppercase-ok and a reason, on the line or the two above', () => {
    expect(count('const a = n.toUpperCase(); // uppercase-ok: user string, shown as typed')).toBe(
      0,
    );
    expect(count('// uppercase-ok: user string\n\nconst a = n.toUpperCase();')).toBe(0);
    expect(count('// uppercase-ok: user string\n\n\nconst a = n.toUpperCase();')).toBe(1);
  });

  it('still fails a bare uppercase-ok with no reason', () => {
    const v = find('const a = n.toUpperCase(); // uppercase-ok:');
    expect(v.map((x) => x.rule)).toEqual(['uppercase-ok-needs-reason']);
  });

  it('exempts test files', () => {
    expect(isExempt('src/app/components/x.test.tsx')).toBe(true);
    expect(isExempt('src/app/components/x.tsx')).toBe(false);
  });
});

describe('check-no-uppercase: registry, hook, fixtures and the repo', () => {
  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  const entry = registry.gates.find((g) => g.id === 'check-no-uppercase');

  it('is registered as an error that fires at pre-commit, with its fixtures', () => {
    expect(entry).toMatchObject({
      gateScript: GATE,
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
      fixturePath: 'fixtures/check-no-uppercase',
      supportsJson: true,
    });
  });

  it('runs in .husky/pre-commit', () => {
    const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-no-uppercase\.mjs$/m);
  });

  const runOn = (fixture) =>
    spawnSync(process.execPath, [GATE, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: `fixtures/check-no-uppercase/${fixture}`,
      },
    });

  it('exits 1 on the canary, naming each file:line', () => {
    const run = runOn('violating.example.tsx');
    expect(run.status).toBe(1);
    const { violations } = JSON.parse(run.stdout);
    expect(violations.map((v) => [v.line, v.rule])).toEqual([
      [7, 'no-uppercase'],
      [8, 'no-uppercase'],
      [9, 'no-uppercase'],
      [10, 'no-uppercase'],
      [11, 'no-uppercase'],
      [12, 'no-uppercase'],
      [13, 'uppercase-ok-needs-reason'],
      [18, 'no-uppercase'],
      [19, 'no-uppercase'],
    ]);
  });

  it('exits 0 on the passing fixture', () => {
    const run = runOn('passing.example.tsx');
    expect(JSON.parse(run.stdout).violations).toEqual([]);
    expect(run.status).toBe(0);
  });

  it('finds nothing in the repo (pnpm test runs this in CI, where the hook does not)', () => {
    const run = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});

describe('its exemption marker', () => {
  it.each([GATE, 'scripts/__tests__/check-no-uppercase.test.mjs'])(
    'is one check-exemptions knows, so pnpm check does not reject it in %s',
    (file) => {
      const run = spawnSync(process.execPath, ['scripts/check-exemptions.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, HDS_FIXTURE_MODE: '1', FIXTURE_FILE: file },
      });
      expect(run.stderr).not.toMatch(/unknown exemption marker "uppercase-ok"/);
      expect(run.status).toBe(0);
    },
  );
});
