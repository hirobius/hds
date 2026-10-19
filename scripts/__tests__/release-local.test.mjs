/**
 * Tests for scripts/release-local.mjs — the publish path that needs no GitHub Actions (ops#771).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  parseArgs,
  pendingChangesets,
  preflight,
  publishStep,
  runSteps,
  fetchMainOrThrow,
} from '../release-local.mjs';

const ready = {
  publish: true,
  ref: 'origin/main',
  dirty: false,
  head: 'abc1234def',
  refSha: 'abc1234def',
  pending: [],
  version: '0.27.0',
  published: ['0.26.1', '0.26.2'],
  npmUser: 'hirobius',
};

describe('parseArgs', () => {
  it('is a dry run against origin/main by default', () => {
    expect(parseArgs([])).toEqual({ publish: false, ref: 'origin/main' });
  });
  it('publishes only with --publish', () => {
    expect(parseArgs(['--publish']).publish).toBe(true);
    expect(parseArgs(['--publish', '--dry-run']).publish).toBe(false);
  });
  it('takes --ref in both spellings', () => {
    expect(parseArgs(['--ref', 'HEAD']).ref).toBe('HEAD');
    expect(parseArgs(['--ref=v1']).ref).toBe('v1');
  });
  it('rejects --ref with --publish, in any order and spelling', () => {
    const msg = /--ref is for dry runs only; publish runs from origin\/main/;
    expect(() => parseArgs(['--publish', '--ref', 'HEAD'])).toThrow(msg);
    expect(() => parseArgs(['--ref=HEAD', '--publish'])).toThrow(msg);
  });
  it('keeps --ref for dry runs', () => {
    expect(parseArgs(['--dry-run', '--ref', 'HEAD'])).toEqual({ publish: false, ref: 'HEAD' });
  });
  it('rejects unknown flags so a typo never publishes', () => {
    expect(() => parseArgs(['--publsh'])).toThrow(/Unknown option/);
  });
});

describe('pendingChangesets', () => {
  it('counts entries, not the README or config', () => {
    expect(pendingChangesets(['README.md', 'config.json', 'b-two.md', 'a-one.md'])).toEqual([
      'a-one.md',
      'b-two.md',
    ]);
  });
});

describe('preflight', () => {
  it('goes on a clean, versioned main with an unpublished version', () => {
    expect(preflight(ready)).toEqual({ go: true, nothingToDo: false, problems: [] });
  });
  it('stops on a dirty tree', () => {
    const v = preflight({ ...ready, dirty: true });
    expect(v.go).toBe(false);
    expect(v.problems.join()).toMatch(/working tree/);
  });
  it('stops when HEAD is not origin/main', () => {
    const v = preflight({ ...ready, refSha: 'fff0000' });
    expect(v.go).toBe(false);
    expect(v.problems.join()).toMatch(/git pull --ff-only/);
  });
  it('stops on unversioned changesets and names the Version Packages PR', () => {
    const v = preflight({ ...ready, pending: ['x.md'] });
    expect(v.go).toBe(false);
    expect(v.problems.join()).toMatch(/Version Packages/);
  });
  it('needs npm login only for a real publish', () => {
    expect(preflight({ ...ready, npmUser: null }).problems.join()).toMatch(/npm login/);
    expect(preflight({ ...ready, publish: false, npmUser: null }).go).toBe(true);
  });
  it('does nothing when the version is already on npm', () => {
    const v = preflight({ ...ready, version: '0.26.2', npmUser: null });
    expect(v).toEqual({ go: false, nothingToDo: true, problems: [] });
  });
});

describe('publishStep', () => {
  it('dry run packs without publishing', () => {
    expect(publishStep(false)).toEqual(['pnpm', ['publish', '--dry-run', '--no-git-checks']]);
  });
  it('real run uses changeset publish, like the Actions release', () => {
    expect(publishStep(true)).toEqual(['pnpm', ['exec', 'changeset', 'publish']]);
  });
});

describe('runSteps', () => {
  it('installs from the frozen lockfile before anything else', () => {
    expect(runSteps(false)[0]).toEqual(['pnpm', ['install', '--frozen-lockfile']]);
    expect(runSteps(true)[0]).toEqual(['pnpm', ['install', '--frozen-lockfile']]);
  });
  it('then builds, smokes, and ends with the publish step', () => {
    const steps = runSteps(true);
    expect(steps.slice(1, 3)).toEqual([
      ['pnpm', ['build:lib']],
      ['pnpm', ['smoke:consumer', '--skip-build']],
    ]);
    expect(steps[3]).toEqual(publishStep(true));
  });
});

describe('fetchMainOrThrow', () => {
  it('passes when the fetch worked', () => {
    expect(() => fetchMainOrThrow({ ok: true, err: '' })).not.toThrow();
  });
  it('stops with an actionable message instead of using a stale ref', () => {
    expect(() => fetchMainOrThrow({ ok: false, err: 'fatal: unable to access' })).toThrow(
      /Could not fetch origin\/main; check your network and retry/,
    );
  });
});

describe('package.json wiring', () => {
  const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  it('exposes pnpm release:local', () => {
    expect(pkg.scripts['release:local']).toBe('node scripts/release-local.mjs');
  });
  it('builds and smokes the same way as the Actions release', () => {
    expect(pkg.scripts.release).toMatch(
      /pnpm build:lib && pnpm smoke:consumer --skip-build && changeset publish/,
    );
  });
});
