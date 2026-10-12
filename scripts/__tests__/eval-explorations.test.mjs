/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#628 phase 0 — the explorations option on the consistency harness entry:
 * `pnpm eval:consistency -- --explorations <runs/date>`. The orchestration is
 * tested with its stages replaced by fakes (the same stages the harness uses:
 * pack, prepare, build, render, axe), the CLI by spawning it over run
 * directories written to temp dirs. No network, no browser, no ledger.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
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
import { readDirection } from '../lib/explorations/direction.mjs';
import { runExplorations } from '../lib/explorations/live.mjs';
import { EXPLORATION_VIEWPORTS } from '../lib/explorations/spec.mjs';
import { axeScanRow } from '../lib/consistency/live-plan.mjs';
import { HEX_APP, TENANTS, direction, writeDirection } from './helpers/explorations-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmpDirs = [];
const makeTmp = (prefix = 'eval-explorations-') => {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

const PACKED = {
  tarball: '/x/pkg.tgz',
  sha256: 'c'.repeat(64),
  version: '0.21.0',
  commit: 'd'.repeat(40),
  dirty: false,
};

const BEND = {
  kind: 'hex',
  file: 'src/App.tsx',
  match: '#7c3aed',
  why: 'The hero needs a violet the palette has no step for.',
  change: 'token: add a supporting accent to the semantic tier',
};

/** Stages that record their calls and never touch the network or a browser. */
function fakeStages(over = {}) {
  const calls = [];
  return {
    calls,
    pack: async (o) => {
      calls.push(['pack', o.skipBuild]);
      return PACKED;
    },
    prepare: async (app) => {
      calls.push(['prepare', app.id]);
      return { dir: `/scratch/${app.id}` };
    },
    build: async (app) => {
      calls.push(['build', app.id]);
      return { typechecked: true, built: true, log: '' };
    },
    render: async (app, opts) => {
      calls.push(['render', app.id, opts]);
      return Object.fromEntries(
        opts.viewports.map((v) => [v.key, Buffer.from(`png ${app.id} ${v.key}`)]),
      );
    },
    axe: async (app, opts) => {
      calls.push(['axe', app.id, opts]);
      return opts.viewports.map((v) =>
        axeScanRow(app.id, `${v.theme}@${v.width}`, { violations: [] }),
      );
    },
    ...over,
  };
}

function input(directions, over = {}) {
  const base = makeTmp('explorations-out-');
  return {
    root: ROOT,
    date: '2026-10-13',
    run: 'eval/explorations/runs/2026-10-13',
    outDir: path.join(base, 'shots'),
    directions,
    tenants: TENANTS,
    denylist: [],
    fixtureFindings: [],
    skipBuild: false,
    log: () => {},
    ...over,
  };
}

const full = () => [direction('A'), direction('B'), direction('C')];
const find = (report, id, name) => report.directions[id].checks.find((c) => c.name === name);

describe('runExplorations: offline (no stages), the half that needs no network or browser', () => {
  it('judges layout, lint, gaps and PII, and says what it did not measure', async () => {
    const lines = [];
    const r = await runExplorations(input(full(), { log: (l) => lines.push(l) }), null);
    expect(r.code).toBe(0);
    expect(r.report.mode).toBe('offline');
    expect(lines.join('\n')).toMatch(/PASS lint standing-A: 0 violations/);
    expect(lines.join('\n')).toMatch(/not measured \(offline\): builds, axe, screenshots/);
    expect(find(r.report, 'standing-A', 'builds').status).toBe('not-measured');
    expect(find(r.report, 'standing-A', 'axe').status).toBe('not-measured');
  });

  it('exits 1 for a C app with an unlisted violation, and names it', async () => {
    const lines = [];
    const c = direction('C', { files: { 'src/App.tsx': HEX_APP } });
    const r = await runExplorations(input([c], { log: (l) => lines.push(l) }), null);
    expect(r.code).toBe(1);
    expect(r.report.pass).toBe(false);
    expect(lines.join('\n')).toMatch(
      /FAIL lint standing-C.*\n.*not in bend-log\.json[\s\S]*#7c3aed/,
    );
    expect(lines.join('\n')).toMatch(/RESULT: FAIL/);
  });

  it('exits 0 for the same C app once the violation is listed in its bend log', async () => {
    const c = direction('C', {
      files: { 'src/App.tsx': HEX_APP },
      meta: { bendLog: { present: true, value: [BEND] } },
    });
    const r = await runExplorations(input([c]), null);
    expect(r.code).toBe(0);
    expect(r.report.directions['standing-C'].pass).toBe(true);
  });

  it('fails the run on a fixture PII finding, even when every direction is clean', async () => {
    const lines = [];
    const r = await runExplorations(
      input(full(), {
        fixtureFindings: [
          {
            file: 'eval/explorations/screens/pitch/fixture.json',
            line: 4,
            kind: 'phone',
            match: '(312) 867-5309',
          },
        ],
        log: (l) => lines.push(l),
      }),
      null,
    );
    expect(r.code).toBe(1);
    expect(r.report.fixtures.status).toBe('fail');
    expect(lines.join('\n')).toMatch(/FAIL fixtures.*\n.*screens\/pitch\/fixture\.json:4 phone/);
  });

  it('does not write screenshots or a report', async () => {
    const i = input(full());
    await runExplorations(i, null);
    expect(() => readdirSync(i.outDir)).toThrow();
  });
});

describe('runExplorations: the live half, with its stages injected', () => {
  it('packs once, then prepares, builds, renders and scans every direction', async () => {
    const stages = fakeStages();
    const r = await runExplorations(input(full()), stages);
    expect(r.code).toBe(0);
    expect(stages.calls.filter((c) => c[0] === 'pack')).toHaveLength(1);
    for (const stage of ['prepare', 'build', 'render', 'axe']) {
      expect(
        stages.calls
          .filter((c) => c[0] === stage)
          .map((c) => c[1])
          .sort(),
      ).toEqual(['standing-A', 'standing-B', 'standing-C']);
    }
    expect(r.report.mode).toBe('full');
    expect(r.report.pack).toEqual({
      tarballSha256: 'c'.repeat(64),
      commit: 'd'.repeat(40),
      dirty: false,
      version: '0.21.0',
    });
  });

  it('renders and scans each direction at 1280 and 390, light and dark, under its own tenant', async () => {
    const stages = fakeStages();
    await runExplorations(input(full()), stages);
    const optsOf = (stage, id) => stages.calls.find((c) => c[0] === stage && c[1] === id)[2];
    expect(EXPLORATION_VIEWPORTS.map((v) => v.key)).toEqual([
      '1280-light',
      '1280-dark',
      '390-light',
      '390-dark',
    ]);
    for (const stage of ['render', 'axe']) {
      expect(optsOf(stage, 'standing-A').viewports).toEqual(EXPLORATION_VIEWPORTS);
      expect(optsOf(stage, 'standing-A').tenant).toBeNull();
      expect(optsOf(stage, 'standing-B').tenant).toBe('accent-lilac');
      expect(optsOf(stage, 'standing-C').tenant).toBe('accent-lilac');
    }
  });

  it('writes four PNGs per direction and a gates.json the board can read', async () => {
    const i = input(full());
    await runExplorations(i, fakeStages());
    const files = readdirSync(i.outDir).sort();
    for (const id of ['standing-A', 'standing-B', 'standing-C']) {
      for (const v of EXPLORATION_VIEWPORTS) expect(files).toContain(`${id}-${v.key}.png`);
    }
    const gates = JSON.parse(readFileSync(path.join(i.outDir, 'gates.json'), 'utf8'));
    expect(gates).toMatchObject({
      date: '2026-10-13',
      run: 'eval/explorations/runs/2026-10-13',
      mode: 'full',
      pass: true,
      fixtures: { status: 'pass', detail: [] },
    });
    expect(Object.keys(gates.directions)).toEqual(['standing-A', 'standing-B', 'standing-C']);
    expect(gates.directions['standing-B']).toMatchObject({
      screen: 'standing',
      direction: 'B',
      tenant: 'accent-lilac',
      pass: true,
      screenshots: {
        '1280-light': 'standing-B-1280-light.png',
        '390-dark': 'standing-B-390-dark.png',
      },
    });
    expect(gates.directions['standing-A'].checks.map((c) => [c.name, c.status])).toEqual([
      ['layout', 'pass'],
      ['lint', 'pass'],
      ['gaps', 'pass'],
      ['pii', 'pass'],
      ['builds', 'pass'],
      ['axe', 'pass'],
    ]);
  });

  it('exits 1 on a serious or critical axe finding in either theme, but not a moderate one', async () => {
    const stages = fakeStages({
      axe: async (app, opts) =>
        opts.viewports.map((v) =>
          axeScanRow(app.id, `${v.theme}@${v.width}`, {
            violations:
              app.id === 'standing-B' && v.key === '390-dark'
                ? [{ id: 'color-contrast', impact: 'serious', nodes: [{ html: '<p>' }] }]
                : [{ id: 'region', impact: 'moderate', nodes: [{ html: '<div>' }] }],
          }),
        ),
    });
    const r = await runExplorations(input(full()), stages);
    expect(r.code).toBe(1);
    expect(find(r.report, 'standing-B', 'axe').status).toBe('fail');
    expect(find(r.report, 'standing-B', 'axe').detail.join()).toMatch(
      /dark@390: color-contrast \(serious\)/,
    );
    expect(find(r.report, 'standing-A', 'axe').status).toBe('pass');
  });

  it('applies the axe rule to C unchanged: bends excuse lint, never axe', async () => {
    const c = direction('C', {
      files: { 'src/App.tsx': HEX_APP },
      meta: { bendLog: { present: true, value: [BEND] } },
    });
    const stages = fakeStages({
      axe: async (app, opts) =>
        opts.viewports.map((v) =>
          axeScanRow(app.id, `${v.theme}@${v.width}`, {
            violations: [{ id: 'label', impact: 'critical', nodes: [{ html: '<input>' }] }],
          }),
        ),
    });
    const r = await runExplorations(input([c]), stages);
    expect(find(r.report, 'standing-C', 'lint').status).toBe('pass');
    expect(find(r.report, 'standing-C', 'axe').status).toBe('fail');
    expect(r.code).toBe(1);
  });

  it('fails a scan that errored rather than reading it as clean', async () => {
    const stages = fakeStages({
      axe: async (app, opts) =>
        opts.viewports.map((v) =>
          axeScanRow(app.id, `${v.theme}@${v.width}`, { error: new Error('page crashed') }),
        ),
    });
    const r = await runExplorations(input([direction('A')]), stages);
    expect(find(r.report, 'standing-A', 'axe').status).toBe('fail');
    expect(find(r.report, 'standing-A', 'axe').detail.join()).toMatch(
      /scan errored \(page crashed\)/,
    );
  });

  it('does not render or scan a direction that did not build, and still runs the others', async () => {
    const stages = fakeStages({
      build: async (app) =>
        app.id === 'standing-B'
          ? { typechecked: false, built: false, log: 'error TS2322' }
          : { typechecked: true, built: true, log: '' },
    });
    const i = input(full());
    const r = await runExplorations(i, stages);
    expect(r.code).toBe(1);
    expect(find(r.report, 'standing-B', 'builds').status).toBe('fail');
    expect(find(r.report, 'standing-B', 'builds').detail.join()).toMatch(/error TS2322/);
    expect(find(r.report, 'standing-B', 'axe').status).toBe('not-measured');
    expect(stages.calls.some((c) => c[0] === 'render' && c[1] === 'standing-B')).toBe(false);
    expect(stages.calls.some((c) => c[0] === 'axe' && c[1] === 'standing-B')).toBe(false);
    expect(stages.calls.some((c) => c[0] === 'render' && c[1] === 'standing-A')).toBe(true);
    expect(r.report.directions['standing-B'].screenshots).toEqual({});
    expect(readdirSync(i.outDir).some((f) => f.startsWith('standing-B-'))).toBe(false);
  });

  it('counts an app that builds but does not type-check as not building', async () => {
    const stages = fakeStages({
      build: async () => ({ typechecked: false, built: true, log: 'tsc: error' }),
    });
    const r = await runExplorations(input([direction('A')]), stages);
    expect(find(r.report, 'standing-A', 'builds').status).toBe('fail');
  });

  it('builds a direction that failed a static gate too, so its screenshots can show why', async () => {
    const stages = fakeStages();
    const r = await runExplorations(
      input([direction('A', { files: { 'src/App.tsx': HEX_APP } })]),
      stages,
    );
    expect(r.code).toBe(1);
    expect(stages.calls.some((c) => c[0] === 'build')).toBe(true);
    expect(r.report.directions['standing-A'].pass).toBe(false);
  });

  it('skips the build stages for a direction with no src/App.tsx, and fails it', async () => {
    const stages = fakeStages();
    const r = await runExplorations(input([direction('A', { files: {}, texts: {} })]), stages);
    expect(r.code).toBe(1);
    expect(stages.calls.some((c) => c[0] === 'prepare')).toBe(false);
    expect(find(r.report, 'standing-A', 'builds').status).toBe('fail');
  });

  it('warns, but still runs, when the tarball was packed from a dirty tree: nothing is recorded in a ledger', async () => {
    const lines = [];
    const stages = fakeStages({ pack: async () => ({ ...PACKED, dirty: true }) });
    const r = await runExplorations(input([direction('A')], { log: (l) => lines.push(l) }), stages);
    expect(r.code).toBe(0);
    expect(lines.join('\n')).toMatch(/warning.*uncommitted changes/i);
    expect(r.report.pack.dirty).toBe(true);
  });

  it('passes --skip-build through to the pack stage', async () => {
    const stages = fakeStages();
    await runExplorations(input([direction('A')], { skipBuild: true }), stages);
    expect(stages.calls.find((c) => c[0] === 'pack')[1]).toBe(true);
  });

  it('reads a direction from disk exactly as the in-memory one is judged', async () => {
    const runDir = makeTmp('explorations-run-');
    writeDirection(runDir, direction('B'));
    writeDirection(runDir, direction('C', { files: { 'src/App.tsx': HEX_APP } }));
    const onDisk = ['standing-B', 'standing-C'].map((id) => readDirection(runDir, id));
    const r = await runExplorations(input(onDisk), null);
    expect(r.report.directions['standing-B'].pass).toBe(true);
    expect(r.report.directions['standing-C'].pass).toBe(false);
  });
});

describe('pnpm eval:consistency -- --explorations (CLI, offline)', () => {
  const run = (args, env = {}) => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/eval-consistency.mjs'), ...args],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, ...env },
      },
    );
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const runOf = (...directions) => {
    const dir = makeTmp('explorations-cli-');
    for (const d of directions) writeDirection(dir, d);
    return dir;
  };

  it('exits 0 on a run that passes every static gate, and says what it did not measure', () => {
    const r = run([
      '--explorations',
      runOf(direction('A'), direction('B'), direction('C')),
      '--offline',
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/PASS lint standing-C: 0 violations/);
    expect(r.out).toMatch(/not measured \(offline\)/);
    expect(r.out).toMatch(/RESULT: PASS/);
  });

  it('exits 1 for a C app with an unlisted violation, naming file, line and text', () => {
    const dir = runOf(direction('C', { files: { 'src/App.tsx': HEX_APP } }));
    const r = run(['--explorations', dir, '--offline']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL lint standing-C/);
    expect(r.out).toMatch(/src\/App\.tsx:\d+ hex #7c3aed/);
  });

  it('exits 0 for the same C app with the violation listed in its bend-log.json', () => {
    const dir = runOf(
      direction('C', {
        files: { 'src/App.tsx': HEX_APP },
        meta: { bendLog: { present: true, value: [BEND] } },
      }),
    );
    const r = run(['--explorations', dir, '--offline']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/1 violation, all listed in bend-log\.json/);
  });

  it('exits 1 when A has a violation, whatever its bend log says', () => {
    const dir = runOf(direction('A', { files: { 'src/App.tsx': HEX_APP } }));
    expect(run(['--explorations', dir, '--offline']).code).toBe(1);
  });

  it('exits 1 on a real-looking phone number in a direction, and on a denylisted term from a private file', () => {
    const phone = runOf(
      direction('A', { texts: { 'src/fixture.json': '{ "phone": "(312) 867-5309" }' } }),
    );
    const r = run(['--explorations', phone, '--offline']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL pii standing-A/);

    const listFile = path.join(makeTmp(), 'denylist.txt');
    writeFileSync(listFile, 'Alder Bay Plumbing\n');
    const named = runOf(
      direction('A', { texts: { 'src/fixture.json': '{ "business": "Alder Bay Plumbing" }' } }),
    );
    expect(run(['--explorations', named, '--offline']).code).toBe(0);
    expect(run(['--explorations', named, '--offline', '--denylist', listFile]).code).toBe(1);
    expect(
      run(['--explorations', named, '--offline'], { EXPLORATIONS_PII_DENYLIST: listFile }).code,
    ).toBe(1);
  });

  it('exits 1 when a direction renders under a client tenant', () => {
    const dir = runOf(
      direction('B', {
        meta: {
          refs: {
            present: true,
            value: { tenant: 'concrete-creations', searches: [], refs: [] },
          },
        },
      }),
    );
    const r = run(['--explorations', dir, '--offline']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/not a demo tenant/);
  });

  it('lists the directions, in the order of the hds#628 table, and the folders it ignored', () => {
    const dir = runOf(direction('B', { screen: 'pitch' }), direction('A', { screen: 'standing' }));
    mkdirSync(path.join(dir, 'scratch', 'src'), { recursive: true });
    const r = run(['--explorations', dir, '--offline']);
    expect(r.out).toMatch(/directions \(2\): standing-A, pitch-B/);
    expect(r.out).toMatch(/ignored.*scratch/);
  });

  it('exits 2 on input errors: no directions, a missing directory, the wrong flag mix', () => {
    expect(run(['--explorations', makeTmp(), '--offline']).code).toBe(2);
    expect(run(['--explorations', path.join(makeTmp(), 'missing'), '--offline']).code).toBe(2);
    expect(run(['--explorations']).code).toBe(2);
    expect(run(['--explorations', makeTmp(), '--apps', makeTmp()]).code).toBe(2);
    expect(run(['--denylist', 'x.txt']).code).toBe(2);
  });

  it('never touches the consistency ledger', () => {
    const file = path.join(ROOT, 'eval/consistency/ledger.json');
    const before = readFileSync(file, 'utf8');
    run(['--explorations', runOf(direction('A')), '--offline']);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('--help documents the explorations flags', () => {
    const r = run(['--help']);
    for (const needle of ['--explorations', '--gaps', '--pii', '--denylist', 'bend-log.json']) {
      expect(r.out).toContain(needle);
    }
  });
});

describe('pnpm eval:consistency -- --gaps and --pii (CLI)', () => {
  const run = (args) => {
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
  const gap = (screen, direction, over = {}) => ({
    screen,
    direction,
    kind: 'pattern',
    id: 'activity-timeline',
    needed: 'An activity timeline',
    didInstead: 'A plain list',
    proposal: 'Add a Timeline pattern',
    evidence: 'src/App.tsx:12',
    ...over,
  });
  const runsRoot = (logs) => {
    const root = makeTmp('explorations-gaps-');
    for (const [id, content] of Object.entries(logs)) {
      mkdirSync(path.join(root, '2026-10-13', id), { recursive: true });
      writeFileSync(path.join(root, '2026-10-13', id, 'gaps.json'), JSON.stringify(content));
    }
    return root;
  };

  it('--gaps prints the ranking, most screens first, and exits 0', () => {
    const root = runsRoot({
      'pitch-A': [
        gap('pitch', 'A'),
        gap('pitch', 'A', { id: 'phone-action-bar', needed: 'A phone action bar' }),
      ],
      'leads-B': [gap('leads', 'B')],
    });
    const r = run(['--gaps', root]);
    expect(r.code).toBe(0);
    const lines = r.out.split('\n');
    const timeline = lines.findIndex((l) => /activity-timeline/.test(l));
    const bar = lines.findIndex((l) => /phone-action-bar/.test(l));
    expect(timeline).toBeGreaterThan(-1);
    expect(timeline).toBeLessThan(bar);
    expect(r.out).toMatch(/activity-timeline.*2 screens/);
  });

  it('--gaps --json prints the ranking as JSON', () => {
    const root = runsRoot({ 'pitch-A': [gap('pitch', 'A')], 'leads-B': [gap('leads', 'B')] });
    const r = run(['--gaps', root, '--json']);
    expect(r.code).toBe(0);
    const ranked = JSON.parse(r.out);
    expect(ranked[0]).toMatchObject({ key: 'activity-timeline', screenCount: 2 });
  });

  it('--gaps exits 1 on an invalid log, naming the direction and the problem', () => {
    const root = runsRoot({ 'pitch-A': [{ screen: 'pitch' }] });
    const r = run(['--gaps', root]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/pitch-A.*2026-10-13/);
    expect(r.out).toMatch(/missing kind/);
  });

  it('--gaps exits 2 when there are no gap logs to rank', () => {
    expect(run(['--gaps', makeTmp()]).code).toBe(2);
  });

  it('--pii exits 0 for fictional data and 1 for a real-looking phone number or email', () => {
    const dir = makeTmp('explorations-pii-cli-');
    writeFileSync(path.join(dir, 'ok.json'), '{ "p": "(312) 555-0142", "e": "ana@example.com" }');
    expect(run(['--pii', dir]).code).toBe(0);
    writeFileSync(path.join(dir, 'bad.json'), '{ "p": "(312) 867-5309" }');
    const r = run(['--pii', dir]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/bad\.json:1 phone/);
  });

  it('--pii takes several paths, and exits 2 for one that does not exist', () => {
    const a = makeTmp();
    const b = makeTmp();
    writeFileSync(path.join(a, 'one.json'), '{}');
    writeFileSync(path.join(b, 'two.json'), '{ "e": "person@gmail.com" }');
    expect(run(['--pii', a, b]).code).toBe(1);
    expect(run(['--pii', path.join(a, 'missing')]).code).toBe(2);
  });

  it('--pii always checks against the real tenants in tenants/', () => {
    const dir = makeTmp();
    writeFileSync(path.join(dir, 'brief.md'), 'A pitch to Concrete Creations');
    const r = run(['--pii', dir]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/denylist Concrete Creations/);
  });
});

describe('the committed dummy run, eval/explorations/fixtures/runs/2026-10-13', () => {
  const RUN = 'eval/explorations/fixtures/runs/2026-10-13';
  const run = (args) => {
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

  it('passes every static gate: A and B clean, C with its one violation listed', () => {
    const r = run(['--explorations', RUN, '--offline']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/directions \(3\): standing-A, standing-B, standing-C/);
    expect(r.out).toMatch(/PASS lint standing-A: 0 violations/);
    expect(r.out).toMatch(/PASS lint standing-B: 0 violations/);
    expect(r.out).toMatch(/PASS lint standing-C: 1 violation, all listed in bend-log\.json/);
  });

  it('fails the moment C loses the bend that lists its violation', () => {
    const copy = path.join(makeTmp('explorations-dummy-'), '2026-10-13');
    cpSync(path.join(ROOT, RUN), copy, { recursive: true });
    const log = path.join(copy, 'standing-C', 'bend-log.json');
    const bends = JSON.parse(readFileSync(log, 'utf8')).filter((b) => b.kind === 'design-rule');
    writeFileSync(log, JSON.stringify(bends));
    const r = run(['--explorations', copy, '--offline']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL lint standing-C/);
    expect(r.out).toMatch(/src\/App\.tsx:\d+ hex #7c3aed/);
  });

  it('fails when A is given the colour C is allowed', () => {
    const copy = path.join(makeTmp('explorations-dummy-'), '2026-10-13');
    cpSync(path.join(ROOT, RUN), copy, { recursive: true });
    const cApp = readFileSync(path.join(copy, 'standing-C', 'src', 'App.tsx'), 'utf8');
    writeFileSync(path.join(copy, 'standing-A', 'src', 'App.tsx'), cApp);
    const r = run(['--explorations', copy, '--offline']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL lint standing-A: 1 violation; direction A allows none/);
  });

  it('its gap logs rank: the gap all three directions hit comes first', () => {
    const r = run(['--gaps', 'eval/explorations/fixtures/runs', '--json']);
    expect(r.code).toBe(0);
    const ranked = JSON.parse(r.out);
    expect(ranked.map((g) => [g.key, g.screenCount, g.hits])).toEqual([
      ['band-section', 1, 3],
      ['supporting-accent', 1, 1],
    ]);
  });
});
