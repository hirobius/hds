/**
 * check-surface-radius: a surface (Card, Callout, Alert, Dialog, Popover, Menu,
 * Toast, …) takes the surface radius, the same as Card. A surface on the action
 * radius, or on a raw radius value, fails; a nested element one step down passes
 * only when it says why (`radius-ok:`).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

function run(file) {
  try {
    const out = execFileSync('node', ['scripts/check-surface-radius.mjs', '--fixture-mode'], {
      cwd: root,
      env: { ...process.env, FIXTURE_FILE: file },
      stdio: 'pipe',
    });
    return { status: 0, out: String(out) };
  } catch (err) {
    return { status: err.status, out: String(err.stdout) + String(err.stderr) };
  }
}

function probe(source) {
  const file = join(mkdtempSync(join(tmpdir(), 'surface-radius-')), 'probe.tsx');
  writeFileSync(file, source);
  return run(file);
}

describe('check-surface-radius', () => {
  it('passes the passing fixture', () => {
    expect(run(join(root, 'fixtures/check-surface-radius/passing.example.tsx')).status).toBe(0);
  });

  it('fails the violating fixture (action radius + raw value)', () => {
    const { status, out } = run(join(root, 'fixtures/check-surface-radius/violating.example.tsx'));
    expect(status).toBe(1);
    expect(out).toContain('rounded-md');
    expect(out).toContain('borderRadius');
  });

  it('fails a surface with no surface radius at all', () => {
    expect(probe(`const a = 'border p-4';\n`).status).toBe(1);
  });

  it('fails an arbitrary px radius', () => {
    expect(probe(`const a = 'rounded-lg';\nconst b = 'rounded-[6px]';\n`).status).toBe(1);
  });

  it('fails a primitive radius var (not tenant-aware)', () => {
    expect(
      probe(`const a = 'rounded-lg';\nconst b = 'rounded-[var(--primitive-radius-4)]';\n`).status,
    ).toBe(1);
  });

  it('fails the surface radius var: it ignores the tenant, rounded-lg follows it', () => {
    const { status, out } = probe(`const a = 'rounded-[var(--semantic-radius-surface)] p-4';\n`);
    expect(status).toBe(1);
    expect(out).toContain('RAW RADIUS');
  });

  it('accepts a nested step-down with a radius-ok note on the same line', () => {
    expect(
      probe(`const a = 'rounded-lg';\nconst b = 'rounded-sm'; // radius-ok: close button\n`).status,
    ).toBe(0);
  });

  it('scans every surface in the repo clean', () => {
    const out = execFileSync('node', ['scripts/check-surface-radius.mjs'], {
      cwd: root,
      stdio: 'pipe',
    });
    expect(String(out)).toContain('surface');
  });
});
