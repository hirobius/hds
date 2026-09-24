/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Canary for hds#277 — proves `check-sync-map.mjs --check` actually detects
 * drift in the committed docs/sync-map.json, rather than the gate existing
 * with nothing that runs it in a failing way (the bug this issue reports:
 * the file is committed generated output with `$comment: "Do not
 * hand-edit."`, but nothing ran the generator in a way that would fail on
 * drift).
 *
 * Runs the real CLI as a subprocess against the real repo tree (this gate
 * reads docs/hds-manifest.json, Storybook stories and Figma disposition —
 * too much surface to fixture-mode cheaply) and restores the original file
 * in a finally block so a failing assertion never leaves docs/sync-map.json
 * corrupted on disk.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(ROOT, 'scripts', 'check-sync-map.mjs');
const SYNC_MAP = path.join(ROOT, 'docs', 'sync-map.json');

let original;

beforeAll(() => {
  original = readFileSync(SYNC_MAP, 'utf8');
});

afterAll(() => {
  writeFileSync(SYNC_MAP, original);
});

function runCheck() {
  try {
    const stdout = execFileSync(process.execPath, [GATE, '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

describe('check-sync-map --check', () => {
  it('passes against the committed, up-to-date docs/sync-map.json', () => {
    const result = runCheck();
    expect(result.status).toBe(0);
  }, 20000);

  it('fails and names the component when a row is hand-edited', () => {
    const parsed = JSON.parse(original);
    const row = parsed.rows.find((r) => r.name === 'Button') ?? parsed.rows[0];
    row.synced = !row.synced;
    writeFileSync(SYNC_MAP, JSON.stringify(parsed, null, 2));

    const result = runCheck();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/out of date/);
    expect(result.stderr).toContain(row.name);

    writeFileSync(SYNC_MAP, original);
  }, 20000);
});
