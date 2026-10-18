import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateScan, validateAllowlist } from '../lib/axe-gate.mjs';
import { DEMO_SELECTOR, discoverPages } from '../lib/docs-axe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function site(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-axe-'));
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), '<html></html>');
  }
  return dir;
}

describe('docs axe gate: page discovery', () => {
  it('finds component and pattern pages in both static layouts, sorted', () => {
    const dir = site([
      'docs/components/index.html',
      'docs/components/button.html',
      'docs/components/alert/index.html',
      'docs/patterns/empty-state.html',
      'docs/patterns/index.html',
      'docs/foundations/color.html',
    ]);
    expect(discoverPages(dir)).toEqual([
      '/docs/components/alert',
      '/docs/components/button',
      '/docs/patterns/empty-state',
    ]);
  });

  it('returns nothing for a build without docs pages', () => {
    expect(discoverPages(site(['index.html']))).toEqual([]);
  });

  it('scopes to the demo frame, not the Fumadocs chrome', () => {
    expect(DEMO_SELECTOR).toBe('.hds-demo-frame');
  });
});

describe('docs axe gate: allowlist filtering', () => {
  const scans = [
    {
      storyId: '/docs/components/select',
      theme: 'light',
      violations: [{ id: 'aria-hidden-focus', impact: 'serious', nodes: 1 }],
      error: null,
    },
    {
      storyId: '/docs/components/button',
      theme: 'dark',
      violations: [{ id: 'color-contrast', impact: 'moderate', nodes: 2 }],
      error: null,
    },
  ];
  const entry = (storyId, ruleId) => ({ storyId, ruleId, reason: 'why', addedOn: '2026-10-11' });

  it('blocks an unlisted serious violation and ignores moderate ones', () => {
    const r = evaluateScan(scans, []);
    expect(r.blocking.map((b) => b.ruleId)).toEqual(['aria-hidden-focus']);
    expect(r.ok).toBe(false);
  });

  it('lets a route-keyed allowlist entry through, and flags a stale one', () => {
    const ok = evaluateScan(scans, [entry('/docs/components/select', 'aria-hidden-focus')]);
    expect(ok.ok).toBe(true);
    const stale = evaluateScan(scans, [
      entry('/docs/components/select', 'aria-hidden-focus'),
      entry('/docs/components/button', 'color-contrast'),
    ]);
    expect(stale.stale).toHaveLength(1);
    expect(stale.ok).toBe(false);
  });

  it('treats a page with no demo as a blocking no-demo finding', () => {
    const r = evaluateScan(
      [
        {
          storyId: '/docs/patterns/x',
          theme: 'light',
          violations: [{ id: 'no-demo', impact: 'serious', nodes: 0 }],
          error: null,
        },
      ],
      [],
    );
    expect(r.blocking[0].ruleId).toBe('no-demo');
  });

  it('ships a valid allowlist', () => {
    const list = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'scripts/docs-axe-allowlist.json'), 'utf8'),
    );
    expect(validateAllowlist(list)).toEqual([]);
  });
});
