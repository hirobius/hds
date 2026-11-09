/**
 * Tests for scripts/count-consumer-usage.mjs (hds#316): the README "In use"
 * numbers come from a script, and the README is compared against its snapshot.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countConsumerUsage,
  consumerAliases,
  measureConsumer,
  parseRootAliases,
  renderInUseBlock,
  renderAdoptionBlock,
  replaceBlock,
  IN_USE_BLOCK,
  ADOPTION_BLOCK,
} from '../count-consumer-usage.mjs';
import { formatGenerated } from '../lib/write-generated.mjs';

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

describe('parseRootAliases (hds#390)', () => {
  it('maps each `export { X as Y }` alias in the barrel to its target', () => {
    const index = [
      "export * from './app/components/checkbox';",
      '/** @deprecated Use `Checkbox`. */',
      "export { Checkbox as HdsCheckbox } from './app/components/checkbox';",
      "export { Tooltip as HdsTooltip } from './app/components/hds-tooltip';",
      "export { default as hds } from './app/design-system/tokens';",
      "export { cn } from './lib/utils';",
    ].join('\n');
    expect(Object.fromEntries(parseRootAliases(index))).toEqual({
      HdsCheckbox: 'Checkbox',
      HdsTooltip: 'Tooltip',
    });
  });

  it('still resolves HdsCheckbox to Checkbox after 0.20.0 removed the alias from the barrel', () => {
    const index = readFileSync(join(REPO, 'src/index.ts'), 'utf8');
    expect(parseRootAliases(index).has('HdsCheckbox')).toBe(false);
    const aliases = consumerAliases(index);
    expect(aliases.get('HdsCheckbox')).toBe('Checkbox');
    expect(aliases.get('HdsTooltip')).toBe('Tooltip');
  });
});

describe('measureConsumer (hds#390)', () => {
  function fixture() {
    const dir = mkdtempSync(join(tmpdir(), 'hds-consumer-'));
    mkdirSync(join(dir, 'src/pages'), { recursive: true });
    mkdirSync(join(dir, 'scripts'));
    mkdirSync(join(dir, 'fixtures'));
    writeFileSync(
      join(dir, 'src/pages/a.tsx'),
      `import { Button, HdsCheckbox } from '@hirobius/design-system';\n`,
    );
    writeFileSync(
      join(dir, 'src/pages/b.tsx'),
      `import {\n  Page,\n  Badge,\n} from '@hirobius/design-system/patterns';\n`,
    );
    // A clone prompt: the import is text inside a template literal.
    writeFileSync(
      join(dir, 'scripts/page-clone.mjs'),
      "const prompt = `\nimport { Stack, Card } from '@hirobius/design-system';\n`;\n",
    );
    writeFileSync(
      join(dir, 'fixtures/x.tsx'),
      `import { Badge, Stack } from '@hirobius/design-system';\n`,
    );
    return dir;
  }

  it('counts src/ only, resolves barrel aliases, and buckets the clone prompts', () => {
    const dir = fixture();
    try {
      const names = new Set([
        'Button',
        'Checkbox',
        'HdsCheckbox',
        'Page',
        'Badge',
        'Stack',
        'Card',
      ]);
      const out = measureConsumer(dir, names, new Map([['HdsCheckbox', 'Checkbox']]));
      expect(out).toEqual({
        files: 2,
        components: 4,
        names: ['Badge', 'Button', 'Checkbox', 'Page'],
        promptContracts: { files: ['scripts/page-clone.mjs'], components: ['Card', 'Stack'] },
      });
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

  it('publishes the confirmed split: ops and Roleflame are the product apps (2026-10-12)', () => {
    expect(snapshot.consumersConfirmed).toBe(true);
    expect(snapshot.consumers.productApps).toBe(2);
    expect(readme).toMatch(/^## In use$/m);
    expect(readme).toMatch(/is one of 2 product apps that use components/);
    expect(readme).toMatch(/\| Product apps\s+\| 2 /);
    expect(readme).not.toMatch(/not yet confirmed/);
    expect(readme).not.toMatch(/there is no second product app/);
  });

  it('declares every product app it counts', () => {
    const { apps, productApps } = snapshot.consumers;
    expect(apps.map((a) => a.id)).toEqual(['hirobius/ops', 'roleflame']);
    expect(productApps).toBe(apps.length);
    expect(apps.find((a) => a.id === 'roleflame').label).toMatch(/^Roleflame/);
  });

  it('names the second product app by its public name, never its private repo (Adrian, 2026-10-14)', () => {
    expect(JSON.stringify(snapshot)).not.toMatch(/job-hunt/);
    expect(readme).not.toMatch(/job-hunt/);
    expect(readme).toMatch(/Roleflame/);
  });

  it('re-confirmed both product apps after the Roleforge -> Roleflame rename (hds#1312)', () => {
    expect(JSON.stringify(snapshot)).not.toMatch(/Roleforge|roleforge/);
    expect(snapshot).not.toHaveProperty('consumersReconfirmDue');
    expect(snapshot.consumersConfirmedAt >= '2026-11-09').toBe(true);
  });
});

describe('README "In use" names no private repository (hds#545)', () => {
  // README ships in every npm tarball, so it must not name the consumer repo or
  // the commit it was measured at. The snapshot keeps both for reproducibility.
  const sha = 'b'.repeat(40);
  const out = renderInUseBlock({
    files: 35,
    components: 25,
    commit: sha,
    consumersConfirmed: true,
    consumers: { productApps: 1, tokenLevelSites: 4 },
  });

  it('renders no repository name and no commit hash', () => {
    expect(out).not.toMatch(/hirobius\/ops/);
    expect(out).not.toContain(sha.slice(0, 7));
    expect(out).not.toMatch(/measured at commit/);
  });

  it('keeps the counts, the consumer table and the screenshot', () => {
    expect(out).toMatch(/\*\*35\*\* of its source files/);
    expect(out).toMatch(/\| Product apps\s+\| 1 /);
    expect(out).toMatch(/docs\/images\/product-app-audit\.png/);
  });

  it('shows no page the product app has removed (hds#708: ops dropped Library on 2026-10-12)', () => {
    expect(out).not.toMatch(/product-app-library/);
    expect(out).toMatch(/The screenshot below is a page of that app/);
  });

  it('the committed README follows suit', () => {
    const readme = readFileSync(join(REPO, 'README.md'), 'utf8');
    const { commit } = JSON.parse(
      readFileSync(join(REPO, 'docs', 'data', 'consumer-usage.json'), 'utf8'),
    );
    expect(readme).not.toMatch(/hirobius\/ops/);
    expect(readme).not.toMatch(/\bOps's\b|ops checkout|images\/ops-/);
    expect(readme).not.toContain(commit);
    expect(readme).not.toContain(commit.slice(0, 7));
  });
});

describe('shipped type declarations name no private consumer (hds#545)', () => {
  // The JSDoc in these entry points lands in dist/types, which ships in the tarball.
  it.each(['src/index.ts', 'src/app/context/index.ts'])(
    '%s does not name the ops dashboard',
    (f) => {
      const src = readFileSync(join(REPO, f), 'utf8');
      expect(src).not.toMatch(/\bops\b/i);
    },
  );
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

  it('says "the only product app" when Ops is the only one, not "one of 1"', () => {
    const out = renderInUseBlock({
      ...base,
      consumers: { productApps: 1, tokenLevelSites: 4 },
      consumersConfirmed: true,
    });
    expect(out).toMatch(/is the only product app that uses components/);
    expect(out).not.toMatch(/one of 1/);
    expect(out).toMatch(/\| Product apps\s+\| 1 /);
  });
});

describe('docs/ADOPTION.md (hds#659)', () => {
  const doc = readFileSync(join(REPO, 'docs/ADOPTION.md'), 'utf8');
  const snapshot = JSON.parse(readFileSync(join(REPO, 'docs/data/consumer-usage.json'), 'utf8'));
  const sha = (c) => c.repeat(40);
  const sample = {
    consumers: {
      apps: [
        { id: 'hirobius/ops', label: 'Internal operations dashboard' },
        { id: 'roleforge', label: 'Roleforge, a job-application tracker' },
      ],
    },
    history: [
      {
        consumer: 'hirobius/ops',
        ref: 'origin/main',
        rows: [
          {
            month: '2026-07',
            commit: sha('a'),
            committedAt: '2026-07-30T10:00:00Z',
            files: null,
            components: null,
            rawControls: null,
            versionRange: null,
            hdsVersion: '0.10.0',
          },
          {
            month: '2026-08',
            commit: sha('b'),
            committedAt: '2026-08-30T10:00:00Z',
            files: 12,
            components: 9,
            rawControls: { button: 3, input: 1, select: 0, textarea: 0, table: 2 },
            versionRange: '^0.12.0',
            hdsVersion: '0.12.0',
          },
        ],
      },
    ],
    deprecationCycle: {
      change: 'Pattern components moved to the `/patterns` subpath (0.20)',
      consumer: 'hirobius/ops',
      appliedAt: '2026-10-05',
      commit: '39a68bc',
      trackedIn: 'ops #460',
    },
    consistency: {
      date: '2026-10-14',
      packageVersion: '0.25.0',
      commit: sha('c'),
      measured: { builds: { passing: 2, of: 3 }, violations: 0, axe: 0, jaccardMin: 0.95 },
      pass: false,
    },
  };
  const out = renderAdoptionBlock(sample);

  it('the committed block is the snapshot rendered, byte for byte', () => {
    const m = doc.match(
      new RegExp(
        `<!-- auto:start:${ADOPTION_BLOCK} -->\\n([\\s\\S]*?)<!-- auto:end:${ADOPTION_BLOCK} -->`,
      ),
    );
    expect(m).not.toBeNull();
    expect(m[1]).toBe(renderAdoptionBlock(snapshot));
    expect(replaceBlock(doc, ADOPTION_BLOCK, renderAdoptionBlock(snapshot))).toBe(doc);
  });

  it('renders one table per product app, short shas, n/a for a month with no src/', () => {
    expect(out).toMatch(/^### Internal operations dashboard$/m);
    expect(out).toMatch(/^### Roleforge, a job-application tracker$/m);
    expect(out).toMatch(/\| 2026-07 \| `aaaaaaa` \| n\/a\s+\| n\/a/);
    expect(out).toMatch(/\| 2026-08 \| `bbbbbbb` \| 12\s+\| 9\s+\| 6\s+\| \^0\.12\.0/);
    expect(out).not.toContain(sha('b'));
    // Roleforge has no history entry yet.
    expect(out.split('### Roleforge')[1]).toMatch(/Not measured yet/);
  });

  it('shows the deprecation cycle as applied and the latest harness run', () => {
    expect(out).toMatch(
      /\| Pattern components moved .*\| Internal operations dashboard \| applied 2026-10-05 \| `39a68bc` \| `ops #460` \|/,
    );
    expect(out).not.toMatch(/not yet applied/);
    expect(out).toMatch(
      /\| 2026-10-14 \| 0\.25\.0\s+\| `ccccccc`\s+\| 2 of 3\s+\| 0\s+\| 0\s+\| 0\.95\s+\| no/,
    );
  });

  it('is stable under Prettier, so lint-staged leaves it alone', async () => {
    const file = join(REPO, 'docs/ADOPTION.md');
    const rendered = replaceBlock(doc, ADOPTION_BLOCK, out);
    expect(await formatGenerated(file, rendered)).toBe(rendered);
    expect(await formatGenerated(file, doc)).toBe(doc);
  });

  it('names no private repository and makes no speed or bug claim', () => {
    for (const text of [doc, out]) {
      expect(text).not.toMatch(/hirobius\/(?!design-system)/);
      expect(text).not.toMatch(/github\.com/);
      expect(text.match(/dev.?speed|bug.?reduction|faster/gi) ?? []).toHaveLength(0);
    }
  });

  it('the README "In use" block links it', () => {
    const readme = readFileSync(join(REPO, 'README.md'), 'utf8');
    expect(renderInUseBlock(snapshot)).toContain('[docs/ADOPTION.md](docs/ADOPTION.md)');
    expect(readme).toContain('[docs/ADOPTION.md](docs/ADOPTION.md)');
  });

  it('every history entry is a declared app with increasing months and 40-hex commits', () => {
    const ids = snapshot.consumers.apps.map((a) => a.id);
    for (const h of snapshot.history) {
      expect(ids).toContain(h.consumer);
      const months = h.rows.map((r) => r.month);
      expect([...months].sort()).toEqual(months);
      expect(new Set(months).size).toBe(months.length);
      for (const r of h.rows) {
        expect(r.commit).toMatch(/^[0-9a-f]{40}$/);
        for (const n of [r.files, r.components])
          if (n !== null) expect(n).toBeGreaterThanOrEqual(0);
        if (r.commit === snapshot.commit && h.consumer === snapshot.measuredFrom)
          expect([r.files, r.components]).toEqual([snapshot.files, snapshot.components]);
      }
    }
  });
});
