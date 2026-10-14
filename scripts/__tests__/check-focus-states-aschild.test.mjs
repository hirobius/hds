/**
 * check-focus-states: a raw <a> or <button> that is the child of a
 * `Card asChild` or `Button asChild` takes the parent's hds-focus ring
 * (the Slot merges it onto the child), so it is not MISSING FOCUS. A bare
 * <a> with no ring still is.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

function run(source) {
  const file = join(mkdtempSync(join(tmpdir(), 'focus-aschild-')), 'probe.tsx');
  writeFileSync(file, source);
  try {
    execFileSync('node', ['scripts/check-focus-states.mjs', '--fixture-mode'], {
      cwd: root,
      env: { ...process.env, FIXTURE_FILE: file },
      stdio: 'pipe',
    });
    return 0;
  } catch (err) {
    return err.status;
  }
}

describe('check-focus-states and asChild', () => {
  it('passes a link that is the child of Card asChild', () => {
    expect(
      run(`export const A = () => (
  <Card asChild>
    <a href="/x">
      Go
    </a>
  </Card>
);
`),
    ).toBe(0);
  });

  it('passes a link that is the child of Button asChild', () => {
    expect(
      run(`export const A = () => (
  <Button asChild variant="primary">
    <a href="tel:1">
      Call
    </a>
  </Button>
);
`),
    ).toBe(0);
  });

  it('still fails a link inside a Card that is not asChild', () => {
    expect(
      run(`export const A = () => (
  <Card>
    <a href="/x">
      Go
    </a>
  </Card>
);
`),
    ).toBe(1);
  });

  it('still fails a link inside a component other than Card or Button asChild', () => {
    expect(
      run(`export const A = () => (
  <Banner asChild>
    <a href="/x">
      Go
    </a>
  </Banner>
);
`),
    ).toBe(1);
  });

  it('still fails a bare link with no focus ring', () => {
    expect(
      run(`export const A = () => (
  <div>
    <a href="/x">
      Go
    </a>
  </div>
);
`),
    ).toBe(1);
  });
});
