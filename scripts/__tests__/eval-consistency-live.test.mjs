/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#344 — the live half of the agent-consistency harness, tested WITHOUT a
 * network, a browser or a build. Seams: the pure planning module
 * (live-plan.mjs), the template staging (stage.mjs), the orchestrator with its
 * stages injected (live.mjs) and the CLI's argument handling. The live stages
 * themselves (pack, build, render, axe-run) are exercised by running
 * `pnpm eval:consistency -- --apps <dir>`, never by `pnpm test`.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import {
  VIEWPORTS,
  axeScanRow,
  buildEntry,
  failedStages,
  installFailureMessage,
  pairwiseDiffs,
  peerSpecs,
  runDate,
  shotName,
  trimBuildLog,
} from '../lib/consistency/live-plan.mjs';
import { stageApp } from '../lib/consistency/stage.mjs';
import { runLive } from '../lib/consistency/live.mjs';
import { readLedger, validateEntry } from '../lib/consistency/ledger.mjs';
import { evaluate } from '../lib/consistency/evaluate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THRESHOLDS = readLedger(path.join(ROOT, 'eval/consistency/ledger.json')).thresholds;

const tmpDirs = [];
const makeTmp = (prefix) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

function solidPng(width, height, [r, g, b]) {
  const img = new PNG({ width, height });
  for (let p = 0; p < width * height; p += 1) {
    img.data[p * 4] = r;
    img.data[p * 4 + 1] = g;
    img.data[p * 4 + 2] = b;
    img.data[p * 4 + 3] = 255;
  }
  return PNG.sync.write(img);
}

describe('the screenshot matrix', () => {
  it('is 1280x800 light, 1280x800 dark and 390 wide light', () => {
    expect(VIEWPORTS.map((v) => [v.key, v.width, v.theme])).toEqual([
      ['1280-light', 1280, 'light'],
      ['1280-dark', 1280, 'dark'],
      ['390-light', 390, 'light'],
    ]);
    expect(VIEWPORTS[0].height).toBe(800);
    expect(VIEWPORTS[1].height).toBe(800);
  });

  it('names a PNG by app and viewport', () => {
    expect(shotName('app-a', VIEWPORTS[1])).toBe('app-a-1280-dark.png');
  });
});

describe('runDate', () => {
  it('is the UTC calendar date, not the local one', () => {
    expect(runDate(new Date('2026-10-01T23:30:00-05:00'))).toBe('2026-10-02');
  });
});

describe('peerSpecs: what gets installed next to the tarball', () => {
  const pkg = {
    peerDependencies: {
      react: '^18.3.0 || ^19.0.0',
      'react-dom': '^18.3.0 || ^19.0.0',
      'react-router': '^7.0.0',
      zod: '^3.23.0 || ^4.0.0',
    },
    peerDependenciesMeta: { 'react-router': { optional: true }, zod: { optional: true } },
  };

  it('installs every required peer, pinning React to the 18 line the types are for', () => {
    expect(peerSpecs(pkg)).toEqual(expect.arrayContaining(['react@^18.3', 'react-dom@^18.3']));
  });

  it('skips optional peers except the router the smoke test also installs', () => {
    const specs = peerSpecs(pkg);
    expect(specs).toContain('react-router@^7.0.0');
    expect(specs.some((s) => s.startsWith('zod@'))).toBe(false);
  });

  it('installs a required peer at its declared range', () => {
    expect(peerSpecs({ peerDependencies: { react: '^18.3.0', lenis: '^1.3.0' } })).toContain(
      'lenis@^1.3.0',
    );
  });
});

describe('installFailureMessage', () => {
  it('names the fix when the registry cannot be reached', () => {
    for (const text of [
      'npm error code ENOTFOUND\nnpm error network request to https://registry.npmjs.org failed',
      'npm error code EAI_AGAIN',
      'npm error code ETIMEDOUT',
      'npm error 403 Forbidden - GET https://registry.npmjs.org/react (proxy)',
    ]) {
      const msg = installFailureMessage(text);
      expect(msg).toMatch(/network or proxy/i);
      expect(msg).toMatch(/--offline/);
    }
  });

  it('keeps the tail of an unrelated failure instead of blaming the network', () => {
    const msg = installFailureMessage('a\nb\nnpm error peer dep conflict: react@19\n');
    expect(msg).not.toMatch(/network or proxy/i);
    expect(msg).toMatch(/peer dep conflict/);
  });
});

describe('axeScanRow', () => {
  it('turns an axe result into a scan row keyed by app and theme', () => {
    const row = axeScanRow('app-a', 'dark', {
      violations: [
        {
          id: 'color-contrast',
          impact: 'serious',
          help: 'h',
          nodes: [{ html: 'a' }, { html: 'b' }],
        },
      ],
    });
    expect(row).toEqual({
      storyId: 'app-a',
      theme: 'dark',
      error: null,
      violations: [
        { id: 'color-contrast', impact: 'serious', nodes: 2, help: 'h', sample: ['a', 'b'] },
      ],
    });
  });

  it('records a scan that could not run as an error, which counts against the axe threshold', () => {
    const row = axeScanRow('app-a', 'light', { error: new Error('page crashed\nstack') });
    expect(row.error).toBe('page crashed');
    const report = evaluate({ axe: [row] }, THRESHOLDS);
    expect(report.checks.find((c) => c.name === 'axe').status).toBe('fail');
  });
});

describe('pairwiseDiffs', () => {
  it('diffs every pair of same-viewport PNGs as a percentage', () => {
    const white = solidPng(10, 10, [255, 255, 255]);
    const black = solidPng(10, 10, [0, 0, 0]);
    const r = pairwiseDiffs({ 'app-b': white, 'app-a': white, 'app-c': black });
    expect(r.pairs.map((p) => `${p.a}~${p.b}`)).toEqual([
      'app-a~app-b',
      'app-a~app-c',
      'app-b~app-c',
    ]);
    expect(r.pairs[0].pct).toBe(0);
    expect(r.pairs[1].pct).toBe(100);
  });
});

describe('buildEntry', () => {
  const base = () => ({
    date: '2026-10-01',
    packageVersion: '0.18.0',
    tarballSha256: 'a'.repeat(64),
    commit: 'b'.repeat(40),
    apps: ['app-a', 'app-b', 'app-c'],
    thresholds: THRESHOLDS,
    results: {
      apps: ['app-a', 'app-b', 'app-c'],
      builds: { 'app-a': true, 'app-b': true, 'app-c': true },
      violations: { 'app-a': 0, 'app-b': 0, 'app-c': 0 },
      axe: ['app-a', 'app-b', 'app-c'].flatMap((id) =>
        ['light', 'dark'].map((theme) => ({ storyId: id, theme, violations: [], error: null })),
      ),
      jaccard: {
        pairs: [
          { a: 'app-a', b: 'app-b', value: 0.9 },
          { a: 'app-a', b: 'app-c', value: 0.8571428 },
          { a: 'app-b', b: 'app-c', value: 1 },
        ],
      },
      lightDiff: {
        pairs: [
          { a: 'app-a', b: 'app-b', pct: 0.1 },
          { a: 'app-a', b: 'app-c', pct: 1.2345678 },
          { a: 'app-b', b: 'app-c', pct: 0.5 },
        ],
      },
      darkDiff: { pairs: [{ a: 'app-a', b: 'app-b', pct: 2.5 }] },
    },
  });

  it('records a valid harness entry with all five measured figures', () => {
    const { entry, report } = buildEntry(base());
    expect(validateEntry(entry)).toEqual([]);
    expect(entry.source).toBe('harness');
    expect(entry.tarballSha256).toBe('a'.repeat(64));
    expect(entry.commit).toBe('b'.repeat(40));
    expect(entry.measured).toEqual({
      builds: { passing: 3, of: 3 },
      violations: 0,
      axe: 0,
      jaccardMin: 0.8571,
      lightDiffMax: 1.2346,
    });
    expect(entry.pass).toBe(true);
    expect(report.pass).toBe(true);
    expect(entry.detail.darkDiff).toEqual([2.5]);
  });

  it('sets pass from the thresholds, so a low Jaccard records pass: false', () => {
    const input = base();
    input.results.jaccard.pairs[1].value = 0.4;
    const { entry } = buildEntry(input);
    expect(entry.measured.jaccardMin).toBe(0.4);
    expect(entry.pass).toBe(false);
    expect(validateEntry(entry)).toEqual([]);
  });

  it('records a failing light pixel diff as pass: false and never softens the threshold', () => {
    const input = base();
    input.results.lightDiff.pairs[0].pct = 9;
    const { entry } = buildEntry(input);
    expect(entry.pass).toBe(false);
    expect(entry.thresholds).toEqual(THRESHOLDS);
  });

  it('returns no entry when a figure could not be measured', () => {
    const input = base();
    input.results.lightDiff = { pairs: [] };
    const r = buildEntry(input);
    expect(r.entry).toBeNull();
    expect(r.report.complete).toBe(false);
  });
});

describe('stageApp: template plus one generated app', () => {
  const makeTemplate = () => {
    const t = makeTmp('tpl-');
    mkdirSync(path.join(t, 'src'), { recursive: true });
    mkdirSync(path.join(t, 'node_modules/x'), { recursive: true });
    writeFileSync(path.join(t, 'package.json'), '{"name":"tpl"}');
    writeFileSync(path.join(t, 'index.html'), '<html></html>');
    writeFileSync(path.join(t, 'src/main.tsx'), '// template main');
    writeFileSync(path.join(t, 'src/App.tsx'), '// placeholder');
    writeFileSync(path.join(t, 'node_modules/x/i.js'), '');
    return t;
  };
  const makeApp = (files) => {
    const a = makeTmp('app-');
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(a, 'src', name)), { recursive: true });
      writeFileSync(path.join(a, 'src', name), text);
    }
    return a;
  };

  it('replaces only src/, keeping the template main.tsx even when the app ships one', () => {
    const dest = path.join(makeTmp('dest-'), 'app');
    const r = stageApp(
      makeTemplate(),
      makeApp({ 'App.tsx': '// generated', 'main.tsx': '// hijack', 'lib/x.ts': '// extra' }),
      dest,
    );
    expect(readFileSync(path.join(dest, 'src/App.tsx'), 'utf8')).toBe('// generated');
    expect(readFileSync(path.join(dest, 'src/main.tsx'), 'utf8')).toBe('// template main');
    expect(readFileSync(path.join(dest, 'src/lib/x.ts'), 'utf8')).toBe('// extra');
    expect(readFileSync(path.join(dest, 'package.json'), 'utf8')).toBe('{"name":"tpl"}');
    expect(r.ignored).toEqual(['src/main.tsx']);
  });

  it('does not copy the template node_modules', () => {
    const dest = path.join(makeTmp('dest-'), 'app');
    stageApp(makeTemplate(), makeApp({ 'App.tsx': '//' }), dest);
    expect(existsSync(path.join(dest, 'node_modules'))).toBe(false);
  });

  it('refuses an app with no src/App.tsx, naming it', () => {
    const dest = path.join(makeTmp('dest-'), 'app');
    expect(() => stageApp(makeTemplate(), makeApp({ 'Other.tsx': '//' }), dest)).toThrow(
      /src\/App\.tsx/,
    );
  });
});

describe('the committed template', () => {
  const T = path.join(ROOT, 'eval/consistency/template');
  const read = (f) => readFileSync(path.join(T, f), 'utf8');

  it('ships the files a Vite + React + TypeScript app needs', () => {
    for (const f of [
      'package.json',
      'index.html',
      'vite.config.ts',
      'tsconfig.json',
      'src/main.tsx',
      'src/App.tsx',
    ]) {
      expect(existsSync(path.join(T, f)), f).toBe(true);
    }
  });

  it('owns the documented scope: data-hds, data-theme from ?theme, and the package stylesheet', () => {
    const main = read('src/main.tsx');
    expect(main).toMatch(/data-hds/);
    expect(main).toMatch(/data-theme=\{theme\}/);
    expect(main).toMatch(/URLSearchParams/);
    expect(main).toMatch(/'theme'|"theme"/);
    expect(main).toMatch(/import ['"]@hirobius\/design-system\/tokens\.css['"]/);
  });

  it('mounts src/App.tsx whether it exports the component as default or as App, and says so when neither', () => {
    const main = read('src/main.tsx');
    expect(main).toMatch(/import \* as \w+ from '\.\/App'/);
    expect(main).toMatch(/default/);
    expect(main).toMatch(/must export the root component as default or as App/);
  });

  it('carries the language and title axe needs, and does not pin the design system', () => {
    expect(read('index.html')).toMatch(/<html lang="en"/);
    expect(read('index.html')).toMatch(/<title>[^<]+<\/title>/);
    const pkg = JSON.parse(read('package.json'));
    expect(JSON.stringify(pkg)).not.toMatch(/hirobius/);
  });

  it('is not linted or typechecked as repo source', () => {
    // the repo's typecheck includes only src/, and lint covers src scripts validators tests.
    const ts = JSON.parse(readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8'));
    expect(ts.include).toEqual(['src']);
  });
});

/** Stages that record their calls and never touch the network or a browser. */
function fakeStages(over = {}) {
  const calls = [];
  const stages = {
    calls,
    pack: async (o) => {
      calls.push(['pack', o.skipBuild]);
      return { tarball: '/x/pkg.tgz', sha256: 'c'.repeat(64), version: '0.18.0' };
    },
    prepare: async (app) => {
      calls.push(['prepare', app.id]);
      return { dir: `/scratch/${app.id}` };
    },
    build: async (app) => {
      calls.push(['build', app.id]);
      return { typechecked: true, built: true, log: '' };
    },
    render: async (app) => {
      calls.push(['render', app.id]);
      const grey = solidPng(8, 8, [200, 200, 200]);
      return Object.fromEntries(VIEWPORTS.map((v) => [v.key, grey]));
    },
    axe: async (app) => {
      calls.push(['axe', app.id]);
      return ['light', 'dark'].map((theme) => axeScanRow(app.id, theme, { violations: [] }));
    },
    commit: () => 'd'.repeat(40),
    ...over,
  };
  return stages;
}

function fakeInput(over = {}) {
  const ledgerDir = makeTmp('ledger-');
  const ledgerFile = path.join(ledgerDir, 'ledger.json');
  writeFileSync(
    ledgerFile,
    // entries last and opened on its own line, as the append-only writer expects
    `${JSON.stringify({ thresholds: THRESHOLDS }, null, 2).replace(/\n}$/, ',\n  "entries": [\n  ]\n}')}\n`,
  );
  const same =
    "import { Button, Card } from '@hirobius/design-system';\n<Card><Button>Save</Button></Card>";
  return {
    root: ROOT,
    ledgerFile,
    reportsDir: path.join(ledgerDir, 'reports'),
    apps: ['app-a', 'app-b', 'app-c'].map((id) => ({
      id,
      dir: `/apps/${id}`,
      files: { 'src/App.tsx': same },
    })),
    date: '2026-10-01',
    skipBuild: false,
    writeLedger: true,
    log: () => {},
    ...over,
  };
}

describe('runLive: the orchestration, with its stages injected', () => {
  it('runs pack once, then every stage for every app, and exits 0 on a pass', async () => {
    const stages = fakeStages();
    const r = await runLive(fakeInput(), stages);
    expect(r.code).toBe(0);
    expect(stages.calls.filter((c) => c[0] === 'pack')).toHaveLength(1);
    for (const stage of ['prepare', 'build', 'render', 'axe']) {
      expect(
        stages.calls
          .filter((c) => c[0] === stage)
          .map((c) => c[1])
          .sort(),
      ).toEqual(['app-a', 'app-b', 'app-c']);
    }
    expect(r.report.complete).toBe(true);
  });

  it('writes the PNGs to reports/<date>/ for every app and viewport', async () => {
    const input = fakeInput();
    await runLive(input, fakeStages());
    const dir = path.join(input.reportsDir, '2026-10-01');
    expect(readdirSync(dir).sort()).toEqual(
      ['app-a', 'app-b', 'app-c'].flatMap((id) => VIEWPORTS.map((v) => shotName(id, v))).sort(),
    );
  });

  it('appends one harness entry carrying the tarball sha256 and commit', async () => {
    const input = fakeInput();
    await runLive(input, fakeStages());
    const ledger = readLedger(input.ledgerFile);
    expect(ledger.entries).toHaveLength(1);
    const e = ledger.entries[0];
    expect(e.source).toBe('harness');
    expect(e.date).toBe('2026-10-01');
    expect(e.tarballSha256).toBe('c'.repeat(64));
    expect(e.commit).toBe('d'.repeat(40));
    expect(e.measured.builds).toEqual({ passing: 3, of: 3 });
    expect(e.pass).toBe(true);
  });

  it('exits 1 and names the light pixel diff threshold when the layouts differ', async () => {
    const stages = fakeStages({
      render: async (app) => {
        const colour = app.id === 'app-a' ? [0, 0, 0] : [255, 255, 255];
        const png = solidPng(8, 8, colour);
        return Object.fromEntries(VIEWPORTS.map((v) => [v.key, png]));
      },
    });
    const r = await runLive(fakeInput(), stages);
    expect(r.code).toBe(1);
    expect(r.report.checks.find((c) => c.name === 'lightDiff').status).toBe('fail');
    expect(r.entry.pass).toBe(false);
  });

  it('exits 1 on an axe violation', async () => {
    const stages = fakeStages({
      axe: async (app) => [
        axeScanRow(app.id, 'light', {
          violations: [{ id: 'label', impact: 'critical', nodes: [{ html: '<input>' }] }],
        }),
        axeScanRow(app.id, 'dark', { violations: [] }),
      ],
    });
    const r = await runLive(fakeInput(), stages);
    expect(r.code).toBe(1);
    expect(r.report.checks.find((c) => c.name === 'axe').status).toBe('fail');
  });

  it('does not render or scan an app that failed to build, and writes no entry', async () => {
    const input = fakeInput();
    const stages = fakeStages({
      build: async (app) =>
        app.id === 'app-b'
          ? { typechecked: false, built: false, log: 'error TS2322' }
          : { typechecked: true, built: true, log: '' },
    });
    const r = await runLive(input, stages);
    expect(r.code).toBe(1);
    expect(stages.calls.some((c) => c[0] === 'render' && c[1] === 'app-b')).toBe(false);
    expect(stages.calls.some((c) => c[0] === 'axe' && c[1] === 'app-b')).toBe(false);
    expect(r.entry).toBeNull();
    expect(readLedger(input.ledgerFile).entries).toHaveLength(0);
    expect(r.report.checks.find((c) => c.name === 'builds').status).toBe('fail');
  });

  it('reports axe as not measured when no app was built to scan, not as a clean 0', async () => {
    const stages = fakeStages({
      build: async () => ({ typechecked: false, built: false, log: 'error TS2322' }),
    });
    const r = await runLive(fakeInput(), stages);
    expect(r.report.checks.find((c) => c.name === 'axe').status).toBe('not-measured');
  });

  it('counts an app that builds but does not type-check as not building', async () => {
    const stages = fakeStages({
      build: async () => ({ typechecked: false, built: true, log: '' }),
    });
    const r = await runLive(fakeInput(), stages);
    expect(r.report.measured.builds.passing).toBe(0);
    expect(r.code).toBe(1);
  });

  it('measures raw hex from source, so the violations threshold is live too', async () => {
    const input = fakeInput();
    input.apps[0].files['src/App.tsx'] += "\nconst c = '#ff0000';";
    const r = await runLive(input, fakeStages());
    expect(r.code).toBe(1);
    expect(r.report.checks.find((c) => c.name === 'violations').status).toBe('fail');
  });

  it('does not write the ledger when told not to (fixture runs)', async () => {
    const input = fakeInput({ writeLedger: false });
    const r = await runLive(input, fakeStages());
    expect(r.code).toBe(0);
    expect(readLedger(input.ledgerFile).entries).toHaveLength(0);
  });

  it('passes --skip-build through to the pack stage', async () => {
    const stages = fakeStages();
    await runLive(fakeInput({ skipBuild: true }), stages);
    expect(stages.calls.find((c) => c[0] === 'pack')[1]).toBe(true);
  });

  it('lets a pack failure through, so the CLI can name the fix', async () => {
    const stages = fakeStages({
      pack: async () => {
        throw new Error('npm pack failed');
      },
    });
    await expect(runLive(fakeInput(), stages)).rejects.toThrow(/npm pack failed/);
  });
});

describe('pnpm eval:consistency (CLI, live arguments)', () => {
  const run = (...args) => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/eval-consistency.mjs'), ...args],
      { cwd: ROOT, encoding: 'utf8' },
    );
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const fixtures = 'eval/consistency/fixtures';

  it('--help documents --apps, --skip-build, --offline, --summary and exit codes 0/1/2', () => {
    const r = run('--help');
    expect(r.code).toBe(0);
    for (const needle of ['--apps', '--skip-build', '--offline', '--summary']) {
      expect(r.out).toContain(needle);
    }
    expect(r.out).toMatch(/^\s*0\s/m);
    expect(r.out).toMatch(/^\s*1\s/m);
    expect(r.out).toMatch(/^\s*2\s/m);
  });

  it('validates the apps directory before any pack, build or browser work', () => {
    expect(run('--apps', `${fixtures}/does-not-exist`).code).toBe(2);
    expect(run('--apps', `${fixtures}/png`).code).toBe(2);
    expect(run('--apps', `${fixtures}/pass/app-a`).code).toBe(2);
  });

  it('rejects --skip-build with --offline, which never builds', () => {
    const r = run('--apps', `${fixtures}/pass`, '--offline', '--skip-build');
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/--skip-build/);
  });

  it('exits 2 when there is no --apps directory, and says how to supply one', () => {
    const r = run('--skip-build');
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/--apps/);
  });
});

describe('recorded runs', () => {
  it('are ignored by prettier, so lint-staged does not rewrite the recorded inputs', () => {
    const lines = readFileSync(path.join(ROOT, '.prettierignore'), 'utf8').split('\n');
    expect(lines).toContain('eval/consistency/runs/');
  });
});

describe('the layout-diff fixture', () => {
  const run = (...args) => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/eval-consistency.mjs'), ...args],
      { cwd: ROOT, encoding: 'utf8' },
    );
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };

  it('is invisible to the offline half: same imports, no violations, so it passes there', () => {
    const r = run('--apps', 'eval/consistency/fixtures/fail/layout-diff', '--offline');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/PASS jaccard: measured 1 /);
    expect(r.out).toMatch(/PASS violations: measured 0 /);
  });
});

describe('trimBuildLog', () => {
  it('keeps the first lines of a tool failure and drops the stack frames', () => {
    const log = [
      'src/main.tsx(4,10): error TS2614: Module has no exported member',
      'error during build:',
      '    at getRollupError (file:///x/parseAst.js:319:41)',
      '    at error (file:///x/parseAst.js:315:42)',
      'file: /x/main.tsx',
    ].join('\n');
    const out = trimBuildLog(log, 10);
    expect(out).toContain('TS2614');
    expect(out).toContain('file: /x/main.tsx');
    expect(out).not.toMatch(/getRollupError/);
  });

  it('caps the number of lines', () => {
    const log = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    expect(trimBuildLog(log, 5).split('\n')).toHaveLength(6);
    expect(trimBuildLog(log, 5)).toMatch(/45 more lines/);
  });
});

describe('failedStages', () => {
  it('names each stage that failed, so a vite failure is not blamed on the type check', () => {
    expect(failedStages({ typechecked: true, built: false })).toBe('vite build failed');
    expect(failedStages({ typechecked: false, built: true })).toBe('type check failed');
    expect(failedStages({ typechecked: false, built: false })).toBe(
      'type check and vite build failed',
    );
  });
});
