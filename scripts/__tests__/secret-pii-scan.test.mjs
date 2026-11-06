// Vendored from hirobius/ops scripts/__tests__/secret-pii-scan.test.mjs (ops#943),
// plus hds-only cases: the fixtures under fixtures/secret-pii-scan/ through real
// gitleaks with hds's .gitleaks.toml, fail-closed without gitleaks, and the
// .husky/pre-push wiring through scripts/hook-run.mjs (which must forward git's
// pre-push stdin, or the scan sees no refs and passes everything).
// Lines holding fake PII carry `pii-allow` so pushing this file passes the scan.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPii, resolveRanges, parsePushLines } from '../hooks/secret-pii-scan.mjs';
import { parseHookStages } from '../lib/hook-output.mjs';
import { expandHookLanes } from '../lib/gate-lanes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'hooks', 'secret-pii-scan.mjs');
const FIXTURES = join(ROOT, 'fixtures', 'secret-pii-scan');
const ZERO = '0'.repeat(40);
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const HAS_GITLEAKS = spawnSync('gitleaks', ['version'], { stdio: 'ignore' }).status === 0;

describe('findPii', () => {
  it('flags real-looking emails, US phones and SSNs on added lines only', () => {
    const diff = [
      '+++ b/notes.txt',
      '+call 509-555-2368 or mail jane.doe@acme-roofing.com', // pii-allow
      '+ssn 123-45-6789', // pii-allow
      '-old 509-555-2368', // pii-allow
      ' context jane.doe@acme-roofing.com', // pii-allow
    ].join('\n');
    expect(findPii(diff).map((f) => f.rule)).toEqual(['email', 'phone', 'ssn']);
  });
  it('ignores placeholders, noreply addresses and pii-allow lines', () => {
    const diff = [
      '+++ b/a.txt',
      '+x@example.com noreply@anthropic.com 1+bot@users.noreply.github.com',
      '+fake 509-555-0142',
      '+real 509-555-2368 # pii-allow',
    ].join('\n');
    expect(findPii(diff)).toEqual([]);
  });
  it('never returns the matched value', () => {
    const [f] = findPii('+++ b/a.txt\n+jane.doe@acme-roofing.com'); // pii-allow
    expect(JSON.stringify(f)).not.toContain('jane');
    expect(f).toMatchObject({ rule: 'email', file: 'a.txt', length: 25 });
  });
});

describe('resolveRanges', () => {
  const git = { commitExists: () => true, mergeBase: () => C, isAncestor: () => true };
  it('scans remote..local, merge-base..local for a new branch, skips deletions', () => {
    const lines = parsePushLines(
      `refs/heads/x ${A} refs/heads/x ${B}\nrefs/heads/y ${A} refs/heads/y ${ZERO}\nrefs/heads/z ${ZERO} refs/heads/z ${B}\n`,
    );
    expect(resolveRanges(lines, git)).toEqual([`${B}..${A}`, `${C}..${A}`]);
  });
  it('falls back to the merge-base when main was merged in', () => {
    const lines = parsePushLines(`refs/heads/x ${A} refs/heads/x ${B}`);
    expect(resolveRanges(lines, { ...git, isAncestor: () => false })).toEqual([`${C}..${A}`]);
  });
  it('rejects a malformed stdin line', () => {
    expect(() => parsePushLines('garbage')).toThrow(/40-character/);
  });
});

/** Throwaway repo: main + branch x that adds `content` to `file`. */
function repo(content, { file = 'a.txt', gitleaksConfig = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'spscan-'));
  const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@example.com');
  g('config', 'user.name', 't');
  g('config', 'commit.gpgsign', 'false');
  writeFileSync(join(dir, 'a.txt'), 'start\n');
  if (gitleaksConfig) copyFileSync(join(ROOT, '.gitleaks.toml'), join(dir, '.gitleaks.toml'));
  g('add', '.');
  g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  g('checkout', '-qb', 'x');
  writeFileSync(join(dir, file), file === 'a.txt' ? `start\n${content}\n` : content);
  g('add', '.');
  g('commit', '-qm', 'change');
  const head = g('rev-parse', 'HEAD').stdout.trim();
  return { dir, g, input: `refs/heads/x ${head} refs/heads/x ${base}\n` };
}
const run = ({ dir, input }, env = { SKIP_SECRET_SCAN: '1' }) =>
  spawnSync('node', [SCRIPT], {
    cwd: dir,
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

describe('end to end in a throwaway repo', () => {
  it('passes a clean push', () => {
    const r = repo('hello world');
    const out = run(r);
    rmSync(r.dir, { recursive: true, force: true });
    expect(out.status).toBe(0);
  });
  it('fails a push that adds an email, without printing it', () => {
    const r = repo('mail jane.doe@acme-roofing.com'); // pii-allow
    const out = run(r);
    rmSync(r.dir, { recursive: true, force: true });
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/email .*a\.txt/);
    expect(out.stdout + out.stderr).not.toContain('jane.doe');
  });
});

describe('hds fixtures through gitleaks + .gitleaks.toml', () => {
  // The hook fails closed without gitleaks, so anyone who can push has it.
  // CI must not skip: there a missing binary fails this suite.
  const needsGitleaks = HAS_GITLEAKS || process.env.CI ? it : it.skip;
  const fixture = (name) => readFileSync(join(FIXTURES, name), 'utf8');

  it('the violating fixture holds an obviously fake token, not a real one', () => {
    expect(fixture('violating.example.txt')).toMatch(/ghp_FAKEfake/);
  });
  needsGitleaks('blocks a push that adds the fake-secret fixture, redacted', () => {
    const r = repo(fixture('violating.example.txt'), { file: 'leak.env', gitleaksConfig: true });
    const out = run(r, { SKIP_SECRET_SCAN: '' });
    rmSync(r.dir, { recursive: true, force: true });
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/FAIL secrets in [0-9a-f]{40}\.\.[0-9a-f]{40}/);
    expect(out.stdout + out.stderr).not.toContain('ghp_FAKEfake');
  });
  needsGitleaks('passes a push that adds the clean fixture', () => {
    const r = repo(fixture('passing.example.txt'), { file: 'ok.env', gitleaksConfig: true });
    const out = run(r, { SKIP_SECRET_SCAN: '' });
    rmSync(r.dir, { recursive: true, force: true });
    expect(out.stderr).not.toContain('FAIL');
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('1 range(s) clean');
  });
  it('fails closed with the install command when gitleaks is missing', () => {
    const r = repo(fixture('passing.example.txt'), { file: 'ok.env' });
    const bin = mkdtempSync(join(tmpdir(), 'spscan-bin-'));
    for (const tool of ['git', 'node']) {
      const p = spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
      symlinkSync(p, join(bin, tool));
    }
    const out = spawnSync(join(bin, 'node'), [SCRIPT], {
      cwd: r.dir,
      input: r.input,
      encoding: 'utf8',
      env: { ...process.env, PATH: bin, SKIP_SECRET_SCAN: '' },
    });
    rmSync(r.dir, { recursive: true, force: true });
    rmSync(bin, { recursive: true, force: true });
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/gitleaks is not installed.*brew install gitleaks/);
  });
});

describe('.husky/pre-push wiring', () => {
  it('runs the scan as the first stage', () => {
    // The hook's stages live in the registry's pre-push lane (hds#1095).
    const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
    const hook = readFileSync(join(ROOT, '.husky', 'pre-push'), 'utf8');
    const [first] = parseHookStages(expandHookLanes(hook, registry));
    expect(first.commands).toEqual(['node scripts/hooks/secret-pii-scan.mjs']);
  });
  it('hook-run.mjs forwards git pre-push stdin to the scan, so a leak blocks the push', () => {
    const r = repo('mail jane.doe@acme-roofing.com'); // pii-allow
    mkdirSync(join(r.dir, '.husky'));
    mkdirSync(join(r.dir, 'scripts', 'hooks'), { recursive: true });
    copyFileSync(join(ROOT, '.husky', 'pre-push'), join(r.dir, '.husky', 'pre-push'));
    mkdirSync(join(r.dir, 'docs', 'guardrails'), { recursive: true });
    copyFileSync(
      join(ROOT, 'docs/guardrails/registry.json'),
      join(r.dir, 'docs/guardrails/registry.json'),
    );
    copyFileSync(SCRIPT, join(r.dir, 'scripts', 'hooks', 'secret-pii-scan.mjs'));
    const out = spawnSync('node', [join(ROOT, 'scripts', 'hook-run.mjs'), 'pre-push'], {
      cwd: r.dir,
      input: r.input,
      encoding: 'utf8',
      env: { ...process.env, SKIP_SECRET_SCAN: '1', HOOK_VERBOSE: '' },
    });
    rmSync(r.dir, { recursive: true, force: true });
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/pre-push: secret-pii-scan failed/);
    expect(out.stderr).toMatch(/FAIL email in a\.txt/);
  });
});
