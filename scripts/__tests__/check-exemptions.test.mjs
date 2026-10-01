/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-exemptions.mjs keeps escape-hatch markers known and reasoned.
 *
 * Its MARKERS list is the one vocabulary every `// <name>-ok: <reason>` marker
 * has to come from, so a marker another gate defines and tells users to reach
 * for (check-spacing-vocabulary's `spacing-vocab-ok`, the motion-animate test's
 * `motion-animate-var-ok`) has to be listed there too, or the two gates
 * disagree and `pnpm check:exemptions` fails on the sibling gate's own docs
 * (hds#372 Done item). Each case runs the gate in its fixture mode against one
 * file, so the result never depends on the rest of the repo.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(REPO_ROOT, 'scripts', 'check-exemptions.mjs');
const FIXTURES = path.join(REPO_ROOT, 'fixtures', 'check-exemptions');

let tmp;

beforeAll(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'check-exemptions-'));
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function runOn(file) {
  return spawnSync(process.execPath, [GATE, '--fixture-mode'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, FIXTURE_FILE: file },
  });
}

function runOnText(name, text) {
  const file = path.join(tmp, name);
  writeFileSync(file, text);
  return runOn(file);
}

describe('check-exemptions', () => {
  it('passes the passing fixture', () => {
    const r = runOn(path.join(FIXTURES, 'passing.example.md'));
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('fails the violating fixture: an unknown marker and a marker with no reason', () => {
    const r = runOn(path.join(FIXTURES, 'violating.example.md'));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('unknown exemption marker "widget-ok"');
    expect(r.stderr).toContain('exemption "layout-ok" is missing a usable reason');
  });

  it.each([
    ['spacing-vocab-ok', 'scripts/check-spacing-vocabulary.mjs'],
    ['motion-animate-var-ok', 'src/app/components/__tests__/no-css-var-in-motion-animate.test.ts'],
  ])('knows %s, the marker %s documents', (marker) => {
    const r = runOnText(`${marker}.ts`, `const x = 1; // ${marker}: intentional exception\n`);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('still wants a reason after a sibling-gate marker', () => {
    const r = runOnText('no-reason.ts', 'const x = 1; // spacing-vocab-ok:\n');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('exemption "spacing-vocab-ok" is missing a usable reason');
  });
});
