import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(__dirname, '..', 'scripts', 'check-token-structure.mjs');

function run(tokens: unknown): { code: number; out: string } {
  const dir = mkdtempSync(join(tmpdir(), 'tok-struct-'));
  const file = join(dir, 'tokens.json');
  writeFileSync(file, JSON.stringify(tokens));
  try {
    const out = execFileSync('node', [SCRIPT], {
      env: { ...process.env, HDS_FIXTURE_MODE: '1', FIXTURE_FILE: file },
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status: number; stderr: string; stdout: string };
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}

const modes = (m: Record<string, string>) => ({ 'com.figma.variables': { modes: m } });

describe('check-token-structure', () => {
  it('passes on the real token source', () => {
    const out = execFileSync('node', [SCRIPT], { encoding: 'utf8' });
    expect(out).toContain('✓ check-token-structure');
  });

  it('treats a Compact-only (density axis) token as not themed', () => {
    const r = run({
      semantic: {
        space: {
          sm: {
            $value: '{primitive.space.5}',
            $extensions: modes({ Compact: '{primitive.space.3}' }),
          },
        },
      },
    });
    expect(r.code).toBe(0);
  });

  it('still flags a themed token missing Dark', () => {
    const r = run({
      semantic: {
        color: {
          $type: 'color',
          x: {
            $value: '{primitive.color.a}',
            $extensions: modes({ Light: '{primitive.color.a}' }),
          },
        },
      },
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain('semantic.color.x — missing Dark');
  });

  it('flags an unknown mode name', () => {
    const r = run({
      semantic: { space: { sm: { $value: 1, $extensions: modes({ Dense: '2' }) } } },
    });
    expect(r.code).toBe(1);
  });

  it('still flags component colors that skip the semantic tier', () => {
    const r = run({
      component: { b: { $type: 'color', edge: { $value: '{primitive.color.red.400}' } } },
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain('component → primitive');
  });
});
