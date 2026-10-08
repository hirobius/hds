/**
 * End-to-end fixtures for the upgrade command, codemods/upgrade.mjs (hds#452):
 * `npx @hirobius/design-system@latest upgrade`. Each fixture is a tmp project
 * built at run time; the command runs as a child, the way npx runs the bin.
 * The steps come from this checkout's upgrade/ record, the copy the command
 * ships with, and the target is pinned with --to so the assertions hold
 * after later releases add ledgers.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PKG,
  REPO,
  UPGRADE,
  git,
  makeProject,
  npmLock,
  pkgJson,
  pnpmLock,
  runCli,
  snapshotTree,
  writeFiles,
} from './helpers/upgrade-fixtures.mjs';
import { UpgradeReport } from '../upgrade/schema.mjs';

const TO = '0.21.0';
const QUIET = ['--no-install', '--no-typecheck'];

const run = (root, ...args) => runCli(['upgrade', '--root', root, '--to', TO, ...QUIET, ...args]);
const json = (root, ...args) => {
  const res = run(root, '--json', ...args);
  const report = JSON.parse(res.stdout);
  return { ...res, report };
};
const ids = (list) => list.map((item) => item.id);
const blocking = (report) => report.doByHand.filter((item) => item.blocking);

/** app-pnpm: a pnpm app on 0.16.0 that imports old names, StatusDot and tokens.css. */
const APP_PNPM = () =>
  makeProject({
    'package.json': pkgJson('app-pnpm', { [PKG]: '^0.16.0', react: '^18.3.1' }),
    'pnpm-lock.yaml': pnpmLock({ '.': '0.16.0' }),
    'src/main.tsx': `import '${PKG}/tokens.css';\nimport { App } from './App';\nexport default App;\n`,
    'src/App.tsx': [
      `import { Badge, HdsCheckbox, CodeBlock, NotFoundPattern, StatusDot, Surface, Dialog } from '${PKG}';`,
      '',
      'export function App() {',
      '  return (',
      '    <Surface>',
      '      <Badge>New</Badge>',
      '      <HdsCheckbox checked />',
      '      <CodeBlock code="pnpm dev" />',
      '      <StatusDot tone="success" label="Live" />',
      '      <Dialog open={false} />',
      '      <NotFoundPattern />',
      '    </Surface>',
      '  );',
      '}',
      '',
    ].join('\n'),
  });

describe('app-pnpm fixture (lockfile at 0.16.0)', () => {
  it('makes the codemod edits, bumps the range and lists what is left', () => {
    const root = APP_PNPM();
    const { code, report } = json(root);
    expect(code).toBe(1);
    expect(report.importers).toEqual([
      { dir: '.', from: '0.16.0', source: 'lockfile', range: '^0.16.0', newRange: `^${TO}` },
    ]);

    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
    expect(app).toContain('Checkbox as HdsCheckbox');
    expect(app).toMatch(/import \{[^}]*CodeBlock[^}]*\} from '@hirobius\/design-system\/patterns'/);
    expect(app).toContain('<ErrorPattern displayText="404" message="Page not found" />');
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies[PKG]).toBe(
      `^${TO}`,
    );

    expect(ids(report.fixedForYou)).toEqual(
      expect.arrayContaining([
        'range',
        '0.20.0/moved/CodeBlock',
        '0.20.0/renamed/HdsCheckbox',
        '0.20.0/folded/NotFoundPattern',
      ]),
    );
    expect(ids(report.looksDifferent)).toEqual(
      expect.arrayContaining([
        '0.17.0/look/Badge-CommandPalette-SegmentedControl-text',
        '0.19.0/look/container-radius',
        '0.21.0/look/Dialog-margin',
        '0.21.0/look/Card-Surface-StatusTile-height',
      ]),
    );
    // Only what the code uses: no Calendar, no Input prefix.
    expect(ids(report.looksDifferent)).not.toContain('0.17.0/look/Calendar-outside-days');
    expect(ids(report.looksDifferent)).not.toContain('0.20.0/look/Input-prefix-slot');
    expect(ids(blocking(report))).toEqual(['0.21.0/removed/StatusDot', '0.21.0/manual/fonts-css']);
    expect(report.doByHand[0].plain).toContain('Badge dot');
    // Behavior changes the code meets are listed to check, after the blocking items.
    expect(ids(report.doByHand)).toContain('0.21.0/behavior/one-tab-stop');
    expect(report.doByHand.find((i) => i.id === '0.21.0/behavior/one-tab-stop').blocking).toBe(
      false,
    );
    expect(report.doByHand[0].files).toEqual(['src/App.tsx']);
    expect(report.changedFiles.sort()).toEqual(['package.json', 'src/App.tsx']);
    expect(UpgradeReport.safeParse(report).success).toBe(true);
  });

  it('prints the four sections and never says done while work is left', () => {
    const root = APP_PNPM();
    const { code, stdout } = run(root);
    expect(code).toBe(1);
    for (const heading of ['Fixed for you', 'Looks different', 'Do by hand']) {
      expect(stdout).toContain(heading);
    }
    expect(stdout).toContain('StatusDot');
    expect(stdout).not.toMatch(/^Done/m);
  });

  it('changes nothing on a second run, and --check then exits 1 until the hand edits are made', () => {
    const root = APP_PNPM();
    expect(run(root).code).toBe(1);
    const after = snapshotTree(root);
    const second = json(root);
    expect(second.code).toBe(1);
    expect(snapshotTree(root)).toEqual(after);
    expect(second.report.changedFiles).toEqual([]);
    expect(ids(second.report.fixedForYou)).toEqual([]);
    expect(run(root, '--check').code).toBe(1);

    // Make the two hand edits; the command now reports done.
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
      .replace('StatusDot, ', '')
      .replace(
        '<StatusDot tone="success" label="Live" />',
        '<Badge dot tone="success" label="Live" />',
      );
    writeFileSync(join(root, 'src/App.tsx'), app);
    writeFiles(root, {
      'src/main.tsx': `import '${PKG}/tokens.css';\nimport '${PKG}/fonts.css';\nimport { App } from './App';\nexport default App;\n`,
    });
    const clean = json(root, '--check');
    expect(blocking(clean.report)).toEqual([]);
    expect(clean.code).toBe(0);
    const done = run(root);
    expect(done.code).toBe(0);
    expect(done.stdout).toMatch(/^Done/m);
  });

  it('--dry-run and --check change no file and report the same lists', () => {
    const root = APP_PNPM();
    const before = snapshotTree(root);
    const dry = json(root, '--dry-run');
    const check = json(root, '--check');
    expect(snapshotTree(root)).toEqual(before);
    expect(dry.code).toBe(1);
    expect(check.code).toBe(1);
    expect(ids(dry.report.fixedForYou)).toEqual(ids(check.report.fixedForYou));
    expect(ids(check.report.fixedForYou)).toContain('0.20.0/renamed/HdsCheckbox');
    expect(ids(check.report.doByHand)).toEqual(ids(dry.report.doByHand));
    expect(check.report.changedFiles).toEqual([]);
  });

  it('--report writes the same JSON to a file', () => {
    const root = APP_PNPM();
    const out = join(makeProject({}), 'report.json');
    const res = run(root, '--check', '--report', out);
    expect(res.code).toBe(1);
    const report = JSON.parse(readFileSync(out, 'utf8'));
    expect(UpgradeReport.safeParse(report).success).toBe(true);
    expect(report.mode).toBe('check');
  });
});

describe('site-npm fixture (npm, CSS only)', () => {
  it('reports only CSS items', () => {
    const root = makeProject({
      'package.json': pkgJson('site-npm', { [PKG]: '^0.16.0' }),
      'package-lock.json': npmLock('0.16.0'),
      'src/styles.css': [
        `@import '${PKG}/tokens.css';`,
        '.hero { padding: var(--semantic-space-layout-normal); font-size: var(--primitive-typography-size-xl); }',
        '',
      ].join('\n'),
      'index.html': '<main class="hds-card"><h1>Site</h1></main>\n',
    });
    const { code, report } = json(root);
    expect(code).toBe(1);
    expect(report.packageManager).toBe('npm');
    expect(report.importers[0]).toMatchObject({ from: '0.16.0', source: 'lockfile' });
    const items = [...report.looksDifferent, ...report.comingNext, ...report.doByHand];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.files.length, item.id).toBeGreaterThan(0);
      for (const file of item.files) expect(file, item.id).toMatch(/\.(css|html)$/);
    }
    expect(ids(report.comingNext)).toContain('0.17.0/deprecated/semantic.space.layout.normal');
    expect(ids(report.looksDifferent)).toContain('0.19.0/look/container-radius');
    expect(ids(blocking(report))).toEqual(['0.21.0/manual/fonts-css']);
    expect(ids(report.fixedForYou)).toEqual(['range']);
  });
});

describe('installed version from each lockfile format', () => {
  const versionOf = (files) => json(makeProject(files), '--check').report.importers;
  const pkg = (range) => pkgJson('fixture', { [PKG]: range });

  it.each([
    ['pnpm v9', { 'pnpm-lock.yaml': pnpmLock({ '.': '0.18.0' }) }, '0.18.0'],
    [
      'pnpm v6',
      {
        'pnpm-lock.yaml': `lockfileVersion: '6.0'\n\ndependencies:\n  '${PKG}':\n    specifier: ^0.17.0\n    version: 0.17.0(react@18.2.0)\n\npackages:\n\n  /${PKG}@0.17.0(react@18.2.0):\n    resolution: {integrity: sha512-x}\n`,
      },
      '0.17.0',
    ],
    ['package-lock v3', { 'package-lock.json': npmLock('0.19.1') }, '0.19.1'],
    [
      'package-lock v2',
      { 'package-lock.json': { ...npmLock('0.19.0'), lockfileVersion: 2 } },
      '0.19.0',
    ],
    ['npm-shrinkwrap', { 'npm-shrinkwrap.json': npmLock('0.20.0') }, '0.20.0'],
    [
      'yarn v1',
      {
        'yarn.lock': `# yarn lockfile v1\n\n\n"${PKG}@^0.17.0":\n  version "0.17.0"\n  resolved "https://registry.yarnpkg.com/x.tgz"\n`,
        'package.json': pkg('^0.17.0'),
      },
      '0.17.0',
    ],
    [
      'yarn berry',
      {
        'yarn.lock': `__metadata:\n  version: 8\n\n"${PKG}@npm:^0.18.0":\n  version: 0.18.0\n  resolution: "${PKG}@npm:0.18.0"\n\n"fixture@workspace:.":\n  version: 0.0.0-use.local\n  resolution: "fixture@workspace:."\n  dependencies:\n    "${PKG}": "npm:^0.18.0"\n`,
      },
      '0.18.0',
    ],
    [
      'bun.lock',
      {
        'bun.lock': `{\n  "lockfileVersion": 1,\n  "workspaces": {\n    "": {\n      "name": "fixture",\n      "dependencies": {\n        "${PKG}": "^0.19.0",\n      },\n    },\n  },\n  "packages": {\n    "${PKG}": ["${PKG}@0.19.1", "", {}, "sha512-x"],\n  }\n}\n`,
      },
      '0.19.1',
    ],
  ])('%s', (_name, files, version) => {
    const importers = versionOf({ 'package.json': pkg('^0.16.0'), ...files });
    expect(importers).toEqual([
      expect.objectContaining({ dir: '.', from: version, source: 'lockfile' }),
    ]);
  });

  it('falls back to node_modules, then to --from', () => {
    const nm = versionOf({
      'package.json': pkg('^0.16.0'),
      [`node_modules/${PKG}/package.json`]: { name: PKG, version: '0.19.0' },
    });
    expect(nm[0]).toMatchObject({ from: '0.19.0', source: 'node_modules' });
    const flag = json(
      makeProject({ 'package.json': pkg('^0.16.0') }),
      '--check',
      '--from',
      '0.20.0',
    );
    expect(flag.report.importers[0]).toMatchObject({ from: '0.20.0', source: 'flag' });
  });

  it('refuses when nothing says which version is installed', () => {
    const res = run(makeProject({ 'package.json': pkg('^0.16.0') }), '--check');
    expect(res.code).toBe(2);
    expect(res.stderr).toContain('--from');
  });
});

describe('refusals change nothing', () => {
  const floorMessage =
    'Installed 0.9.0 is older than the oldest release this tool can upgrade from (0.16.0). Follow MIGRATIONS.md by hand up to 0.16.0, or ask in hirobius/hds.';

  it('below the floor: exit 2, the exact floor message, no file changed, never done', () => {
    const root = makeProject({
      'package.json': pkgJson('old-app', { [PKG]: '^0.9.0' }),
      'src/a.tsx': `import { HdsCheckbox } from '${PKG}';\n`,
    });
    const before = snapshotTree(root);
    const res = run(root, '--from', '0.9.0');
    expect(res.code).toBe(2);
    expect(res.stdout + res.stderr).toContain(floorMessage);
    expect(res.stdout + res.stderr).not.toMatch(/^Done/m);
    expect(snapshotTree(root)).toEqual(before);
    const asJson = json(root, '--from', '0.9.0');
    expect(asJson.code).toBe(2);
    expect(asJson.report.refused).toBe(floorMessage);
    expect(UpgradeReport.safeParse(asJson.report).success).toBe(true);
  });

  it('a downgrade: exit 2, no file changed', () => {
    const root = makeProject({
      'package.json': pkgJson('new-app', { [PKG]: '^0.21.0' }),
      'package-lock.json': npmLock('0.21.0'),
    });
    const before = snapshotTree(root);
    const res = runCli(['upgrade', '--root', root, '--to', '0.19.0', ...QUIET]);
    expect(res.code).toBe(2);
    expect(res.stderr).toMatch(/downgrade/i);
    expect(snapshotTree(root)).toEqual(before);
  });

  it('a target with no ledger: exit 2', () => {
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: '^0.16.0' }),
      'package-lock.json': npmLock('0.16.0'),
    });
    const res = runCli(['upgrade', '--root', root, '--to', '9.9.9', ...QUIET]);
    expect(res.code).toBe(2);
    expect(res.stderr).toContain('9.9.9');
  });

  it('an unknown flag: exit 2', () => {
    expect(runCli(['upgrade', '--nope']).code).toBe(2);
  });
});

describe('already bumped by hand', () => {
  const bumped = () =>
    makeProject({
      'package.json': pkgJson('app-pnpm', { [PKG]: `^${TO}` }),
      'pnpm-lock.yaml': pnpmLock({ '.': TO }),
      'src/App.tsx': `import { StatusDot, Badge } from '${PKG}';\nexport const a = <StatusDot />;\n`,
    });

  it('recovers the old version from the lockfile at git HEAD', () => {
    const root = bumped();
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: '^0.16.0' }),
      'pnpm-lock.yaml': pnpmLock({ '.': '0.16.0' }),
    });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'on 0.16.0');
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: `^${TO}` }),
      'pnpm-lock.yaml': pnpmLock({ '.': TO }),
    });
    const { code, report } = json(root);
    expect(report.importers[0]).toMatchObject({ from: '0.16.0', source: 'git-head' });
    expect(ids(report.doByHand)).toContain('0.21.0/removed/StatusDot');
    expect(ids(report.fixedForYou)).toEqual([]);
    expect(code).toBe(1);
  });

  it('recovers it at the merge-base with the default branch when the bump is committed', () => {
    const root = bumped();
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: '^0.16.0' }),
      'pnpm-lock.yaml': pnpmLock({ '.': '0.16.0' }),
    });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'on 0.16.0');
    git(root, 'checkout', '-qb', 'bump');
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: `^${TO}` }),
      'pnpm-lock.yaml': pnpmLock({ '.': TO }),
    });
    git(root, 'commit', '-qam', `to ${TO}`);
    const { report } = json(root);
    expect(report.importers[0]).toMatchObject({ from: '0.16.0', source: 'git-merge-base' });
    expect(ids(report.doByHand)).toContain('0.21.0/removed/StatusDot');
    expect(ids(report.looksDifferent)).toContain(
      '0.17.0/look/Badge-CommandPalette-SegmentedControl-text',
    );
  });

  it('says so when there is no history, and treats it as already on the target', () => {
    const { code, report } = json(bumped());
    expect(report.importers[0]).toMatchObject({ from: TO, source: 'lockfile' });
    const note = report.doByHand.find((i) => i.id === 'tool/no-history');
    expect(note.plain).toContain('the lockfile');
    expect(note.plain).toContain(`--from ${TO}`);
    expect(code).toBe(1);
    // --from <target> confirms a clean project is done.
    const confirmed = run(bumped(), '--check', '--from', TO);
    expect(confirmed.code).toBe(0); // --from <target>: the person says it is done
    const clean = makeProject({
      'package.json': pkgJson('app-pnpm', { [PKG]: `^${TO}` }),
      'pnpm-lock.yaml': pnpmLock({ '.': TO }),
    });
    expect(run(clean, '--check').code).toBe(1);
    expect(run(clean, '--check', '--from', TO).code).toBe(0);
  });

  it('names node_modules, not the lockfile, when that is where the version came from', () => {
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: `^${TO}` }),
      [`node_modules/${PKG}/package.json`]: { name: PKG, version: TO },
    });
    const note = json(root, '--check').report.doByHand.find((i) => i.id === 'tool/no-history');
    expect(note.plain).toContain('node_modules');
    expect(note.plain).not.toContain('lockfile');
  });

  it('recovers it from the lockfile history when the bump is committed on the default branch', () => {
    const root = bumped();
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: '^0.16.0' }),
      'pnpm-lock.yaml': pnpmLock({ '.': '0.16.0' }),
    });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'on 0.16.0');
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: `^${TO}` }),
      'pnpm-lock.yaml': pnpmLock({ '.': TO }),
    });
    git(root, 'commit', '-qam', `to ${TO}`);
    writeFiles(root, { 'notes.txt': 'later\n' });
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'later');
    const { code, report } = json(root);
    expect(report.importers[0]).toMatchObject({ from: '0.16.0', source: 'git-log' });
    expect(ids(report.doByHand)).toContain('0.21.0/removed/StatusDot');
    expect(code).toBe(1);
    expect(UpgradeReport.safeParse(report).success).toBe(true);
  });

  it('adds the no-history note when every committed lockfile is already at the target', () => {
    const root = bumped();
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', `on ${TO}`);
    const { report } = json(root, '--check');
    expect(report.importers[0]).toMatchObject({ from: TO, source: 'lockfile' });
    expect(ids(report.doByHand)).toContain('tool/no-history');
  });

  it('reads a lockfile over 1 MiB from git history', () => {
    const big = (version) =>
      pnpmLock({ '.': version }) +
      Array.from(
        { length: 20_000 },
        (_, n) => `  'pad-${n}@1.0.0':\n    resolution: {integrity: sha512-${'x'.repeat(60)}}\n\n`,
      ).join('');
    expect(big('0.16.0').length).toBeGreaterThan(1024 * 1024);
    const root = bumped();
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: '^0.16.0' }),
      'pnpm-lock.yaml': big('0.16.0'),
    });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'on 0.16.0');
    writeFiles(root, {
      'package.json': pkgJson('app-pnpm', { [PKG]: `^${TO}` }),
      'pnpm-lock.yaml': big(TO),
    });
    const { code, report } = json(root, '--check');
    expect(report.importers[0]).toMatchObject({ from: '0.16.0', source: 'git-head' });
    expect(ids(report.doByHand)).toContain('0.21.0/removed/StatusDot');
    expect(code).toBe(1);
  });
});

describe('workspaces', () => {
  const workspace = () =>
    makeProject({
      'package.json': { name: 'mono', private: true },
      'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n",
      'pnpm-lock.yaml': pnpmLock({ 'apps/admin': '0.16.0', 'apps/web': '0.20.0' }),
      'apps/admin/package.json': pkgJson('admin', { [PKG]: '^0.16.0' }),
      'apps/admin/src/a.tsx': `import { HdsCheckbox } from '${PKG}';\nexport const a = <HdsCheckbox />;\n`,
      'apps/web/package.json': pkgJson('web', { [PKG]: '~0.20.0' }),
      'apps/web/src/w.tsx': `import { Alert } from '${PKG}';\nexport const w = <Alert />;\n`,
      'apps/docs/package.json': pkgJson('docs', { clsx: '^2.1.1' }),
    });

  it('upgrades every importer from its own version and reports the split', () => {
    const root = workspace();
    const { report, stdout } = (() => {
      const r = json(root);
      return { ...r, stdout: run(root, '--check').stdout };
    })();
    expect(report.importers).toEqual([
      {
        dir: 'apps/admin',
        from: '0.16.0',
        source: 'lockfile',
        range: '^0.16.0',
        newRange: `^${TO}`,
      },
      { dir: 'apps/web', from: '0.20.0', source: 'lockfile', range: '~0.20.0', newRange: `~${TO}` },
    ]);
    expect(report.split).toBe(true);
    expect(stdout).toMatch(/apps\/admin.*0\.16\.0/);
    expect(stdout).toMatch(/apps\/web.*0\.20\.0/);
    expect(readFileSync(join(root, 'apps/admin/src/a.tsx'), 'utf8')).toContain(
      'Checkbox as HdsCheckbox',
    );
    expect(
      JSON.parse(readFileSync(join(root, 'apps/web/package.json'), 'utf8')).dependencies[PKG],
    ).toBe(`~${TO}`);
    // web was already past 0.20.0, so its 0.17-0.20 items are not listed for it.
    const alertRole = report.doByHand.find((i) => i.id === '0.21.0/behavior/Alert-role');
    expect(alertRole.importers).toEqual(['apps/web']);
    const hdsRename = report.fixedForYou.find((i) => i.id === '0.20.0/renamed/HdsCheckbox');
    expect(hdsRename.importers).toEqual(['apps/admin']);
    // Two copies only because the importers differ: the upgrade itself ends it.
    expect(ids(report.doByHand)).not.toContain('tool/two-copies');
    expect(existsSync(join(root, 'apps/docs/src'))).toBe(false);
  });

  it('enumerates npm workspaces from package.json', () => {
    const root = makeProject({
      'package.json': { name: 'mono', private: true, workspaces: ['packages/*'] },
      'packages/ui/package.json': pkgJson('ui', { [PKG]: '^0.19.0' }),
      [`node_modules/${PKG}/package.json`]: { name: PKG, version: '0.19.0' },
    });
    const { report } = json(root, '--check');
    expect(report.importers).toEqual([
      expect.objectContaining({ dir: 'packages/ui', from: '0.19.0', source: 'node_modules' }),
    ]);
  });
});

describe('two copies of HDS', () => {
  it('a lockfile that also resolves a copy something else pulls in yields the duplicate-copy item', () => {
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: '^0.20.0' }),
      'pnpm-lock.yaml': pnpmLock({ '.': '0.20.0' }, ['0.16.0']),
    });
    const { report, code } = json(root, '--check');
    const item = report.doByHand.find((i) => i.id === 'tool/two-copies');
    expect(item).toBeDefined();
    expect(item.plain).toContain('0.16.0');
    expect(code).toBe(1);
  });
});

describe('dropped dependencies', () => {
  it('re-adds a dependency HDS stopped installing when the code still imports it', () => {
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: '^0.19.1' }),
      'package-lock.json': npmLock('0.19.1'),
      'src/a.tsx': "import * as AR from '@radix-ui/react-aspect-ratio';\nexport default AR;\n",
    });
    const { report } = json(root);
    const deps = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies;
    expect(deps['@radix-ui/react-aspect-ratio']).toBe('^1.1.11');
    expect(ids(report.fixedForYou)).toContain('0.20.0/dependency/@radix-ui/react-aspect-ratio');
    expect(ids(report.doByHand)).not.toContain('0.20.0/dependency/@radix-ui/react-aspect-ratio');
    // Second run: already declared, nothing to add.
    expect(ids(json(root).report.fixedForYou)).not.toContain(
      '0.20.0/dependency/@radix-ui/react-aspect-ratio',
    );
  });
});

describe('install and typecheck', () => {
  it("runs the consumer's typecheck script and reports a failure as Do by hand", () => {
    const root = makeProject({
      'package.json': pkgJson(
        'app',
        { [PKG]: `^${TO}` },
        { scripts: { typecheck: 'node -e "console.error(\'TS2305 nope\');process.exit(1)"' } },
      ),
      'package-lock.json': npmLock('0.20.0'),
    });
    const res = runCli(['upgrade', '--root', root, '--to', TO, '--no-install', '--json']);
    const report = JSON.parse(res.stdout);
    const item = report.doByHand.find((i) => i.id === 'tool/typecheck');
    expect(item).toBeDefined();
    expect(item.plain).toContain('TS2305');
    expect(res.code).toBe(1);
  });
});

describe('robustness', () => {
  it('walks past a dangling symlink: the codemods run and the range moves', () => {
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: '^0.16.0' }),
      'package-lock.json': npmLock('0.16.0'),
      'src/a.tsx': `import { CodeBlock, HdsCheckbox } from '${PKG}';\nexport const a = <><CodeBlock code="x" /><HdsCheckbox /></>;\n`,
    });
    symlinkSync(join(root, 'src/missing.tsx'), join(root, 'src/z.tsx'));
    const { code, report } = json(root);
    expect(code).toBe(0);
    expect(readFileSync(join(root, 'src/a.tsx'), 'utf8')).toContain('Checkbox as HdsCheckbox');
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies[PKG]).toBe(
      `^${TO}`,
    );
    expect(ids(report.fixedForYou)).toContain('range');
  });

  it.each([
    ['4-space indent', (t) => t.replace(/^( +)/gm, '$1$1')],
    ['tab indent', (t) => t.replace(/^( +)/gm, (m) => '\t'.repeat(m.length / 2))],
    ['CRLF line endings', (t) => t.replace(/\n/g, '\r\n')],
    ['no final newline', (t) => t.replace(/\n$/, '')],
  ])('keeps the package.json format: %s', (_name, format) => {
    const original = format(`${JSON.stringify(pkgJson('app', { [PKG]: '^0.20.0' }), null, 2)}\n`);
    const root = makeProject({
      'package.json': original,
      'package-lock.json': npmLock('0.20.0'),
    });
    expect(run(root).code).not.toBe(2);
    const text = readFileSync(join(root, 'package.json'), 'utf8');
    expect(text).toBe(original.replace('^0.20.0', `^${TO}`));
  });

  it('--report into a missing directory: exit 2 before anything is written', () => {
    const root = APP_PNPM();
    const before = snapshotTree(root);
    const res = run(root, '--report', join(root, 'no/such/dir/r.json'));
    expect(res.code).toBe(2);
    expect(res.stderr).toContain('--report');
    expect(snapshotTree(root)).toEqual(before);
  });

  it('runs tsc through node, so a space in the project path is fine', () => {
    const root = join(makeProject({}), 'sp ace & co');
    writeFiles(root, {
      'package.json': pkgJson('app', { [PKG]: `^${TO}` }),
      'package-lock.json': npmLock(TO),
      'tsconfig.json': '{}\n',
      'node_modules/typescript/package.json': { name: 'typescript', version: '5.0.0' },
      'node_modules/typescript/bin/tsc':
        "#!/usr/bin/env node\nconsole.error('TS9999 fake tsc ran with ' + process.argv.slice(2).join(' '));\nprocess.exit(1);\n",
    });
    const res = runCli([
      'upgrade',
      '--root',
      root,
      '--to',
      TO,
      '--from',
      TO,
      '--no-install',
      '--json',
    ]);
    const item = JSON.parse(res.stdout).doByHand.find((i) => i.id === 'tool/typecheck');
    expect(item?.plain).toContain('TS9999 fake tsc ran with --noEmit');
  });
});

describe('a breaking change the code cannot show was handled', () => {
  // A record of its own (the next release's shape): a breaking value change with
  // no `done` detector, whose fix leaves the matched import in place.
  const pkgDir = () =>
    makeProject({
      'package.json': { name: PKG, version: '9.1.0' },
      'upgrade/index.json': {
        package: PKG,
        latest: '9.1.0',
        floor: '9.0.0',
        versions: [
          { version: '9.1.0', date: '2026-10-08', bump: 'minor', breaking: 1, summary: 'x' },
        ],
        deprecated: [],
      },
      'upgrade/releases/9.1.0.json': {
        version: '9.1.0',
        previous: '9.0.0',
        date: '2026-10-08',
        bump: 'minor',
        summary: 'x',
        steps: [
          {
            id: '9.1.0/value-changed/tokens-json',
            kind: 'value-changed',
            impact: 'breaking',
            plain: 'The raw tokens JSON changed shape, so read the new paths.',
            source: 'x',
            detect: { imports: [{ from: PKG, names: ['tokens'] }] },
          },
        ],
      },
    });

  it('is listed to check and does not keep --check at exit 1', async () => {
    const { upgrade } = await import('../../codemods/upgrade.mjs');
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: '^9.1.0' }),
      'package-lock.json': npmLock('9.1.0'),
      'src/a.ts': `import { tokens } from '${PKG}';\nexport const t = tokens.semantic.motion.fast.$value.timingFunction;\n`,
    });
    const report = await upgrade(
      {
        root,
        from: '9.0.0',
        to: null,
        mode: 'check',
        json: true,
        report: null,
        install: false,
        typecheck: false,
      },
      { pkgDir: pkgDir() },
    );
    const item = report.doByHand.find((i) => i.id === '9.1.0/value-changed/tokens-json');
    expect(item).toMatchObject({ blocking: false, files: ['src/a.ts'] });
    expect(report.exitCode).toBe(0);
  });
});

describe('the bins', () => {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

  it('design-system and hds-upgrade both run codemods/upgrade.mjs', () => {
    expect(pkg.bin['design-system']).toBe('codemods/upgrade.mjs');
    expect(pkg.bin['hds-upgrade']).toBe('codemods/upgrade.mjs');
    expect(readFileSync(UPGRADE, 'utf8').startsWith('#!/usr/bin/env node\n')).toBe(true);
  });

  it('codemods/upgrade.mjs holds no hard-coded version string', () => {
    const source = readFileSync(UPGRADE, 'utf8');
    expect(source.match(/\b\d+\.\d+\.\d+\b/g)).toBeNull();
  });

  it('--help exits 0 and names every flag', () => {
    const res = runCli(['upgrade', '--help']);
    expect(res.code).toBe(0);
    for (const flag of [
      '--root',
      '--from',
      '--to',
      '--dry-run',
      '--check',
      '--json',
      '--report',
      '--no-install',
      '--no-typecheck',
    ]) {
      expect(res.stdout).toContain(flag);
    }
  });
});
