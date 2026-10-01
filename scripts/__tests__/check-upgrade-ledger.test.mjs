/**
 * scripts/check-upgrade-ledger.mjs (hds#448): every change since the last
 * release has an upgrade step, every changeset carries its upgrade note, and
 * the version bump fits what changed.
 *
 * Each case is a throwaway repo laid out like this one: a package.json whose
 * exports point at dist/types, the source those types come from, and the
 * release snapshot of that source at docs/api/releases/0.20.0.json. A case
 * then changes the tree the way a pull request would and runs the gate on it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import { collectPublicApi } from '../lib/check-public-api.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { snapshotFromSource } from '../upgrade/snapshot.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/check-upgrade-ledger.mjs');
const PACKAGE = '@hirobius/design-system';

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function write(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

const readPkg = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const editPkg = (root, change) => {
  const pkg = readPkg(root);
  change(pkg);
  write(root, 'package.json', JSON.stringify(pkg, null, 2));
};

/** A repo at its 0.20.0 release: the source, and the snapshot of it. */
function releasedRepo() {
  const root = mkdtempSync(join(tmpdir(), 'hds-upgrade-gate-'));
  temps.push(root);
  write(
    root,
    'package.json',
    JSON.stringify(
      {
        name: PACKAGE,
        version: '0.20.0',
        exports: {
          '.': { types: './dist/types/src/index.d.ts', import: './dist/hirobius-ui.js' },
          './patterns': { types: './dist/types/src/patterns.d.ts', import: './dist/patterns.js' },
          './styles.css': './dist/styles.css',
          './package.json': './package.json',
        },
        files: ['dist'],
        bin: { 'hds-tile-grid': 'codemods/tile-grid.mjs' },
        dependencies: { clsx: '^2.1.1', 'date-fns': '^4.1.0' },
        peerDependencies: { react: '^18.3.0 || ^19.0.0', zod: '^3.23.0 || ^4.0.0' },
        peerDependenciesMeta: { zod: { optional: true } },
        engines: { node: '>=20', pnpm: '>=8' },
        scripts: { test: 'vitest run' },
        devDependencies: { vitest: '^4.0.0' },
      },
      null,
      2,
    ),
  );
  write(root, 'src/index.ts', "export * from './button';\nexport * from './callout';\n");
  write(root, 'src/button.tsx', 'export function Button() { return <button />; }\n');
  write(root, 'src/callout.tsx', 'export function Callout() { return null; }\n');
  write(root, 'src/patterns.ts', 'export function Page() { return null; }\n');
  write(root, '.changeset/README.md', '# Changesets\n');
  write(root, '.changeset/config.json', '{}\n');
  write(root, 'docs/api/releases/0.20.0.json', formatJson(snapshotFromSource(root)));
  return root;
}

const removeCallout = (root) => write(root, 'src/index.ts', "export * from './button';\n");

function changeset(root, name, bump, pkg = PACKAGE) {
  write(root, `.changeset/${name}.md`, `---\n'${pkg}': ${bump}\n---\n\nSomething changed.\n`);
}

function note(root, name, body) {
  write(root, `upgrade/pending/${name}.json`, formatJson(body));
}

const calloutRemoved = {
  impact: 'breaking',
  plain: 'Callout is removed, so replace it with Alert.',
  steps: [
    {
      id: 'removed/Callout',
      kind: 'removed',
      impact: 'breaking',
      plain: 'Callout is removed, so replace it with Alert.',
      detect: { imports: [{ from: PACKAGE, names: ['Callout'] }] },
      facts: ['removed:.:Callout'],
    },
  ],
};

/** A pending note with one step for `facts`. */
function stepFor(id, impact, facts) {
  const plain = 'Check the changed package before upgrading.';
  return { impact, plain, steps: [{ id, kind: id.split('/')[0], impact, plain, facts }] };
}

const rules = (result) => result.violations.map((v) => v.rule).sort();
const messages = (result) => result.violations.map((v) => v.message).join('\n');

describe('checkUpgradeLedger: facts need steps', () => {
  it('passes a tree with no change and no changeset', () => {
    const result = checkUpgradeLedger(releasedRepo());
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails a removed export that pnpm api:update accepted under a patch changeset, naming pnpm upgrade:note', () => {
    const root = releasedRepo();
    removeCallout(root);
    // `pnpm api:update` rewrites the API baseline; the gate never reads it.
    write(root, 'docs/api/api-baseline.json', formatJson(collectPublicApi(root)));
    changeset(root, 'drop-callout', 'patch');
    const result = checkUpgradeLedger(root);
    expect(result.ok).toBe(false);
    expect(rules(result)).toEqual([
      'bump-too-small',
      'changeset-without-note',
      'fact-without-step',
    ]);
    expect(messages(result)).toContain('pnpm upgrade:note');
    expect(messages(result)).toContain('removed:.:Callout');
  });

  it('passes a removed export with a step and a minor changeset', () => {
    const root = releasedRepo();
    removeCallout(root);
    changeset(root, 'drop-callout', 'minor');
    note(root, 'drop-callout', calloutRemoved);
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('still wants a minor changeset when the removal has its step', () => {
    const root = releasedRepo();
    removeCallout(root);
    changeset(root, 'drop-callout', 'patch');
    note(root, 'drop-callout', calloutRemoved);
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(messages(result)).toMatch(/minor/);
    expect(messages(result)).toContain('.changeset/drop-callout.md');
  });

  const packageFacts = {
    'a dropped dependency': [
      (pkg) => delete pkg.dependencies['date-fns'],
      'dependency-removed:date-fns',
      'dependency/date-fns',
    ],
    'a narrowed peer': [
      (pkg) => (pkg.peerDependencies.zod = '^4.0.0'),
      'peer-changed:zod',
      'peer/zod',
    ],
    'raised engines': [
      (pkg) => (pkg.engines.node = '>=22'),
      'engines-changed:node',
      'engines/node',
    ],
    'a removed exports key': [
      (pkg) => delete pkg.exports['./styles.css'],
      'exports-key-removed:./styles.css',
      'exports/./styles.css',
    ],
    'a removed bin': [
      (pkg) => delete pkg.bin['hds-tile-grid'],
      'bin-removed:hds-tile-grid',
      'removed/hds-tile-grid',
    ],
  };
  for (const [name, [change, factId, stepId]] of Object.entries(packageFacts)) {
    it(`fails ${name} without a step, and passes it with a breaking step and a minor changeset`, () => {
      const root = releasedRepo();
      editPkg(root, change);
      changeset(root, 'change', 'minor');
      note(root, 'change', { impact: 'none' });
      const without = checkUpgradeLedger(root);
      expect(rules(without)).toContain('fact-without-step');
      expect(messages(without)).toContain(factId);

      note(root, 'change', stepFor(stepId, 'breaking', [factId]));
      expect(checkUpgradeLedger(root).violations).toEqual([]);
    });

    it(`treats ${name} as breaking: a patch changeset fails even with the step`, () => {
      const root = releasedRepo();
      editPkg(root, change);
      changeset(root, 'change', 'patch');
      note(root, 'change', stepFor(stepId, 'breaking', [factId]));
      expect(rules(checkUpgradeLedger(root))).toEqual(['bump-too-small']);
    });
  }

  it('lets a widened peer ship as a patch, with a step that says so', () => {
    const root = releasedRepo();
    editPkg(root, (pkg) => (pkg.peerDependencies.react = '^18.3.0 || ^19.0.0 || ^20.0.0'));
    changeset(root, 'react-20', 'patch');
    note(root, 'react-20', { impact: 'none' });
    expect(rules(checkUpgradeLedger(root))).toEqual(['fact-without-step']);
    note(root, 'react-20', stepFor('peer/react', 'additive', ['peer-changed:react']));
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('lets an added export ship as a patch with no step', () => {
    const root = releasedRepo();
    write(
      root,
      'src/button.tsx',
      'export function Button() { return null; }\nexport const size = 1;\n',
    );
    changeset(root, 'add-size', 'patch');
    note(root, 'add-size', { impact: 'additive', plain: 'Button exports its size.' });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('wants a minor changeset for a note that says breaking, even when no fact shows it', () => {
    const root = releasedRepo();
    changeset(root, 'select', 'patch');
    note(root, 'select', {
      impact: 'breaking',
      plain: 'Select fires onChange once per pick, so remove any dedupe you added.',
    });
    expect(rules(checkUpgradeLedger(root))).toEqual(['bump-too-small']);
  });

  it('reads package.json scripts and devDependencies as no change at all', () => {
    const root = releasedRepo();
    editPkg(root, (pkg) => {
      pkg.scripts.lint = 'eslint .';
      pkg.devDependencies.zod = '^4.4.3';
    });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });
});

describe('checkUpgradeLedger: changesets need notes', () => {
  it('fails a changeset without its sidecar, naming both files', () => {
    const root = releasedRepo();
    changeset(root, 'quiet-fox', 'patch');
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['changeset-without-note']);
    expect(messages(result)).toContain('.changeset/quiet-fox.md');
    expect(messages(result)).toContain('upgrade/pending/quiet-fox.json');
    expect(messages(result)).toContain('pnpm upgrade:note --name quiet-fox');
  });

  it('passes a sidecar that states impact none with no plain line', () => {
    const root = releasedRepo();
    changeset(root, 'quiet-fox', 'patch');
    note(root, 'quiet-fox', { impact: 'none' });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('fails a sidecar whose plain line is still the TODO upgrade:note wrote', () => {
    const root = releasedRepo();
    changeset(root, 'quiet-fox', 'patch');
    note(root, 'quiet-fox', {
      impact: 'additive',
      plain: 'TODO: one sentence a consumer can act on, ending in a full stop.',
    });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['note-invalid']);
    expect(messages(result)).toContain('upgrade/pending/quiet-fox.json');
    expect(messages(result)).toMatch(/TODO/);
  });

  it('fails a sidecar with no impact, and one that is not JSON', () => {
    const root = releasedRepo();
    changeset(root, 'a', 'patch');
    changeset(root, 'b', 'patch');
    note(root, 'a', { plain: 'Something changed.' });
    write(root, 'upgrade/pending/b.json', '{ not json');
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['note-invalid', 'note-invalid']);
    expect(messages(result)).toMatch(/a\.json: impact/);
    expect(messages(result)).toMatch(/b\.json: not JSON/);
  });

  it('fails a changeset it cannot read, and ignores one for another package', () => {
    const root = releasedRepo();
    write(root, '.changeset/broken.md', 'no front matter here\n');
    note(root, 'broken', { impact: 'none' });
    changeset(root, 'elsewhere', 'major', 'some-other-package');
    note(root, 'elsewhere', { impact: 'none' });
    expect(rules(checkUpgradeLedger(root))).toEqual(['changeset-unreadable']);
  });
});

describe('checkUpgradeLedger: no 1.0 cut', () => {
  it('fails a major changeset at 0.20.0 without upgrade/ALLOW_1_0', () => {
    const root = releasedRepo();
    changeset(root, 'one-oh', 'major');
    note(root, 'one-oh', { impact: 'none' });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['major-before-1.0']);
    expect(messages(result)).toContain('upgrade/ALLOW_1_0');
  });

  it('passes the same changeset once upgrade/ALLOW_1_0 exists', () => {
    const root = releasedRepo();
    changeset(root, 'one-oh', 'major');
    note(root, 'one-oh', { impact: 'none' });
    write(root, 'upgrade/ALLOW_1_0', '');
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });
});

describe('checkUpgradeLedger: the Version PR checks the real bump', () => {
  /** After `changeset version`: changesets consumed, package.json at `version`. */
  function versioned(version, ledgerSteps) {
    const root = releasedRepo();
    removeCallout(root);
    editPkg(root, (pkg) => (pkg.version = version));
    write(
      root,
      `upgrade/releases/${version}.json`,
      formatJson({
        version,
        date: '2026-10-02',
        bump: version === '0.21.0' ? 'minor' : version === '1.0.0' ? 'major' : 'patch',
        summary: 'Callout is removed.',
        backfilled: false,
        steps: ledgerSteps.map((step) => ({ ...step, id: `${version}/${step.id}`, source: 'x' })),
      }),
    );
    return root;
  }

  it('passes a minor release whose ledger covers the removal', () => {
    expect(checkUpgradeLedger(versioned('0.21.0', calloutRemoved.steps)).violations).toEqual([]);
  });

  it('fails a patch release that removes an export', () => {
    const result = checkUpgradeLedger(versioned('0.20.1', calloutRemoved.steps));
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(messages(result)).toMatch(/0\.20\.1 is a patch release after 0\.20\.0/);
  });

  it('fails a release whose ledger misses a fact', () => {
    expect(rules(checkUpgradeLedger(versioned('0.21.0', [])))).toEqual(['fact-without-step']);
  });

  it('fails a ledger whose bump is smaller than its breaking steps need', () => {
    const root = releasedRepo();
    write(
      root,
      'upgrade/releases/0.20.0.json',
      formatJson({
        version: '0.20.0',
        date: '2026-10-01',
        bump: 'patch',
        summary: 'Callout is removed.',
        backfilled: false,
        steps: [{ ...calloutRemoved.steps[0], id: '0.20.0/removed/Callout', source: 'x' }],
      }),
    );
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['ledger-bump-too-small']);
    expect(messages(result)).toContain('upgrade/releases/0.20.0.json');
  });

  it('fails a ledger that does not fit the schema', () => {
    const root = releasedRepo();
    write(root, 'upgrade/releases/0.20.0.json', formatJson({ version: '0.20.0' }));
    expect(rules(checkUpgradeLedger(root))).toEqual(['ledger-invalid']);
  });

  it('fails a release that cuts 1.0 without upgrade/ALLOW_1_0', () => {
    const root = versioned('1.0.0', calloutRemoved.steps);
    expect(rules(checkUpgradeLedger(root))).toEqual(['major-before-1.0']);
    write(root, 'upgrade/ALLOW_1_0', '');
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('passes a patch release that only adds', () => {
    const root = releasedRepo();
    write(
      root,
      'src/patterns.ts',
      'export function Page() { return null; }\nexport const x = 1;\n',
    );
    editPkg(root, (pkg) => (pkg.version = '0.20.1'));
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });
});

describe('checkUpgradeLedger: the release snapshot', () => {
  it('compares against the newest snapshot at or below package.json version', () => {
    const root = releasedRepo();
    const newer = { ...snapshotFromSource(root), version: '0.21.0', entries: {} };
    write(root, 'docs/api/releases/0.21.0.json', formatJson(newer));
    const older = { ...snapshotFromSource(root), version: '0.9.0', entries: {} };
    write(root, 'docs/api/releases/0.9.0.json', formatJson(older));
    const result = checkUpgradeLedger(root);
    expect(result.previous).toBe('0.20.0');
    expect(result.violations).toEqual([]);
  });

  it('fails when no snapshot is at or below package.json version', () => {
    const root = releasedRepo();
    editPkg(root, (pkg) => (pkg.version = '0.19.0'));
    expect(rules(checkUpgradeLedger(root))).toEqual(['no-release-snapshot']);
  });
});

describe('check-upgrade-ledger.mjs CLI', () => {
  const run = (args, env = {}) =>
    spawnSync(process.execPath, [CLI, ...args], {
      encoding: 'utf8',
      env: { ...process.env, FIXTURE_DIR: '', HDS_FIXTURE_MODE: '', ...env },
    });

  it('exits 0 on a clean tree and 1 on a violation, naming pnpm upgrade:note', () => {
    const root = releasedRepo();
    expect(run(['--root', root]).status).toBe(0);
    removeCallout(root);
    const failed = run(['--root', root]);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('pnpm upgrade:note');
  });

  it('--json prints the gate-output shape', () => {
    const root = releasedRepo();
    removeCallout(root);
    const res = run(['--root', root, '--json']);
    expect(res.status).toBe(1);
    const { violations, ok } = JSON.parse(res.stdout);
    expect(ok).toBe(false);
    expect(violations).toContainEqual(
      expect.objectContaining({ rule: 'fact-without-step', severity: 'error', line: null }),
    );
  });

  it('reads FIXTURE_DIR as the repo root in fixture mode (fixtures/check-upgrade-ledger)', () => {
    const dir = join(REPO, 'fixtures/check-upgrade-ledger');
    const env = (name) => ({ FIXTURE_DIR: join(dir, name), HDS_FIXTURE_MODE: '1' });
    expect(run(['--fixture-mode'], env('violating.example.d')).status).toBe(1);
    expect(run(['--fixture-mode'], env('passing.example.d')).status).toBe(0);
  });

  it('passes on this repository, with no network and no build', () => {
    const res = run([]);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  it('runs in pretest, so pnpm test fails a change without its step', () => {
    const pkg = readPkg(REPO);
    expect(pkg.scripts.pretest).toContain('node scripts/check-upgrade-ledger.mjs');
  });
});
