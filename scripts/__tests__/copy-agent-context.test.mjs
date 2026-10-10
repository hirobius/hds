/**
 * copy-agent-context: the files agents fetch from the public site (llms, the
 * manifest, DESIGN.md, CONSUMING.md, component-api.json) land at the site root
 * of whichever host serves them, Storybook or the docs site.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
  it('copies the repo files only, for Storybook (which already serves public/)', () => {
    const root = fixtureRoot();
    copyAgentContext(root, 'storybook-static');
    expect(existsSync(path.join(root, 'storybook-static/DESIGN.md'))).toBe(true);
    expect(existsSync(path.join(root, 'storybook-static/llms.txt'))).toBe(false);
  });

  it('also copies the public agent files for a host that does not serve public/', () => {
    const root = fixtureRoot();
    copyAgentContext(root, 'docs-site/out', { withPublic: true });
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
    expect(() => copyAgentContext(root, 'out', { withPublic: true })).toThrow(/public\/llms\.txt/);
  });
});
