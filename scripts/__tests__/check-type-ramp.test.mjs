/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-type-ramp.mjs (hds#486).
 *
 * The findViolationsInText tests run in memory. The last blocks read the
 * registry and the pre-commit hook, and run the gate on its fixtures and on
 * src/ and the token file.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findViolationsInText, findTokenViolations, isExempt, ROLES } from '../check-type-ramp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = 'scripts/check-type-ramp.mjs';

const find = (text, file = 'fake.tsx') => findViolationsInText(text, file);
const rules = (text, file) => find(text, file).map((v) => v.rule);

describe('ROLES', () => {
  it('are the five roles plus mono', () => {
    expect([...ROLES]).toEqual(['display', 'title', 'body', 'ui', 'caption', 'mono']);
  });
});

describe('findViolationsInText: sizes, weights and leading outside the roles', () => {
  it('flags every Tailwind text size, weight and leading utility', () => {
    const text = '<p className="text-sm font-medium leading-5">x</p>';
    expect(rules(text)).toEqual(['off-ramp-style', 'off-ramp-style', 'off-ramp-style']);
  });

  it('flags a size that is not on the ramp, in a class string', () => {
    expect(rules("const c = 'text-lg tracking-caps';")).toEqual(['off-ramp-style']);
    expect(rules('<p className="text-[15px]">x</p>')).toEqual(['off-ramp-style']);
  });

  it('flags raw inline sizes, weights and line heights, reporting file and line', () => {
    const text = [
      'const s = {',
      "  fontSize: '17px',",
      '  fontWeight: 300,',
      '  lineHeight: 1.7,',
      '};',
    ].join('\n');
    const violations = find(text, 'src/app/components/x.tsx');
    expect(violations.map((v) => [v.file, v.line, v.rule])).toEqual([
      ['src/app/components/x.tsx', 2, 'off-ramp-style'],
      ['src/app/components/x.tsx', 3, 'off-ramp-style'],
      ['src/app/components/x.tsx', 4, 'off-ramp-style'],
    ]);
  });

  it('flags CSS declarations and arbitrary properties', () => {
    expect(rules('.a { font-size: 15px; font-weight: 600; line-height: 1.2; }')).toHaveLength(3);
    expect(rules('<p className="[font-size:15px]">x</p>')).toHaveLength(1);
  });

  it('flags a raw rung of the primitive scale', () => {
    expect(rules("const v = 'var(--primitive-typography-size-lg)';")).toEqual(['off-ramp-style']);
  });

  it('allows a role composite var, inherit and the role classes', () => {
    expect(find("const s = { fontSize: 'var(--semantic-typography-body-font-size)' };")).toEqual(
      [],
    );
    expect(find('.a { line-height: var(--semantic-typography-ui-line-height); }')).toEqual([]);
    expect(find('.a { font-weight: inherit; }')).toEqual([]);
    expect(find('<p className="hds-type-ui text-muted-foreground">x</p>')).toEqual([]);
  });

  it('does not read font-mono (a family) or a type declaration as a violation', () => {
    expect(find('<p className="font-mono">x</p>')).toEqual([]);
    expect(find('type S = { fontSize?: string; lineHeight?: number };')).toEqual([]);
    expect(find("const KEYS = ['fontWeight', 'lineHeight'];")).toEqual([]);
  });
});

describe('findViolationsInText: deprecated composites', () => {
  it('flags every deprecated typeStyles name', () => {
    for (const name of ['h1', 'heading2', 'technical', 'eyebrow', 'small', 'badge', 'monoSm']) {
      expect(rules(`<p style={hds.typeStyles.${name}} />`)).toEqual(['deprecated-composite']);
    }
  });

  it('allows the six roles on typeStyles', () => {
    for (const r of ROLES) expect(find(`<p style={hds.typeStyles.${r}} />`)).toEqual([]);
  });

  it('flags a deprecated composite var and token path', () => {
    expect(rules('font-family: var(--semantic-typography-h2-font-family);')).toEqual([
      'deprecated-composite',
    ]);
    expect(rules("const p = 'semantic.typography.eyebrow';")).toEqual(['deprecated-composite']);
  });

  it('flags a deprecated Text variant', () => {
    expect(rules('<Text variant="heading1">x</Text>')).toEqual(['deprecated-composite']);
    expect(rules("<Text variant={'technical'}>x</Text>")).toEqual(['deprecated-composite']);
    expect(find('<Text variant="title">x</Text>')).toEqual([]);
  });
});

describe('exemptions', () => {
  it('honours // type-ramp-ok: <reason> on the same line or the two before', () => {
    const text = [
      "const a = 'text-sm'; // type-ramp-ok: reason",
      '// type-ramp-ok: reason',
      "const b = 'text-sm';",
      '// type-ramp-ok: reason',
      '// another comment',
      "const c = 'text-sm';",
      '// type-ramp-ok: too far',
      '//',
      '//',
      "const d = 'text-sm';",
    ].join('\n');
    expect(find(text).map((v) => v.line)).toEqual([10]);
  });

  it('exempts the files that define the deprecated names, generated files and tests', () => {
    expect(isExempt('src/app/design-system/tokens.ts')).toBe(true);
    expect(isExempt('src/app/components/text.tsx')).toBe(true);
    expect(isExempt('src/styles/tokens.generated.css')).toBe(true);
    expect(isExempt('src/styles/fonts.css')).toBe(true);
    expect(isExempt('src/app/components/card.test.tsx')).toBe(true);
    expect(isExempt('src/app/components/card.tsx')).toBe(false);
    expect(isExempt('src/stories/card.stories.tsx')).toBe(false);
  });
});

describe('findTokenViolations: the token file itself', () => {
  const role = (size) => ({ $value: { fontSize: size } });
  const base = () => ({
    semantic: {
      typography: {
        display: role('a'),
        title: role('b'),
        body: role('c'),
        ui: role('d'),
        caption: role('e'),
        mono: role('f'),
        h1: { ...role('b'), $deprecated: 'use title' },
        eyebrow: { ...role('e'), $deprecated: 'use caption' },
        lineHeight: { none: { $value: 1 } },
      },
    },
  });

  it('passes when only the six roles are live and aliases match their role', () => {
    expect(findTokenViolations(base(), { h1: 'title', eyebrow: 'caption' })).toEqual([]);
  });

  it('flags a seventh live composite', () => {
    const t = base();
    t.semantic.typography.lead = role('g');
    expect(findTokenViolations(t, {}).map((v) => v.rule)).toEqual(['ramp-size']);
  });

  it('flags a deprecated alias that drifted from its role', () => {
    const t = base();
    t.semantic.typography.h1.$value.fontSize = 'zzz';
    expect(findTokenViolations(t, { h1: 'title' }).map((v) => v.rule)).toEqual(['alias-drift']);
  });
});

describe('the gate blocks at pre-commit', () => {
  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  const entry = registry.gates.find((g) => g.id === 'check-type-ramp');

  it('is registered as an error that fires at pre-commit, with its fixtures', () => {
    expect(entry).toMatchObject({
      gateScript: GATE,
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
      fixturePath: 'fixtures/check-type-ramp',
      supportsJson: true,
    });
  });

  it('runs in .husky/pre-commit', () => {
    const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-type-ramp\.mjs$/m);
  });

  const runOn = (fixture) =>
    spawnSync(process.execPath, [GATE, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: `fixtures/check-type-ramp/${fixture}`,
      },
    });

  it('exits 1 on the canary, naming each file:line', () => {
    const run = runOn('violating.example.tsx');
    expect(run.status).toBe(1);
    const { violations } = JSON.parse(run.stdout);
    expect(violations.map((v) => [v.file, v.line, v.rule])).toEqual([
      ['fixtures/check-type-ramp/violating.example.tsx', 9, 'off-ramp-style'],
      ['fixtures/check-type-ramp/violating.example.tsx', 9, 'off-ramp-style'],
      ['fixtures/check-type-ramp/violating.example.tsx', 9, 'off-ramp-style'],
      ['fixtures/check-type-ramp/violating.example.tsx', 10, 'off-ramp-style'],
      ['fixtures/check-type-ramp/violating.example.tsx', 10, 'off-ramp-style'],
      ['fixtures/check-type-ramp/violating.example.tsx', 10, 'off-ramp-style'],
      ['fixtures/check-type-ramp/violating.example.tsx', 11, 'deprecated-composite'],
      ['fixtures/check-type-ramp/violating.example.tsx', 12, 'deprecated-composite'],
      ['fixtures/check-type-ramp/violating.example.tsx', 13, 'off-ramp-style'],
    ]);
    expect(new Set(violations.map((v) => v.severity))).toEqual(new Set(['error']));
  });

  it('prints file:line on stderr for a human', () => {
    const run = spawnSync(process.execPath, [GATE], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: 'fixtures/check-type-ramp/violating.example.tsx',
      },
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('fixtures/check-type-ramp/violating.example.tsx:9');
  });

  it('exits 0 on the passing fixture', () => {
    const run = runOn('passing.example.tsx');
    expect(JSON.parse(run.stdout).violations).toEqual([]);
    expect(run.status).toBe(0);
  });

  it('finds nothing in src/ or the token file (pnpm test runs this in CI, where the hook does not)', () => {
    const run = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});

describe('its exemption marker (hds#486)', () => {
  it.each([GATE, 'scripts/__tests__/check-type-ramp.test.mjs'])(
    'is one check-exemptions knows, so pnpm check does not reject it in %s',
    (file) => {
      const run = spawnSync(process.execPath, ['scripts/check-exemptions.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, HDS_FIXTURE_MODE: '1', FIXTURE_FILE: file },
      });
      expect(run.stderr).not.toMatch(/unknown exemption marker "type-ramp-ok"/);
      expect(run.status).toBe(0);
    },
  );
});
