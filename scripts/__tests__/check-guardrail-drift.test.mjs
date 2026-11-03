import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ROOT, runFixtureMode } from './helpers/gate-runner.mjs';
import { useTempDirsPerTest } from './helpers/temp-dirs.mjs';

const SCRIPT = join(ROOT, 'scripts', 'check-guardrail-drift.mjs');

const tmp = useTempDirsPerTest('guardrail-drift-');

// Runs the gate against a scratch manifest via fixture-mode plumbing (the same
// FIXTURE_FILE / HDS_FIXTURE_MODE contract validate-fixture-proof-of-firing
// uses), so tests never touch the real docs/guardrails/shared-manifest.json.
const run = (manifestPath, extraArgs = []) => runFixtureMode(SCRIPT, manifestPath, extraArgs);

function writeManifest(dir, files) {
  const path = join(dir, 'manifest.json');
  writeFileSync(path, JSON.stringify({ canonicalRepo: 'hirobius/ops', files }));
  return path;
}

// A scratch target.txt in a manifest that --write has pinned.
function pinnedTarget() {
  const dir = tmp();
  const target = join(dir, 'target.txt');
  writeFileSync(target, 'stable content\n');
  const manifest = writeManifest(dir, { [target]: '' });
  run(manifest, ['--write']);
  return { target, manifest };
}

describe('check-guardrail-drift', () => {
  it('exits 2 when the manifest is missing', () => {
    const dir = tmp();
    const { code } = run(join(dir, 'does-not-exist.json'));
    expect(code).toBe(2);
  });

  it('--write pins the current hash, then verify exits 0', () => {
    const dir = tmp();
    const target = join(dir, 'target.txt');
    writeFileSync(target, 'stable content\n');
    const manifest = writeManifest(dir, { [target]: '' });

    const written = run(manifest, ['--write']);
    expect(written.code).toBe(0);

    const verified = run(manifest);
    expect(verified.code).toBe(0);
    expect(JSON.parse(readFileSync(manifest, 'utf8')).files[target]).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
  });

  it('flags drift once a pinned file changes', () => {
    const { target, manifest } = pinnedTarget();

    appendFileSync(target, 'a rogue byte\n');
    const { code, stdout } = run(manifest);
    expect(code).toBe(1);
    expect(stdout + '').toMatch(/\[drift\]/);
  });

  it('--json reports structured findings on drift', () => {
    const { target, manifest } = pinnedTarget();
    appendFileSync(target, 'a rogue byte\n');

    const { code, stdout } = run(manifest, ['--json']);
    expect(code).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.findings[0].kind).toBe('drift');
  });

  it('reports a deleted pinned file as missing', () => {
    const { target, manifest } = pinnedTarget();

    unlinkSync(target);
    const { code, stdout } = run(manifest);
    expect(code).toBe(1);
    expect(stdout + '').toMatch(/\[missing\]/);
  });

  it('a consumer manifest refuses --write, so a sibling cannot re-pin away its own drift', () => {
    // hds / site-engine / folio / Ralph carry a subset of the canonical manifest with
    // "role": "consumer". Re-pinning there would turn "a shared fix has not
    // propagated" into a green gate, which is the failure this file exists to catch.
    const dir = tmp();
    const target = join(dir, 'target.txt');
    writeFileSync(target, 'stable content\n');
    const manifest = join(dir, 'manifest.json');
    const pinned = `sha256:${createHash('sha256').update('stable content\n').digest('hex')}`;
    writeFileSync(
      manifest,
      JSON.stringify({
        canonicalRepo: 'hirobius/ops',
        role: 'consumer',
        files: { [target]: pinned },
      }),
    );
    appendFileSync(target, 'a local edit\n');

    const written = run(manifest, ['--write']);
    expect(written.code).toBe(2);
    expect(written.stdout).toContain('consumer');
    expect(written.stdout).toContain('hirobius/ops');
    expect(JSON.parse(readFileSync(manifest, 'utf8')).files[target]).toBe(pinned);

    // Verify mode is unaffected: the local edit is still reported as drift.
    expect(run(manifest).code).toBe(1);
  });

  it('the committed manifest matches the real shared scripts (no drift in this repo)', () => {
    let code = 0;
    let stdout = '';
    try {
      stdout = execFileSync('node', [SCRIPT, '--json'], { cwd: ROOT, encoding: 'utf8' });
    } catch (err) {
      code = err.status ?? 1;
      stdout = err.stdout ?? '';
    }
    expect(code).toBe(0);
    expect(JSON.parse(stdout).ok).toBe(true);
  });
});
