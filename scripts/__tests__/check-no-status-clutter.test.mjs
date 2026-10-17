/** @internal — not part of @hirobius/design-system public API surface. */
/** Unit tests for scripts/check-no-status-clutter.mjs (hds#759). */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findViolationsInText } from '../check-no-status-clutter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = 'scripts/check-no-status-clutter.mjs';
const find = (text, file = 'fake.tsx') => findViolationsInText(text, file);

describe('findViolationsInText', () => {
  it('flags a dot prop on Badge, also across lines', () => {
    expect(find('<Badge dot tone="success" />')).toHaveLength(1);
    expect(find('<Badge\n  tone="danger"\n  dot\n/>')).toHaveLength(1);
    expect(find('<Badge tone="danger">Applied</Badge>')).toHaveLength(0);
  });

  it('flags a tone-coloured left bar on a card or tile', () => {
    expect(find('<div className="border-l-4 border-l-feedback-success p-4" />')).toHaveLength(1);
    expect(find('<div className="border-l-[3px] border-primary" />')).toHaveLength(1);
  });

  it('allows a neutral left rule and a full border', () => {
    expect(find('<blockquote className="border-l-2 border-border pl-4" />')).toHaveLength(0);
    expect(find('<Card className="border border-feedback-danger" />')).toHaveLength(0);
  });

  it('flags --hds-accent-bar and the board dot', () => {
    expect(find('.t { border-left: 3px solid var(--hds-accent-bar); }', 'x.css')).toHaveLength(1);
    expect(find('<span data-hds-board-dot="" />')).toHaveLength(1);
  });

  it('skips comments and honours the marker, which needs a reason', () => {
    expect(find('// <Badge dot /> was removed')).toHaveLength(0);
    expect(find('// status-clutter-ok: legacy demo\n<Badge dot />')).toHaveLength(0);
    expect(find('<Badge dot /> // status-clutter-ok:').map((v) => v.rule)).toEqual([
      'status-clutter-ok-needs-reason',
    ]);
  });
});

describe('check-no-status-clutter: registry, pretest, fixtures and the repo', () => {
  const run = (env = {}) =>
    spawnSync(process.execPath, [GATE, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });

  it('is registered as an error and wired into pretest', () => {
    const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
    const entry = registry.gates.find((g) => g.id === 'check-no-status-clutter');
    expect(entry).toMatchObject({
      gateScript: GATE,
      severity: 'error',
      firingChannel: 'pnpm-meta',
    });
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.pretest).toContain('node scripts/check-no-status-clutter.mjs');
  });

  it('fails the violating fixture and passes the clean one', () => {
    const bad = run({
      HDS_FIXTURE_MODE: '1',
      FIXTURE_FILE: 'fixtures/check-no-status-clutter/violating.example.tsx',
    });
    expect(bad.status).toBe(1);
    expect(JSON.parse(bad.stdout).summary.total).toBeGreaterThanOrEqual(4);
    const ok = run({
      HDS_FIXTURE_MODE: '1',
      FIXTURE_FILE: 'fixtures/check-no-status-clutter/passing.example.tsx',
    });
    expect(ok.status).toBe(0);
  });

  it('passes over the repo', () => {
    expect(run().status).toBe(0);
  });
});
