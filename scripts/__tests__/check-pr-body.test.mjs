import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkPrBody, extractBashBody } from '../hooks/check-pr-body.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'check-pr-body.mjs');
const FULL =
  '## Summary\nx\n\n## Evidence\ny\n\n## Merge Danger\nz\n\nReviewed: /code-review, 0 hard\n';

function run(payload) {
  const r = spawnSync('node', [SCRIPT], { input: JSON.stringify(payload), encoding: 'utf8' });
  return { code: r.status, stderr: r.stderr, stdout: r.stdout };
}

describe('checkPrBody', () => {
  it('passes when everything is present', () => {
    expect(checkPrBody(FULL)).toEqual({ ok: true, missing: [] });
  });
  it.each(['## Summary', '## Evidence', '## Merge Danger'])('flags missing %s', (h) => {
    const r = checkPrBody(FULL.replace(h, '## Other'));
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual([h]);
  });
  it('flags missing Reviewed line', () => {
    const r = checkPrBody(FULL.replace(/Reviewed:.*/, ''));
    expect(r.missing).toEqual(['Reviewed: line']);
  });
  it('treats empty body as everything missing', () => {
    expect(checkPrBody(undefined).missing).toHaveLength(4);
  });
});

describe('hook CLI', () => {
  it('blocks create_pull_request with a bad body (exit 2, one stderr line)', () => {
    const r = run({ tool_name: 'mcp__github__create_pull_request', tool_input: { body: 'hi' } });
    expect(r.code).toBe(2);
    expect(r.stderr.trim().split('\n')).toHaveLength(1);
    expect(r.stderr).toContain(
      'PR body missing: ## Summary, ## Evidence, ## Merge Danger, Reviewed: line.',
    );
  });
  it('allows create_pull_request with a full body', () => {
    const r = run({ tool_name: 'mcp__github__create_pull_request', tool_input: { body: FULL } });
    expect(r).toMatchObject({ code: 0, stderr: '', stdout: '' });
  });
  it('allows update_pull_request without a body', () => {
    expect(
      run({ tool_name: 'mcp__github__update_pull_request', tool_input: { title: 't' } }).code,
    ).toBe(0);
  });
  it('checks update_pull_request when a body is present', () => {
    expect(
      run({ tool_name: 'mcp__github__update_pull_request', tool_input: { body: 'x' } }).code,
    ).toBe(2);
  });
  it('blocks Bash gh pr create with a bad --body', () => {
    const r = run({
      tool_name: 'Bash',
      tool_input: { command: 'gh pr create --title t --body "nope"' },
    });
    expect(r.code).toBe(2);
  });
  it('allows Bash gh pr create with a full --body (heredoc form)', () => {
    const cmd = `gh pr create --title t --body "$(cat <<'EOF'\n${FULL}EOF\n)"`;
    expect(run({ tool_name: 'Bash', tool_input: { command: cmd } }).code).toBe(0);
  });
  it('reads --body-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prbody-'));
    try {
      const f = join(dir, 'b.md');
      writeFileSync(f, FULL);
      expect(
        run({ tool_name: 'Bash', tool_input: { command: `gh pr create --body-file ${f}` } }).code,
      ).toBe(0);
      writeFileSync(f, 'bad');
      expect(run({ tool_name: 'Bash', tool_input: { command: `gh pr create -F ${f}` } }).code).toBe(
        2,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('allows with a stderr note when the body cannot be extracted', () => {
    const r = run({ tool_name: 'Bash', tool_input: { command: 'gh pr create --title t' } });
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('could not extract');
  });
  it('allows an unexpandable --body "$VAR" with a stderr note', () => {
    const r = run({ tool_name: 'Bash', tool_input: { command: 'gh pr create --body "$BODY"' } });
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('could not extract');
  });
  it.each(['--fill', '--fill-first', '--fill-verbose'])('blocks %s with no body flag', (f) => {
    const r = run({ tool_name: 'Bash', tool_input: { command: `gh pr create ${f}` } });
    expect(r.code).toBe(2);
    expect(r.stderr.trim().split('\n')).toHaveLength(1);
    expect(r.stderr).toContain('PR body missing');
  });
  it('--fill with a valid body is allowed', () => {
    const cmd = `gh pr create --fill --body "${FULL}"`;
    expect(run({ tool_name: 'Bash', tool_input: { command: cmd } }).code).toBe(0);
  });
  it('blocks --web with the same reason', () => {
    const fill = run({ tool_name: 'Bash', tool_input: { command: 'gh pr create --fill' } });
    const web = run({ tool_name: 'Bash', tool_input: { command: 'gh pr create --web' } });
    expect(web.code).toBe(2);
    expect(web.stderr).toBe(fill.stderr);
  });
  it('checks a draft: true create_pull_request', () => {
    const bad = run({
      tool_name: 'mcp__github__create_pull_request',
      tool_input: { draft: true, body: 'x' },
    });
    expect(bad.code).toBe(2);
    const ok = run({
      tool_name: 'mcp__github__create_pull_request',
      tool_input: { draft: true, body: FULL },
    });
    expect(ok.code).toBe(0);
  });
  it('does not mistake "-branch" in a title for -b', () => {
    const cmd = 'gh pr create --title "fix-branch handling" --body "nope"';
    const r = run({ tool_name: 'Bash', tool_input: { command: cmd } });
    expect(r.code).toBe(2); // the real --body is what got checked, not "-branch ..."
    expect(extractBashBody(cmd)).toBe('nope');
    expect(extractBashBody('gh pr create --title "fix-branch handling"')).toBeNull();
    expect(extractBashBody('gh pr create --title "feat-b mode"')).toBeNull();
    expect(extractBashBody('gh pr create -b "short"')).toBe('short');
  });
  it('ignores non-PR Bash and other tools', () => {
    expect(run({ tool_name: 'Bash', tool_input: { command: 'ls' } }).code).toBe(0);
    expect(run({ tool_name: 'Edit', tool_input: { file_path: 'a' } }).code).toBe(0);
  });
  it('fails soft on garbage stdin', () => {
    const r = spawnSync('node', [SCRIPT], { input: 'not json', encoding: 'utf8' });
    expect(r.status).toBe(0);
  });
});
