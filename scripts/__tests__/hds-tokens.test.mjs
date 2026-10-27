// @vitest-environment node
/**
 * `hds-tokens search` (bin/hds-tokens.mjs) — the lookup a consumer runs before
 * writing a token name, so it stops guessing (hds#477, ops#443).
 *
 * Tested at the process boundary: spawn the bin, read stdout and the exit code.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'bin', 'hds-tokens.mjs');

function run(...args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe('hds-tokens search', () => {
  it('says "content tertiary" is not a token and names the nearest real one', () => {
    const { code, out } = run('search', 'content', 'tertiary');
    expect(code).toBe(1);
    expect(out).toMatch(/not a token/i);
    expect(out.split('\n').find((l) => l.includes('--'))).toContain(
      '--semantic-color-content-tertiary',
    );
  });

  it('catches the ops#443 guess --semantic-content-tertiary', () => {
    const { code, out } = run('search', '--semantic-content-tertiary');
    expect(code).toBe(1);
    expect(out).toContain('--semantic-color-content-tertiary');
  });

  it('confirms a real CSS variable and exits 0', () => {
    const { code, out } = run('search', '--semantic-color-content-tertiary');
    expect(code).toBe(0);
    expect(out).toMatch(/exists/i);
    expect(out).toContain('semantic.color.content.tertiary');
  });

  it('accepts a dotted token path', () => {
    expect(run('search', 'semantic.size.control.md').code).toBe(0);
  });

  it('prints usage and exits 2 with no query', () => {
    const { code, err } = run('search');
    expect(code).toBe(2);
    expect(err).toMatch(/usage/i);
  });

  it('emits JSON with --json', () => {
    const { out } = run('search', 'content tertiary', '--json');
    const parsed = JSON.parse(out);
    expect(parsed.exists).toBe(false);
    expect(parsed.matches[0].cssVar).toBe('--semantic-color-content-tertiary');
  });
});
