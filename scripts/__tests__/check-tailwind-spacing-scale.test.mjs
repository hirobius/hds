import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSource } from '../check-tailwind-spacing-scale.mjs';

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
      ['p-5', 'off-scale'],
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
