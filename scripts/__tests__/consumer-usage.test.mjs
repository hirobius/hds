/**
 * Tests for scripts/count-consumer-usage.mjs (hds#316): the README "In use"
 * numbers come from a script, and the README is compared against its snapshot.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countConsumerUsage, renderInUseBlock, IN_USE_BLOCK } from '../count-consumer-usage.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const COMPONENTS = new Set(['Button', 'Page', 'Badge']);

describe('countConsumerUsage', () => {
  it('counts files that import from the package and the distinct known components they use', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-usage-'));
    try {
      mkdirSync(join(dir, 'src'));
      mkdirSync(join(dir, 'node_modules/x'), { recursive: true });
      writeFileSync(
        join(dir, 'src/a.tsx'),
        `import { Button, Page, useThing } from '@hirobius/design-system';\n`,
      );
      writeFileSync(
        join(dir, 'src/b.tsx'),
        `import { Page as P, type Badge } from '@hirobius/design-system/patterns';\n`,
      );
      writeFileSync(
        join(dir, 'src/c.ts'),
        `import { cn } from '@hirobius/design-system/cn';\nimport x from 'other';\n`,
      );
      writeFileSync(
        join(dir, 'node_modules/x/i.js'),
        `import { Button } from '@hirobius/design-system';\n`,
      );
      expect(countConsumerUsage(dir, COMPONENTS)).toEqual({ files: 2, components: 3 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('README "In use" section', () => {
  const readme = readFileSync(join(REPO, 'README.md'), 'utf8');
  const snapshot = JSON.parse(readFileSync(join(REPO, 'docs/data/consumer-usage.json'), 'utf8'));

  it('is the snapshot rendered, byte for byte', () => {
    const m = readme.match(
      new RegExp(
        `<!-- auto:start:${IN_USE_BLOCK} -->\\n([\\s\\S]*?)<!-- auto:end:${IN_USE_BLOCK} -->`,
      ),
    );
    expect(m).not.toBeNull();
    expect(m[1]).toBe(renderInUseBlock(snapshot));
  });

  it('records which commit of the consumer was measured, so "main" can be checked', () => {
    expect(snapshot.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('does not publish the unconfirmed product-app / token-site split', () => {
    expect(snapshot.consumersConfirmed).toBe(false);
    expect(readme).not.toMatch(/Token-level sites/);
    expect(readme).toMatch(/not yet confirmed/);
    expect(readme).toMatch(/^## In use$/m);
  });
});

describe('renderInUseBlock consumer split', () => {
  const base = { files: 35, components: 25, commit: 'a'.repeat(40) };

  it('names Ops as the only verified component-level consumer while the split is unconfirmed', () => {
    const out = renderInUseBlock({
      ...base,
      consumers: { productApps: 2, tokenLevelSites: 4 },
      consumersConfirmed: false,
    });
    expect(out).toMatch(/only verified component-level consumer/);
    expect(out).toMatch(/not yet confirmed/);
    expect(out).not.toMatch(/Product apps/);
  });

  it('shows the table, and prose that agrees with it, once confirmed', () => {
    const out = renderInUseBlock({
      ...base,
      consumers: { productApps: 2, tokenLevelSites: 4 },
      consumersConfirmed: true,
    });
    expect(out).toMatch(/one of 2 product apps/);
    expect(out).toMatch(/\| Product apps\s+\| 2 /);
    expect(out).toMatch(/\| Token-level sites\s+\| 4 /);
    expect(out).not.toMatch(/component-level consumer:/);
  });
});
