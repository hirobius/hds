/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#343 — offline, deterministic half of the agent-consistency harness.
 * Every metric is tested at its module seam with small hand-computed fixtures;
 * the CLI is tested by spawning it. No network, no browser.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { scanApp, stripComments } from '../lib/consistency/violations.mjs';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { diffPng } from '../lib/consistency/pixeldiff.mjs';
import { evaluate, formatCheck, judgeMeasured } from '../lib/consistency/evaluate.mjs';
import {
  appendEntry,
  consistencyFromEntry,
  latestEntry,
  readLedger,
  summaryLine,
  validateEntry,
  validateLedger,
} from '../lib/consistency/ledger.mjs';
import { compareStatus, checkRepo, checkSurfaces } from '../lib/consistency/status-sync.mjs';
import { extractImports, jaccard, pairwiseJaccard } from '../lib/consistency/jaccard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const png = (name) => readFileSync(path.join(ROOT, 'eval/consistency/fixtures/png', name));

const tmpDirs = [];
const makeTmp = (prefix) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

const kinds = (hits) => hits.map((h) => h.kind).sort();

describe('violations: comment stripping', () => {
  it('removes block, line and JSX comments but keeps code', () => {
    const src = [
      'const a = 1; // color: #ff0000',
      '/* padding: 12px; <button> */',
      '<div>{/* rgb(1, 2, 3) */}</div>',
      'const b = 2;',
    ].join('\n');
    const out = stripComments(src);
    expect(out).not.toMatch(/#ff0000|12px|rgb\(|<button>/);
    expect(out).toMatch(/const a = 1;/);
    expect(out).toMatch(/const b = 2;/);
  });

  it('keeps comment-looking text inside string literals', () => {
    const src = 'const url = \'https://example.com/#abc\'; const s = "/* not a comment */";';
    expect(stripComments(src)).toBe(src);
  });

  it('does not treat a URL in JSX text as a line comment', () => {
    const src = "<p>See https://x.io</p><Box style={{ color: '#f00' }} />";
    expect(stripComments(src)).toBe(src);
    expect(kinds(scanApp({ 'src/App.tsx': src }))).toEqual(['hex']);
  });

  it('preserves line numbers', () => {
    const src = 'a\n/* x\ny */\nb';
    expect(stripComments(src).split('\n')).toHaveLength(4);
  });
});

describe('violations: scanApp', () => {
  it('does not count in-page anchors that happen to be valid hex', () => {
    const files = {
      'src/App.tsx': [
        'export const Nav = () => (',
        '  <nav><a href="#add">Add</a><a href={"#fade"}>Fade</a><Link to="#bad">Bad</Link></nav>',
        ');',
      ].join('\n'),
    };
    expect(scanApp(files)).toEqual([]);
  });

  it('still counts a hex colour that is not an href/to target', () => {
    const files = {
      'src/App.tsx': 'const c = \'#add\'; const h = <a href="#x" data-c="#fade" />;',
    };
    expect(kinds(scanApp(files))).toEqual(['hex', 'hex']);
  });

  it('counts nothing for a clean app', () => {
    const files = {
      'src/App.tsx':
        "import { Button } from '@hirobius/design-system';\nexport const App = () => <Button>Save</Button>;\n",
    };
    expect(scanApp(files)).toEqual([]);
  });

  it('does NOT count a hex, rgb, px or raw control that only appears in a comment', () => {
    const files = {
      'src/App.tsx': [
        '// was #ff0000 and 12px, <button> and rgb(0,0,0)',
        '/* className="flex p-4" */',
        'export const App = () => <div />;',
      ].join('\n'),
    };
    expect(scanApp(files)).toEqual([]);
  });

  it('flags raw hex colours (3, 4, 6 and 8 digits)', () => {
    const files = { 'src/App.tsx': "const c = ['#fff', '#ffff', '#ff0000', '#ff000080'];" };
    const hits = scanApp(files);
    expect(kinds(hits)).toEqual(['hex', 'hex', 'hex', 'hex']);
    expect(hits[0]).toMatchObject({ file: 'src/App.tsx', line: 1, match: '#fff' });
  });

  it('flags rgb, hsl and oklch colour functions', () => {
    const files = {
      'src/App.tsx':
        "const c = ['rgb(1,2,3)', 'rgba(1,2,3,.5)', 'hsl(0 0% 0%)', 'oklch(0.5 0 0)'];",
    };
    expect(kinds(scanApp(files))).toEqual(['colour-fn', 'colour-fn', 'colour-fn', 'colour-fn']);
  });

  it('flags raw px values but not px inside identifiers', () => {
    const files = {
      'src/App.tsx': "const s = { padding: '12px', margin: '0.5px' }; const wpx = 3;",
    };
    expect(kinds(scanApp(files))).toEqual(['px', 'px']);
  });

  it('flags Tailwind utility classes in className, including variants and arbitrary values', () => {
    const files = {
      'src/App.tsx': [
        'export const A = () => <div className="flex items-center gap-4 md:p-2 hover:bg-red-500" />;',
        'export const B = () => <div className={cx("mt-[3rem]", cond && "text-sm")} />;',
      ].join('\n'),
    };
    const hits = scanApp(files).filter((h) => h.kind === 'tailwind');
    expect(hits.map((h) => h.match)).toEqual([
      'flex',
      'items-center',
      'gap-4',
      'md:p-2',
      'hover:bg-red-500',
      'mt-[3rem]',
      'text-sm',
    ]);
  });

  it('does not treat non-utility class names or plain strings as Tailwind', () => {
    const files = {
      'src/App.tsx': [
        'export const A = () => <div className="client-detail hds-card" />;',
        "const label = 'flex items-center';",
      ].join('\n'),
    };
    expect(scanApp(files)).toEqual([]);
  });

  it('flags raw HTML controls but not design-system components of the same name', () => {
    const files = {
      'src/App.tsx': [
        'export const A = () => (',
        '  <form>',
        '    <button type="button">x</button>',
        '    <input />',
        '    <select></select>',
        '    <textarea />',
        '    <Button>ok</Button>',
        '    <Input />',
        '  </form>',
        ');',
      ].join('\n'),
    };
    const hits = scanApp(files).filter((h) => h.kind === 'raw-control');
    expect(hits.map((h) => h.match)).toEqual(['<button', '<input', '<select', '<textarea']);
  });

  it('flags every custom CSS file and <style> element once', () => {
    const files = {
      'src/App.tsx': 'export const A = () => <style>{`x{}`}</style>;',
      'src/app.css': '.a { color: red; }',
      'src/theme.scss': '.b {}',
    };
    const hits = scanApp(files).filter((h) => h.kind === 'custom-css');
    expect(hits.map((h) => h.file).sort()).toEqual([
      'src/App.tsx',
      'src/app.css',
      'src/theme.scss',
    ]);
  });
});

describe('jaccard: import extraction', () => {
  it('collects named imports from the root and every subpath, incl. /patterns', () => {
    const src = [
      "import { Button, Table as DataTable } from '@hirobius/design-system';",
      'import {',
      '  PageHeader,',
      '  StatTile,',
      "} from '@hirobius/design-system/patterns';",
      "import { useState } from 'react';",
    ].join('\n');
    expect([...extractImports(src)].sort()).toEqual(['Button', 'PageHeader', 'StatTile', 'Table']);
  });

  it('ignores type-only imports, side-effect imports and other packages', () => {
    const src = [
      "import type { ButtonProps } from '@hirobius/design-system';",
      "import { type TableProps, Table } from '@hirobius/design-system';",
      "import '@hirobius/design-system/styles.css';",
      "import { Foo } from '@hirobius/design-system-extras';",
    ].join('\n');
    expect([...extractImports(src)]).toEqual(['Table']);
  });

  it('ignores imports that only appear in a comment', () => {
    const src =
      "// import { Ghost } from '@hirobius/design-system';\nimport { Real } from '@hirobius/design-system';";
    expect([...extractImports(src)]).toEqual(['Real']);
  });

  it('counts default and namespace usage by member name', () => {
    const src = [
      "import * as HDS from '@hirobius/design-system';",
      'export const A = () => <HDS.Card><HDS.Badge /></HDS.Card>;',
    ].join('\n');
    expect([...extractImports(src)].sort()).toEqual(['Badge', 'Card']);
  });
});

describe('jaccard: overlap', () => {
  it('is |A and B| / |A or B| on hand-computed sets', () => {
    // {a,b,c} vs {b,c,d}: 2 shared, 4 in union
    expect(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBe(0.5);
    expect(jaccard(new Set(['a']), new Set(['a']))).toBe(1);
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0);
  });

  it('is 0, not 1, when both sets are empty (nothing measured is not agreement)', () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it('reports every pair and the minimum, with a /patterns import in one app', () => {
    const apps = {
      'app-a': "import { Button, Table } from '@hirobius/design-system';",
      'app-b': "import { Button, Table } from '@hirobius/design-system';",
      // Table + Button + StatTile via /patterns: shares 2 of 3 with each other app
      'app-c':
        "import { Button, Table } from '@hirobius/design-system';\nimport { StatTile } from '@hirobius/design-system/patterns';",
    };
    const r = pairwiseJaccard(apps);
    expect(r.pairs).toEqual([
      { a: 'app-a', b: 'app-b', value: 1 },
      { a: 'app-a', b: 'app-c', value: 2 / 3 },
      { a: 'app-b', b: 'app-c', value: 2 / 3 },
    ]);
    expect(r.min).toBe(2 / 3);
  });

  it('has no minimum for fewer than two apps', () => {
    expect(pairwiseJaccard({ only: "import { A } from '@hirobius/design-system';" })).toEqual({
      pairs: [],
      min: null,
    });
  });
});

describe('pixeldiff: committed PNG pairs', () => {
  // Fixtures are 100x100 (10,000 px). base has a 30x20 (600 px) black block;
  // under.png recolours 10x10 = 100 px of it, over.png recolours 30x10 = 300 px.
  it('reports 1.00% for the under-threshold pair', () => {
    const r = diffPng(png('base.png'), png('under.png'));
    expect(r).toMatchObject({ width: 100, height: 100, totalPixels: 10000, diffPixels: 100 });
    expect(r.diffPct).toBe(1);
  });

  it('reports 3.00% for the over-threshold pair', () => {
    const r = diffPng(png('base.png'), png('over.png'));
    expect(r.diffPixels).toBe(300);
    expect(r.diffPct).toBe(3);
  });

  it('reports the inked-pixel variant against pixels that carry ink in either image', () => {
    // ink = 600 block pixels in both images (the recoloured pixels are still ink)
    const under = diffPng(png('base.png'), png('under.png'));
    expect(under.inkedPixels).toBe(600);
    expect(under.inkedDiffPixels).toBe(100);
    expect(under.inkedDiffPct).toBeCloseTo(100 / 6, 10);
    expect(diffPng(png('base.png'), png('over.png')).inkedDiffPct).toBe(50);
  });

  it('is 0% for identical images', () => {
    const r = diffPng(png('base.png'), png('base.png'));
    expect(r.diffPixels).toBe(0);
    expect(r.diffPct).toBe(0);
    expect(r.inkedDiffPct).toBe(0);
  });

  it('is symmetric', () => {
    const ab = diffPng(png('base.png'), png('over.png'));
    const ba = diffPng(png('over.png'), png('base.png'));
    expect(ba.diffPixels).toBe(ab.diffPixels);
  });

  it('pads the shorter image with white so a taller page counts its extra ink as difference', () => {
    const tall = new PNG({ width: 10, height: 20 });
    tall.data.fill(255);
    for (let y = 10; y < 20; y++) {
      for (let x = 0; x < 10; x++) {
        const i = (y * 10 + x) * 4;
        tall.data[i] = tall.data[i + 1] = tall.data[i + 2] = 0;
      }
    }
    const short = new PNG({ width: 10, height: 10 });
    short.data.fill(255);
    const r = diffPng(PNG.sync.write(short), PNG.sync.write(tall));
    expect(r).toMatchObject({ width: 10, height: 20, totalPixels: 200, diffPixels: 100 });
    expect(r.diffPct).toBe(50);
  });

  it('throws a readable error for a buffer that is not a PNG', () => {
    expect(() => diffPng(Buffer.from('nope'), png('base.png'))).toThrow(/PNG/);
  });
});

describe('evaluate: the five thresholds on recorded results', () => {
  const thresholds = {
    builds: { min: 3, of: 3 },
    violations: { max: 0 },
    axe: { max: 0 },
    jaccard: { min: 0.85 },
    lightDiff: { max: 1.5 },
  };
  const scan = (storyId, theme, violations = [], error = null) => ({
    storyId,
    theme,
    violations,
    error,
  });
  const good = () => ({
    apps: ['a', 'b', 'c'],
    builds: { a: true, b: true, c: true },
    violations: { a: 0, b: 0, c: 0 },
    axe: ['a', 'b', 'c'].flatMap((id) => [scan(id, 'light'), scan(id, 'dark')]),
    jaccard: {
      pairs: [
        { a: 'a', b: 'b', value: 0.9 },
        { a: 'a', b: 'c', value: 0.85 },
        { a: 'b', b: 'c', value: 0.95 },
      ],
    },
    lightDiff: {
      pairs: [
        { a: 'a', b: 'b', pct: 1.5 },
        { a: 'a', b: 'c', pct: 0.4 },
        { a: 'b', b: 'c', pct: 1.1 },
      ],
    },
  });
  const check = (report, name) => report.checks.find((c) => c.name === name);

  it('fails builds unless every app built (3 of 4 is not a pass)', () => {
    const r = evaluate(
      {
        ...good(),
        apps: ['a', 'b', 'c', 'd'],
        builds: { a: true, b: true, c: true, d: false },
      },
      thresholds,
    );
    expect(check(r, 'builds').status).toBe('fail');
    expect(r.pass).toBe(false);
    expect(formatCheck(check(r, 'builds'))).toMatch(/^FAIL builds: measured 3\/4/);
  });

  it('passes every threshold at its exact boundary', () => {
    const r = evaluate(good(), thresholds);
    expect(r.pass).toBe(true);
    expect(r.complete).toBe(true);
    expect(r.checks.map((c) => [c.name, c.status])).toEqual([
      ['builds', 'pass'],
      ['violations', 'pass'],
      ['axe', 'pass'],
      ['jaccard', 'pass'],
      ['lightDiff', 'pass'],
    ]);
  });

  it('fails builds when any app does not build first try', () => {
    const results = good();
    results.builds.c = false;
    const c = check(evaluate(results, thresholds), 'builds');
    expect(c).toMatchObject({ status: 'fail', value: 2, limit: 3 });
    expect(c.detail).toMatch(/c/);
  });

  it('fails violations on any hit, summed across apps', () => {
    const results = good();
    results.violations = { a: 1, b: 0, c: 2 };
    expect(check(evaluate(results, thresholds), 'violations')).toMatchObject({
      status: 'fail',
      value: 3,
      limit: 0,
    });
  });

  it('fails axe on a serious or critical finding, in either theme, but not on moderate', () => {
    const moderate = good();
    moderate.axe[0] = scan('a', 'light', [{ id: 'x', impact: 'moderate', nodes: 1 }]);
    expect(check(evaluate(moderate, thresholds), 'axe').status).toBe('pass');

    const dark = good();
    dark.axe[1] = scan('a', 'dark', [{ id: 'color-contrast', impact: 'serious', nodes: 2 }]);
    expect(check(evaluate(dark, thresholds), 'axe')).toMatchObject({ status: 'fail', value: 1 });
  });

  it('fails axe when a scan errored rather than silently passing', () => {
    const results = good();
    results.axe[2] = scan('b', 'light', [], 'navigation timeout');
    expect(check(evaluate(results, thresholds), 'axe')).toMatchObject({ status: 'fail', value: 1 });
  });

  it('fails Jaccard on the minimum pair, not the mean', () => {
    const results = good();
    results.jaccard.pairs[1].value = 0.71;
    expect(check(evaluate(results, thresholds), 'jaccard')).toMatchObject({
      status: 'fail',
      value: 0.71,
      limit: 0.85,
    });
  });

  it('fails the light pixel diff on the maximum pair', () => {
    const results = good();
    results.lightDiff.pairs[0].pct = 2.37;
    expect(check(evaluate(results, thresholds), 'lightDiff')).toMatchObject({
      status: 'fail',
      value: 2.37,
      limit: 1.5,
    });
  });

  it('marks a metric that was not supplied as not-measured and reports the run incomplete', () => {
    const { builds, axe, lightDiff, ...offline } = good();
    void builds;
    void axe;
    void lightDiff;
    const r = evaluate(offline, thresholds);
    expect(r.checks.map((c) => [c.name, c.status])).toEqual([
      ['builds', 'not-measured'],
      ['violations', 'pass'],
      ['axe', 'not-measured'],
      ['jaccard', 'pass'],
      ['lightDiff', 'not-measured'],
    ]);
    expect(r.pass).toBe(true);
    expect(r.complete).toBe(false);
  });

  it('names the failed threshold with measured value against the limit', () => {
    const results = good();
    results.jaccard.pairs[0].value = 0.68;
    const line = formatCheck(check(evaluate(results, thresholds), 'jaccard'));
    expect(line).toBe('FAIL jaccard: measured 0.68 vs limit >= 0.85 (lowest pair a~b)');
  });

  it('judges a pre-summarised measurement the same way (used for ledger entries)', () => {
    const measured = {
      builds: { passing: 3, of: 3 },
      violations: 0,
      axe: 0,
      jaccardMin: 0.71,
      lightDiffMax: 2.37,
    };
    const r = judgeMeasured(measured, thresholds);
    expect(r.checks.filter((c) => c.status === 'fail').map((c) => c.name)).toEqual([
      'jaccard',
      'lightDiff',
    ]);
    expect(r.pass).toBe(false);
  });
});

describe('ledger: the committed file', () => {
  const ledgerPath = path.join(ROOT, 'eval/consistency/ledger.json');
  const ledger = readLedger(ledgerPath);

  it('has a valid shape', () => {
    expect(validateLedger(ledger)).toEqual([]);
  });

  it('holds the plan thresholds', () => {
    expect(ledger.thresholds).toEqual({
      builds: { min: 3, of: 3 },
      violations: { max: 0 },
      axe: { max: 0 },
      jaccard: { min: 0.85 },
      lightDiff: { max: 1.5 },
    });
  });

  it('is seeded with the two review runs, both honestly failing', () => {
    expect(ledger.entries.map((e) => [e.date, e.source, e.pass])).toEqual([
      ['2026-09-28', 'review', false],
      ['2026-09-29', 'review', false],
    ]);
    const [one, two] = ledger.entries;
    for (const e of ledger.entries) {
      expect(e.packageVersion).toBe('0.16.0');
      expect(e.tarballSha256).toBeNull();
      expect(e.measured.builds).toEqual({ passing: 3, of: 3 });
      expect(e.measured.violations).toBe(0);
      expect(e.measured.axe).toBe(0);
      expect(e.thresholds).toEqual(ledger.thresholds);
    }
    expect(one.measured).toMatchObject({ jaccardMin: 0.71, lightDiffMax: 2.37 });
    expect(one.detail).toEqual({
      jaccard: [0.9, 0.71, 0.77],
      lightDiff: [2.37, 1.72, 2.35],
      darkDiff: [4.3, 3.09, 3.97],
    });
    expect(two.measured).toMatchObject({ jaccardMin: 0.68, lightDiffMax: 2.39 });
    expect(two.detail).toEqual({
      jaccard: [0.9, 0.68, 0.74],
      lightDiff: [2.39, 1.71, 2.35],
      darkDiff: [4.26, 3.04, 3.93],
    });
  });

  it('records a pass flag that agrees with re-judging the measured figures', () => {
    for (const e of ledger.entries) {
      const judged = judgeMeasured(e.measured, e.thresholds);
      expect(judged.checks.filter((c) => c.status === 'fail').map((c) => c.name)).toEqual([
        'jaccard',
        'lightDiff',
      ]);
      expect(e.pass).toBe(judged.pass);
    }
  });
});

describe('ledger: validation', () => {
  const base = () => structuredClone(readLedger(path.join(ROOT, 'eval/consistency/ledger.json')));

  it('rejects a pass flag that disagrees with the figures', () => {
    const l = base();
    l.entries[0].pass = true;
    expect(validateLedger(l).join('\n')).toMatch(/pass/);
  });

  it('rejects a review-only null hash on a harness entry', () => {
    const e = { ...base().entries[1], source: 'harness' };
    expect(validateEntry(e).join('\n')).toMatch(/tarballSha256/);
  });

  it('rejects a minimum that disagrees with the recorded pair values', () => {
    const l = base();
    l.entries[0].measured.jaccardMin = 0.9;
    expect(validateLedger(l).join('\n')).toMatch(/jaccardMin/);
  });

  it('rejects an unknown source and a malformed date', () => {
    const e = { ...base().entries[0], source: 'vibes', date: '28/09/2026' };
    const problems = validateEntry(e).join('\n');
    expect(problems).toMatch(/source/);
    expect(problems).toMatch(/date/);
  });
});

describe('ledger: append-only writer', () => {
  const src = path.join(ROOT, 'eval/consistency/ledger.json');
  const fresh = () => {
    const dir = makeTmp('ledger-');
    const file = path.join(dir, 'ledger.json');
    copyFileSync(src, file);
    return file;
  };
  const harnessEntry = (over = {}) => ({
    date: '2026-10-01',
    source: 'harness',
    packageVersion: '0.18.0',
    tarballSha256: 'a'.repeat(64),
    commit: 'b'.repeat(40),
    apps: ['app-a', 'app-b', 'app-c'],
    measured: {
      builds: { passing: 3, of: 3 },
      violations: 0,
      axe: 0,
      jaccardMin: 0.9,
      lightDiffMax: 1.2,
    },
    detail: { jaccard: [0.9, 0.95, 0.92], lightDiff: [1.2, 0.5, 0.7] },
    thresholds: readLedger(src).thresholds,
    pass: true,
    ...over,
  });

  it('leaves every existing byte of the file untouched and adds the new entry last', () => {
    const file = fresh();
    const before = readFileSync(file, 'utf8');
    appendEntry(file, harnessEntry());
    const after = readFileSync(file, 'utf8');
    const head = before.slice(0, before.lastIndexOf('\n  ]'));
    expect(after.startsWith(`${head},\n`)).toBe(true);
    const parsed = JSON.parse(after);
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[2].date).toBe('2026-10-01');
    expect(validateLedger(parsed)).toEqual([]);
    expect(latestEntry(parsed).date).toBe('2026-10-01');
  });

  it('refuses an invalid entry and writes nothing', () => {
    const file = fresh();
    const before = readFileSync(file, 'utf8');
    expect(() => appendEntry(file, harnessEntry({ pass: false }))).toThrow(/pass/);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('refuses an entry dated before the latest one (append-only history)', () => {
    const file = fresh();
    expect(() => appendEntry(file, harnessEntry({ date: '2026-09-01' }))).toThrow(/before/);
  });

  it('refuses an entry whose thresholds are not the ones in force', () => {
    const file = fresh();
    const e = harnessEntry();
    e.thresholds = { ...e.thresholds, jaccard: { min: 0.5 } };
    expect(() => appendEntry(file, e)).toThrow(/thresholds/);
  });
});

describe('ledger: one-line summary and status projection', () => {
  const ledger = readLedger(path.join(ROOT, 'eval/consistency/ledger.json'));

  it('summarises the latest entry on one line', () => {
    expect(summaryLine(latestEntry(ledger))).toBe(
      'Agent consistency 2026-09-29 (review, design-system 0.16.0): FAIL - builds 3/3, violations 0, axe 0, Jaccard min 0.68 (limit >= 0.85), light diff max 2.39% (limit <= 1.5%)',
    );
  });

  it('projects the status.json consistency object from the latest entry', () => {
    expect(consistencyFromEntry(latestEntry(ledger))).toEqual({
      date: '2026-09-29',
      source: 'review',
      pass: false,
      jaccardMin: 0.68,
      lightDiffMax: 2.39,
    });
  });
});

describe('status-sync: status.json and README against the latest ledger entry', () => {
  const ledger = readLedger(path.join(ROOT, 'eval/consistency/ledger.json'));
  const latest = latestEntry(ledger);
  const synced = () => ({ ...consistencyFromEntry(latest) });

  it('reports no drift when the status object matches', () => {
    expect(compareStatus(synced(), latest)).toEqual({ ok: true, drift: [] });
  });

  it('reports drift naming the field, the status value and the ledger value', () => {
    const r = compareStatus({ ...synced(), jaccardMin: 0.9 }, latest);
    expect(r.ok).toBe(false);
    expect(r.drift).toEqual([{ field: 'jaccardMin', status: 0.9, ledger: 0.68 }]);
  });

  it('reports every field that differs, including a stale date and pass flag', () => {
    const r = compareStatus(
      { ...synced(), date: '2026-09-28', pass: true, lightDiffMax: 2.37 },
      latest,
    );
    expect(r.drift.map((d) => d.field).sort()).toEqual(['date', 'lightDiffMax', 'pass']);
  });

  it('reports drift when status.json has no consistency object at all', () => {
    const r = compareStatus(undefined, latest);
    expect(r.ok).toBe(false);
    expect(r.drift[0].field).toBe('consistency');
  });

  it('checkSurfaces flags a README whose Agent consistency line is stale or missing', () => {
    const line = summaryLine(latest);
    expect(checkSurfaces({ status: synced(), readme: `x\n${line}\ny`, ledger }).ok).toBe(true);
    const stale = checkSurfaces({ status: synced(), readme: line.replace('0.68', '0.71'), ledger });
    expect(stale.ok).toBe(false);
    expect(stale.problems.join('\n')).toMatch(/README/);
    expect(checkSurfaces({ status: synced(), readme: 'nothing here', ledger }).ok).toBe(false);
  });

  it('holds for the real README.md and status.json on this branch', () => {
    const r = checkSurfaces({
      status: JSON.parse(readFileSync(path.join(ROOT, 'status.json'), 'utf8')).consistency,
      readme: readFileSync(path.join(ROOT, 'README.md'), 'utf8'),
      ledger,
    });
    expect(r.problems).toEqual([]);
  });
});

describe('pnpm eval:consistency (CLI, offline)', () => {
  const run = (...args) => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/eval-consistency.mjs'), ...args],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const fixtures = 'eval/consistency/fixtures';

  it('exits 0 on the pass fixtures and says what it did not measure', () => {
    const r = run('--apps', `${fixtures}/pass`, '--offline');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/PASS violations: measured 0 vs limit <= 0/);
    expect(r.out).toMatch(/PASS jaccard: measured 1 vs limit >= 0.85/);
    expect(r.out).toMatch(/not measured.*builds.*axe.*pixel diff/i);
  });

  it('exits 1 on a raw hex, naming the violations threshold with value against limit', () => {
    const r = run('--apps', `${fixtures}/fail/raw-hex`, '--offline');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL violations: measured 1 vs limit <= 0/);
    expect(r.out).toMatch(/hex/);
  });

  it('exits 1 on a raw <button>', () => {
    const r = run('--apps', `${fixtures}/fail/raw-button`, '--offline');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL violations: measured 1 vs limit <= 0/);
    expect(r.out).toMatch(/raw-control/);
  });

  it('exits 1 on a low-overlap import set, naming the Jaccard threshold', () => {
    const r = run('--apps', `${fixtures}/fail/low-overlap`, '--offline');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL jaccard: measured 0\.4 vs limit >= 0\.85/);
  });

  it('does NOT count a hex, px, rgb or <button> that only appears in a comment', () => {
    const r = run('--apps', `${fixtures}/fail/comment-only-hex`, '--offline');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/PASS violations: measured 0/);
  });

  it('exits 2 on usage and input errors', () => {
    expect(run().code).toBe(2);
    expect(run('--apps', `${fixtures}/does-not-exist`, '--offline').code).toBe(2);
    expect(run('--apps', `${fixtures}/png`, '--offline').code).toBe(2); // no app directories
    expect(run('--apps', `${fixtures}/pass/app-a`, '--offline').code).toBe(2); // one app has no pair
    expect(run('--bogus').code).toBe(2);
  });

  it('--summary prints exactly the latest ledger line and exits 0', () => {
    const ledger = readLedger(path.join(ROOT, 'eval/consistency/ledger.json'));
    const r = run('--summary');
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe(summaryLine(latestEntry(ledger)));
  });

  it('--help documents the flags and the exit codes, and tolerates the pnpm "--"', () => {
    for (const args of [['--help'], ['--', '--help']]) {
      const r = run(...args);
      expect(r.code).toBe(0);
      for (const needle of ['--apps', '--offline', '--summary', '0', '1', '2']) {
        expect(r.out).toContain(needle);
      }
    }
  });

  it('never writes a ledger entry', () => {
    const file = path.join(ROOT, 'eval/consistency/ledger.json');
    const before = readFileSync(file, 'utf8');
    run('--apps', `${fixtures}/pass`, '--offline');
    run('--apps', `${fixtures}/fail/raw-hex`, '--offline');
    expect(readFileSync(file, 'utf8')).toBe(before);
  });
});

describe('eval/consistency/runs/', () => {
  it('is gitignored so a run cannot be committed by `git add -A`', () => {
    const r = spawnSync(
      'git',
      ['check-ignore', '-q', 'eval/consistency/runs/2026-10-01/app-a/src/App.tsx'],
      {
        cwd: ROOT,
      },
    );
    expect(r.status).toBe(0);
  });
});

describe('the README "Agent consistency" block', () => {
  it('contains exactly the line --summary prints', () => {
    const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    const printed = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/eval-consistency.mjs'), '--summary'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    ).stdout.trim();
    expect(readme.split('\n')).toContain(printed);
  });
});

describe('status-sync: checkRepo and check-status-claims --check', () => {
  const fixtureRepo = (mutate) => {
    const dir = makeTmp('status-sync-');
    mkdirSync(path.join(dir, 'eval/consistency'), { recursive: true });
    for (const f of ['README.md', 'status.json', 'eval/consistency/ledger.json']) {
      copyFileSync(path.join(ROOT, f), path.join(dir, f));
    }
    mutate?.(dir);
    return dir;
  };

  it('is clean for a repo whose surfaces match the ledger', () => {
    expect(checkRepo(fixtureRepo())).toEqual({ ok: true, problems: [] });
  });

  it('reports drift when status.json carries a different figure', () => {
    const dir = fixtureRepo((d) => {
      const file = path.join(d, 'status.json');
      const status = JSON.parse(readFileSync(file, 'utf8'));
      status.consistency.jaccardMin = 0.99;
      writeFileSync(file, JSON.stringify(status));
    });
    const r = checkRepo(dir);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toMatch(/consistency\.jaccardMin/);
  });

  it('reports drift when the ledger gains an entry the README does not show', () => {
    const dir = fixtureRepo((d) => {
      const file = path.join(d, 'eval/consistency/ledger.json');
      const ledger = JSON.parse(readFileSync(file, 'utf8'));
      const next = structuredClone(ledger.entries[1]);
      next.date = '2026-10-05';
      writeFileSync(file, JSON.stringify({ ...ledger, entries: [...ledger.entries, next] }));
    });
    const r = checkRepo(dir);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toMatch(/consistency\.date/);
    expect(r.problems.join('\n')).toMatch(/README/);
  });

  it('check-status-claims --check exits 0 on this branch', () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/check-status-claims.mjs'), '--check'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/consistency/);
  });
});
