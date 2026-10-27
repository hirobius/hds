/**
 * hds#762 — the docs coverage gate: every component has a docs page, a live
 * demo and a Figma link in its page header, with a baseline that only shrinks.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyRatchet,
  coverageUnits,
  findCoverageGaps,
  pageLookup,
} from '../lib/docs-coverage.mjs';
import { docsPagePath, loadDocsRouting } from '../lib/docs-routing.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'scripts/check-docs-coverage.mjs');
const PASSING = path.join(ROOT, 'fixtures/check-docs-coverage/passing.example.d');
const VIOLATING = path.join(ROOT, 'fixtures/check-docs-coverage/violating.example.d');

const FIGMA = 'https://www.figma.com/design/KEY/File?node-id=1-2';
const page = (n) => ({ path: `/docs/components/${n.toLowerCase()}`, shared: false });

const base = {
  units: ['A'],
  pageFor: page,
  demos: new Set(['A']),
  figmaFor: () => FIGMA,
};

describe('findCoverageGaps', () => {
  it('is clean when page, demo and Figma link exist', () => {
    expect(findCoverageGaps(base)).toEqual([]);
  });
  it('flags no-page', () => {
    expect(findCoverageGaps({ ...base, pageFor: () => null })).toContainEqual({
      name: 'A',
      gap: 'no-page',
    });
  });
  it('flags no-demo', () => {
    expect(findCoverageGaps({ ...base, demos: new Set() })).toEqual([
      { name: 'A', gap: 'no-demo' },
    ]);
  });
  it('flags no-figma-link', () => {
    expect(findCoverageGaps({ ...base, figmaFor: () => null })).toEqual([
      { name: 'A', gap: 'no-figma-link' },
    ]);
  });
  it('asks no Figma link of a shared page: it has no header slot of its own to fill', () => {
    const shared = () => ({ path: '/docs/components/utilities', shared: true });
    expect(findCoverageGaps({ ...base, pageFor: shared, figmaFor: () => null })).toEqual([]);
  });
});

describe('coverageUnits', () => {
  const specs = {
    Card: { filePath: 'card.tsx' },
    CardHeader: { filePath: 'card.tsx' },
    Callout: { filePath: 'callout.tsx' },
    Secret: { filePath: 'secret.tsx', hidden: true },
    Exempt: { filePath: 'exempt.tsx', docExempt: true },
  };
  const hasPage = (n) => n === 'Card';
  it('drops hidden components, and docExempt ones with no page', () => {
    expect(coverageUnits(specs, hasPage).units).not.toContain('Secret');
    expect(coverageUnits(specs, hasPage).units).not.toContain('Exempt');
  });
  it('measures a docExempt component that has a page (the tag is file-level and can go stale)', () => {
    const withPage = { ...specs, Dialog: { filePath: 'dialog.tsx', docExempt: true } };
    const paged = (n) => n === 'Card' || n === 'Dialog';
    expect(coverageUnits(withPage, paged).units).toContain('Dialog');
  });
  it("covers a part through its file's page, and keeps an unpaged component", () => {
    const { units, parts } = coverageUnits(specs, hasPage);
    expect(units).toEqual(['Card', 'Callout']);
    expect(parts).toEqual(['CardHeader']);
  });
});

describe('pageLookup', () => {
  it('exempts exactly the utilities and the providers from a Figma link (shared pages)', () => {
    const routing = loadDocsRouting(ROOT);
    const pageFor = pageLookup(routing, docsPagePath);
    const specs = JSON.parse(
      readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'),
    ).componentSpecs;
    const shared = Object.keys(specs)
      .filter((n) => pageFor(n)?.shared)
      .sort();
    expect(shared).toEqual(
      [
        'Box',
        'Container',
        'VisuallyHidden',
        'HdsRouterProvider',
        'HdsThemeProvider',
        'ToastProvider',
      ].sort(),
    );
  });
  it('gives a component on a page of its own a page that is not shared', () => {
    const pageFor = pageLookup(loadDocsRouting(ROOT), docsPagePath);
    expect(pageFor('Button')).toEqual({ path: '/docs/components/button', shared: false });
    expect(pageFor('NoSuchComponent')).toBeNull();
  });
});

describe('applyRatchet', () => {
  const gaps = [{ name: 'A', gap: 'no-demo' }];
  it('passes when every gap is baselined', () => {
    expect(applyRatchet(gaps, ['A:no-demo'])).toEqual({ newGaps: [], stale: [] });
  });
  it('fails on a new gap', () => {
    expect(applyRatchet(gaps, []).newGaps).toEqual(gaps);
  });
  it('fails on a stale baseline entry, so the baseline only shrinks', () => {
    expect(applyRatchet([], ['A:no-demo']).stale).toEqual(['A:no-demo']);
  });
});

describe('check-docs-coverage CLI (FIXTURE_DIR)', () => {
  const dirs = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const run = (dir, args = []) =>
    spawnSync(process.execPath, [SCRIPT, ...args], {
      encoding: 'utf8',
      env: { ...process.env, FIXTURE_DIR: dir },
    });
  /** A copy of the passing fixture with one edit applied. */
  const variant = (edit) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'docs-coverage-'));
    dirs.push(dir);
    cpSync(PASSING, dir, { recursive: true });
    edit(dir);
    return dir;
  };
  const editJson = (dir, rel, fn) => {
    const file = path.join(dir, rel);
    writeFileSync(file, JSON.stringify(fn(JSON.parse(readFileSync(file, 'utf8'))), null, 2));
  };

  it('passes the passing fixture', () => {
    const res = run(PASSING);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  it('fails the violating fixture', () => {
    expect(run(VIOLATING).status).toBe(1);
  });

  it('fails on a component with no docs page', () => {
    const dir = variant((d) =>
      editJson(d, 'public/hds-manifest.json', (m) => {
        m.componentSpecs.Widget = { filePath: 'src/app/components/widget.tsx', figmaUrl: FIGMA };
        return m;
      }),
    );
    const res = run(dir);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('no-page: Widget');
  });

  it('fails on a component with no live demo', () => {
    const dir = variant((d) =>
      writeFileSync(
        path.join(d, 'docs-site/components/component-demos.tsx'),
        'export const DEMOS = {};\n',
      ),
    );
    const res = run(dir);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('no-demo: Button');
  });

  it('fails on a Figma link that is not a Figma URL', () => {
    const dir = variant((d) =>
      editJson(d, 'public/hds-manifest.json', (m) => {
        m.componentSpecs.Button.figmaUrl = 'TODO:hds-master:Button';
        return m;
      }),
    );
    const res = run(dir);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('no-figma-link: Button');
  });

  it('fails on a component with no Figma link', () => {
    const dir = variant((d) =>
      editJson(d, 'public/hds-manifest.json', (m) => {
        delete m.componentSpecs.Button.figmaUrl;
        return m;
      }),
    );
    const res = run(dir);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('no-figma-link: Button');
  });

  it('passes a baselined gap, and fails once the gap is filled but still baselined', () => {
    const gapped = variant((d) => {
      editJson(d, 'public/hds-manifest.json', (m) => {
        delete m.componentSpecs.Button.figmaUrl;
        return m;
      });
      editJson(d, 'docs/guardrails/baselines/check-docs-coverage.json', (b) => ({
        ...b,
        gaps: ['Button:no-figma-link'],
      }));
    });
    expect(run(gapped).status).toBe(0);

    const stale = variant((d) =>
      editJson(d, 'docs/guardrails/baselines/check-docs-coverage.json', (b) => ({
        ...b,
        gaps: ['Button:no-figma-link'],
      })),
    );
    const res = run(stale);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('stale-baseline: Button:no-figma-link');
  });

  it('--list prints the gap list and exits 0', () => {
    const res = run(VIOLATING, ['--list']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Widget:no-page');
  });
});
