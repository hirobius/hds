/**
 * copy-agent-context: the files agents fetch from the public site (llms, the
 * manifest, DESIGN.md, CONSUMING.md, component-api.json) land at the site root
 * of the docs site.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { copyAgentContext, COPIES, PUBLIC_COPIES } from '../copy-agent-context.mjs';

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'agent-context-'));
  for (const [src] of COPIES) {
    mkdirSync(path.dirname(path.join(root, src)), { recursive: true });
    writeFileSync(path.join(root, src), 'x');
  }
  for (const name of PUBLIC_COPIES) {
    const p = path.join(root, 'public', name);
    if (name.endsWith('/')) {
      mkdirSync(p, { recursive: true });
      writeFileSync(path.join(p, 'tokens.txt'), 'x');
    } else {
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, 'x');
    }
  }
  return root;
}

describe('copyAgentContext', () => {
  it('copies the repo files and the public agent files', () => {
    const root = fixtureRoot();
    copyAgentContext(root, 'docs-site/out');
    for (const f of [
      'DESIGN.md',
      'component-api.json',
      'llms.txt',
      'llms-full.txt',
      'hds-manifest.json',
      'llms/tokens.txt',
    ]) {
      expect(existsSync(path.join(root, 'docs-site/out', f)), f).toBe(true);
    }
  });

  it('fails naming a missing public file', () => {
    const root = fixtureRoot();
    rmSync(path.join(root, 'public', 'llms.txt'));
    expect(() => copyAgentContext(root, 'out')).toThrow(/public\/llms\.txt/);
  });
});

describe('docs:publish', () => {
  // public/hds-manifest-agent.json is generated, not committed: a clean
  // Vercel checkout has it only if docs:publish makes it before copying.
  it('generates every uncommitted public file before copying', () => {
    const cmd = JSON.parse(readFileSync('package.json', 'utf8')).scripts['docs:publish'];
    expect(cmd.indexOf('generate-manifest-projection.mjs')).toBeGreaterThan(-1);
    expect(cmd.indexOf('generate-manifest-projection.mjs')).toBeLessThan(
      cmd.indexOf('copy-agent-context.mjs'),
    );
  });
});
