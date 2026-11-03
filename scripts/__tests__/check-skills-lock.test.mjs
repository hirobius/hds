import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runFixtureMode } from './helpers/gate-runner.mjs';
import { useTempDirsPerTest } from './helpers/temp-dirs.mjs';

const SCRIPT = join(ROOT, 'scripts', 'check-skills-lock.mjs');

const tmp = useTempDirsPerTest('check-skills-lock-');

// Runs the gate in fixture mode against a scratch lock file, the same
// FIXTURE_FILE / HDS_FIXTURE_MODE contract check-guardrail-drift.mjs uses.
const run = (lockPath, extraArgs = []) => runFixtureMode(SCRIPT, lockPath, extraArgs);

// One pinned skill, 'demo', at this hash.
const demoLock = (computedHash) => ({
  demo: {
    source: 'owner/repo',
    sourceType: 'github',
    skillPath: 'skills/demo/SKILL.md',
    computedHash,
  },
});

function writeLock(dir, skills) {
  const path = join(dir, 'skills-lock.json');
  writeFileSync(path, JSON.stringify({ version: 1, skills }));
  return path;
}

function installSkill(dir, id, content) {
  const skillDir = join(dir, '.claude', 'skills', id);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), content);
}

describe('check-skills-lock', () => {
  it('passes when the installed skill matches the lock', () => {
    const dir = tmp();
    const content = 'demo skill content\n';
    installSkill(dir, 'demo', content);
    const hash = createHash('sha256').update(content).digest('hex');
    const lockPath = writeLock(dir, demoLock(hash));

    const { code, stdout } = run(lockPath);
    expect(code).toBe(0);
    expect(stdout).toContain('1 skill(s) match the lock');
  });

  it('fails when the skill is not installed', () => {
    const dir = tmp();
    const lockPath = writeLock(dir, demoLock('x'.repeat(64)));

    const { code, stdout } = run(lockPath);
    expect(code).toBe(1);
    expect(stdout).toContain('SKILL_MISSING');
    expect(stdout).toContain('install-skills.mjs');
  });

  it('fails when the installed skill has drifted from the pinned hash', () => {
    const dir = tmp();
    installSkill(dir, 'demo', 'drifted content\n');
    const lockPath = writeLock(dir, demoLock('x'.repeat(64)));

    const { code, stdout } = run(lockPath);
    expect(code).toBe(1);
    expect(stdout).toContain('SKILL_HASH_DRIFT');
  });

  it('emits machine-readable JSON on stdout with --json', () => {
    const dir = tmp();
    const lockPath = writeLock(dir, demoLock('x'.repeat(64)));

    const { code, stdout } = run(lockPath, ['--json']);
    expect(code).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.violations).toHaveLength(1);
    expect(parsed.violations[0].rule).toBe('SKILL_MISSING');
  });
});

// The outcome check for the whole mechanism: the repo's own committed lock must
// verify against the skills committed beside it. Nothing ran the gate on the real
// tree (it is a manual-channel gate), so an impeccable entry whose `paths` were
// repo-root-relative sat red for weeks. A drifted hand-edit, a half-synced bump or
// a lock entry with no installed skill now fails `pnpm test` instead.
describe('this repo', () => {
  it("every skill pinned in the repo's own skills-lock.json is installed and hash-matches", () => {
    let stdout = '';
    let code = 0;
    try {
      stdout = execFileSync('node', [SCRIPT, '--json'], {
        cwd: ROOT,
        env: { ...process.env, HDS_FIXTURE_MODE: '' },
        encoding: 'utf8',
      });
    } catch (err) {
      code = err.status ?? 1;
      stdout = err.stdout ?? '';
    }
    const parsed = JSON.parse(stdout);
    expect(parsed.violations.map((v) => `${v.rule} ${v.file}`)).toEqual([]);
    expect(code).toBe(0);
  });
});
