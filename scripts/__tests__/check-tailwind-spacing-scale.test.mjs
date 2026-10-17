import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSource, ratchet } from '../check-tailwind-spacing-scale.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('tailwind spacing scale: scanSource', () => {
  it('flags numeric spacing utilities, with variants and negatives', () => {
    const src = `<div className="gap-2 p-5 md:px-3 mb-6 -mt-6 hover:p-4" />`;
    const found = scanSource(src).map((f) => f.token);
    expect(found).toEqual(['gap-2', 'p-5', 'md:px-3', 'mb-6', '-mt-6', 'hover:p-4']);
  });

  it('classifies off-scale px values apart from raw on-scale ones', () => {
    const f = scanSource(`x("p-5 gap-2 space-y-1.5 gap-3")`);
    expect(f.map((x) => [x.token, x.kind])).toEqual([
      ['p-5', 'raw-numeric'], // 20px is scale.sm since the 2026-10 bump
      ['gap-2', 'raw-numeric'],
      ['space-y-1.5', 'off-scale'],
      ['gap-3', 'off-scale'],
    ]);
  });

  it('allows zero, auto, px, token-backed and non-spacing classes', () => {
    const src = `"p-0 m-0 mx-auto gap-0 gap-[var(--semantic-space-scale-md)] max-w-2xl top-2 inset-2 w-6 h-4 rounded-lg"`;
    expect(scanSource(src)).toEqual([]);
  });

  it('ignores comment lines', () => {
    expect(scanSource('// gap-2 is banned\n * p-5 too')).toEqual([]);
  });

  it('reports line numbers', () => {
    expect(scanSource('a\n"gap-2"')[0].line).toBe(2);
  });
});

describe('check-tailwind-spacing-scale: canary', () => {
  const run = (...args) =>
    spawnSync(
      process.execPath,
      [
        'scripts/check-tailwind-spacing-scale.mjs',
        '--dir',
        'fixtures/check-tailwind-spacing-scale',
        ...args,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
  it('warn mode exits 0 on the violating fixture', () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('violating.example.tsx');
  });
  it('--strict exits 1 on the violating fixture', () => {
    expect(run('--strict').status).toBe(1);
  });
  it('--strict exits 0 when only the passing fixture is scanned', () => {
    expect(run('--strict', '--only', 'passing.example.tsx').status).toBe(0);
  });
});

describe('check-tailwind-spacing-scale: fixture mode (proof-of-firing)', () => {
  // The proof-of-firing harness runs `node <gate> --fixture-mode` with
  // FIXTURE_FILE pointing at one fixture, and expects exit 1 on the violating
  // file and exit 0 on the passing one. Before this, the gate ignored
  // --fixture-mode, scanned src/app/components, and was WARN-only (exit 0) — so
  // it could never fire against its own fixture (proof-of-firing was blind).
  const runFixture = (fixtureFile) =>
    spawnSync(process.execPath, ['scripts/check-tailwind-spacing-scale.mjs', '--fixture-mode'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: path.join(ROOT, 'fixtures', 'check-tailwind-spacing-scale', fixtureFile),
      },
    });

  it('exits 1 on the violating fixture (gate fires)', () => {
    const r = runFixture('violating.example.tsx');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('violating.example.tsx');
  });

  it('exits 0 on the passing fixture (no false positive)', () => {
    expect(runFixture('passing.example.tsx').status).toBe(0);
  });
});

describe('tailwind spacing scale: primitive and deprecated steps (2026-10 spacing prune)', () => {
  it('flags primitive spacing vars and hds.space members, not semantic ones', () => {
    const src = `x("p-[var(--primitive-space-4)]", hds.space.px16, hds.semantic.space.scale.md, "var(--semantic-space-scale-sm)")`;
    expect(scanSource(src).map((f) => [f.token, f.kind])).toEqual([
      ['--primitive-space-4', 'primitive-var'],
      ['hds.space.px16', 'primitive-member'],
    ]);
  });

  it('flags the deprecated off-grid steps in every spelling', () => {
    const src = `x("p-px6 md:-mt-px10", "var(--primitive-space-px6)", hds.space.px10)`;
    expect(scanSource(src).map((f) => [f.token, f.kind])).toEqual([
      ['p-px6', 'deprecated-step'],
      ['md:-mt-px10', 'deprecated-step'],
      ['--primitive-space-px6', 'deprecated-step'],
      ['hds.space.px10', 'deprecated-step'],
    ]);
  });

  it('leaves the subgrid primitives px1/px2 (hairlines) to the primitive-var kind', () => {
    expect(scanSource(`"var(--primitive-space-px1)"`).map((f) => f.kind)).toEqual([
      'primitive-var',
    ]);
  });
});

describe('tailwind spacing scale: ratchet', () => {
  const f = (file, kind) => ({ file, kind });
  it('passes when every file matches its baseline exactly', () => {
    const r = ratchet([f('a.tsx', 'off-scale'), f('a.tsx', 'raw-numeric')], { 'a.tsx': 2 });
    expect(r.failures).toEqual([]);
  });
  it('fails a file that grew past its baseline, or a new file with findings', () => {
    const r = ratchet(
      [f('a.tsx', 'off-scale'), f('a.tsx', 'off-scale'), f('b.tsx', 'raw-numeric')],
      {
        'a.tsx': 1,
      },
    );
    expect(r.failures.map((x) => x.file)).toEqual(['a.tsx', 'b.tsx']);
  });
  it('fails a stale baseline (a file that dropped below it) so the ratchet only tightens', () => {
    const r = ratchet([], { 'a.tsx': 3 });
    expect(r.failures).toEqual([{ file: 'a.tsx', baseline: 3, count: 0, reason: 'stale' }]);
  });
  it('never baselines a deprecated step', () => {
    const r = ratchet([f('a.tsx', 'deprecated-step')], { 'a.tsx': 5 });
    expect(r.failures.map((x) => x.reason)).toContain('deprecated');
  });
});

describe('check-tailwind-spacing-scale --ratchet on the real tree', () => {
  it('src/app/components matches the committed baseline (pretest runs this)', () => {
    const r = spawnSync(
      process.execPath,
      ['scripts/check-tailwind-spacing-scale.mjs', '--ratchet'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    expect(r.stdout + r.stderr).toMatch(/ratchet ok/);
    expect(r.status).toBe(0);
  });
});
