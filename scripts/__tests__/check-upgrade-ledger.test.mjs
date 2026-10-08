/**
 * scripts/check-upgrade-ledger.mjs (hds#448): every change since the last
 * release has an upgrade step, every changeset carries its upgrade note, and
 * the version bump fits what changed.
 *
 * Each case is a throwaway repo at its 0.20.0 release (helpers/upgrade-repo.mjs)
 * that a case changes the way a pull request would, then runs the gate on.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import { collectPublicApi } from '../lib/check-public-api.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { snapshotFromSource, snapshotPackage } from '../upgrade/snapshot.mjs';
import {
  PACKAGE,
  changeset,
  cleanUpRepos,
  editPkg,
  note,
  readPkg,
  recordRelease,
  releasedRepo,
  removeCallout,
  write,
} from './helpers/upgrade-repo.mjs';

// Fixture changesets live in temp repos; the path is built from a constant so
// tests/removed-0.20-release-notes.test.ts (no test names a real changeset) holds.
const CHANGESETS = '.changeset';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/check-upgrade-ledger.mjs');

afterEach(cleanUpRepos);

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
    expect(messages(result)).toContain(`${CHANGESETS}/drop-callout.md`);
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

  it('wants a minor changeset for a step that removes what the diff cannot see, such as a CSS variable', () => {
    const root = releasedRepo();
    changeset(root, 'eyebrow', 'patch');
    const plain = 'Set text-transform: uppercase yourself where an eyebrow must stay uppercase.';
    note(root, 'eyebrow', {
      impact: 'look',
      plain,
      steps: [
        {
          id: 'removed/--semantic-typography-eyebrow-text-transform',
          kind: 'removed',
          impact: 'look',
          plain,
          detect: { cssVars: ['--semantic-typography-eyebrow-text-transform'] },
        },
      ],
    });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(messages(result)).toContain('removed/--semantic-typography-eyebrow-text-transform');
    changeset(root, 'eyebrow', 'minor');
    expect(checkUpgradeLedger(root).violations).toEqual([]);
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
    expect(messages(result)).toContain(`${CHANGESETS}/quiet-fox.md`);
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
    write(root, `${CHANGESETS}/broken.md`, 'no front matter here\n');
    note(root, 'broken', { impact: 'none' });
    changeset(root, 'elsewhere', 'major', 'some-other-package');
    note(root, 'elsewhere', { impact: 'none' });
    expect(rules(checkUpgradeLedger(root))).toEqual(['changeset-unreadable']);
  });
});

// What `pnpm changeset:version` (scripts/upgrade/compile.mjs --release) would
// refuse or lose, the gate refuses first, so the Version PR never stops on it.
describe('checkUpgradeLedger: notes the release could not record', () => {
  it('fails a note step listing a fact the diff no longer has, such as a reverted removal, naming the note and the fact', () => {
    const root = releasedRepo();
    // Callout is still exported: the removal was reverted, its note left behind.
    changeset(root, 'drop-callout', 'minor');
    note(root, 'drop-callout', calloutRemoved);
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['step-fact-unknown']);
    expect(result.violations[0].file).toBe('upgrade/pending/drop-callout.json');
    expect(messages(result)).toContain('removed/Callout lists removed:.:Callout');
    expect(messages(result)).toContain('pnpm upgrade:note');
  });

  it('fails a note with no changeset of the same name, naming both', () => {
    const root = releasedRepo();
    note(root, 'orphan', { impact: 'none' });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['note-without-changeset']);
    expect(result.violations[0].file).toBe('upgrade/pending/orphan.json');
    expect(messages(result)).toContain(`${CHANGESETS}/orphan.md`);
    expect(messages(result)).toContain('pnpm upgrade:note');
  });

  it('fails an upgrade/pending/summary.txt that is not one line of at most 140 characters', () => {
    const root = releasedRepo();
    write(root, 'upgrade/pending/summary.txt', 'One line.\n');
    expect(checkUpgradeLedger(root).violations).toEqual([]);
    write(root, 'upgrade/pending/summary.txt', `${'x'.repeat(141)}\n`);
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['summary-invalid']);
    expect(messages(result)).toContain('upgrade/pending/summary.txt is 141 characters long');
  });

  it('passes a note whose changeset is pending beside it', () => {
    const root = releasedRepo();
    changeset(root, 'quiet', 'patch');
    note(root, 'quiet', { impact: 'none' });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
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

  // hds#451: compile.mjs --release writes the new version's snapshot on the
  // Version PR, so that PR no longer looks like one (package.json is not past
  // the newest snapshot). The ledger it recorded still says major.
  it('fails a recorded release that cuts 1.0 without upgrade/ALLOW_1_0', () => {
    const root = versioned('1.0.0', calloutRemoved.steps);
    recordRelease(root, '1.0.0');
    expect(rules(checkUpgradeLedger(root))).toEqual(['major-before-1.0']);
    expect(messages(checkUpgradeLedger(root))).toContain('upgrade/releases/1.0.0.json');
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

describe('checkUpgradeLedger: a release published but not yet recorded (until hds#451)', () => {
  /**
   * main once the 0.21.0 Version PR merged and published, before anyone
   * records it: package.json at 0.21.0, its changeset consumed, its note
   * still in upgrade/pending, and no 0.21.0 snapshot or ledger. Its one change
   * removed Callout under a breaking note, so it went out as a minor.
   */
  function publishedNotRecorded() {
    const root = releasedRepo();
    removeCallout(root);
    note(root, 'drop-callout', calloutRemoved);
    editPkg(root, (pkg) => (pkg.version = '0.21.0'));
    return root;
  }

  it('passes the Version PR it was', () => {
    const result = checkUpgradeLedger(publishedNotRecorded());
    expect(result.violations).toEqual([]);
    expect(result.summary.unrecorded).toBeNull();
  });

  it('refuses a patch Version PR when a pending note is breaking', () => {
    const root = publishedNotRecorded();
    editPkg(root, (pkg) => (pkg.version = '0.20.1'));
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(messages(result)).toContain('upgrade/pending/drop-callout.json');
  });

  // The review's repro: the released breaking note made every later patch PR
  // fail, and told it to bump by minor.
  it('passes a patch changeset and its note on top, without asking for a minor', () => {
    const root = publishedNotRecorded();
    changeset(root, 'fix-copy', 'patch');
    note(root, 'fix-copy', { impact: 'none' });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('names the release to record and the notes that belong to it', () => {
    const root = publishedNotRecorded();
    changeset(root, 'fix-copy', 'patch');
    note(root, 'fix-copy', { impact: 'none' });
    expect(checkUpgradeLedger(root).summary.unrecorded).toEqual({
      version: '0.21.0',
      previous: '0.20.0',
      notes: ['upgrade/pending/drop-callout.json'],
    });
  });

  // Only a released note says a fact is the release's: without one the gate
  // cannot tell, so the removal needs a step and counts as this change's.
  it('still wants a step for a fact no released note lists', () => {
    const root = publishedNotRecorded();
    rmSync(join(root, 'upgrade/pending/drop-callout.json'));
    changeset(root, 'fix-copy', 'patch');
    note(root, 'fix-copy', { impact: 'none' });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small', 'fact-without-step']);
    expect(messages(result)).toContain('removed:.:Callout');
  });

  it('still wants a minor for a breaking change of its own, naming only that', () => {
    const root = publishedNotRecorded();
    write(root, 'src/index.ts', 'export {};\n');
    changeset(root, 'drop-button', 'patch');
    note(root, 'drop-button', stepFor('removed/Button', 'breaking', ['removed:.:Button']));
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(messages(result)).toContain('upgrade/pending/drop-button.json');
    expect(messages(result)).not.toContain('drop-callout');
    expect(messages(result)).not.toContain('removed:.:Callout');
  });
});

// compile.mjs --release records no prerelease (hds#451), so the gate must not
// read one as a release waiting to be recorded: no hint to record it, and a
// note with no changeset is still an orphan, not the prerelease's own.
describe('checkUpgradeLedger: a prerelease is not a release to record', () => {
  /**
   * After `changeset version` in changesets pre mode: package.json at
   * 0.20.1-rc.0, and the docs changeset kept beside its note (pre.json lists
   * it as consumed). With `preJson` false, the prerelease tag was set by hand.
   */
  function prereleaseRepo({ preJson = true } = {}) {
    const root = releasedRepo();
    changeset(root, 'docs', 'patch');
    note(root, 'docs', { impact: 'none' });
    if (preJson) {
      write(
        root,
        `${CHANGESETS}/pre.json`,
        formatJson({
          mode: 'pre',
          tag: 'rc',
          initialVersions: { [PACKAGE]: '0.20.0' },
          changesets: ['docs'],
        }),
      );
    }
    editPkg(root, (pkg) => (pkg.version = preJson ? '0.20.1-rc.0' : '0.20.1-next.0'));
    return root;
  }
  const stray = {
    impact: 'breaking',
    plain: 'Button is removed, so use your own.',
    steps: [
      {
        id: 'removed/Button',
        kind: 'removed',
        impact: 'breaking',
        plain: 'Button is removed, so use your own.',
      },
    ],
  };

  for (const preJson of [true, false]) {
    const how = preJson ? 'in changesets pre mode' : 'with a prerelease tag set by hand';
    it(`passes ${how}, naming no release to record`, () => {
      const result = checkUpgradeLedger(prereleaseRepo({ preJson }));
      expect(result.violations).toEqual([]);
      expect(result.summary.unrecorded).toBeNull();
    });

    it(`still fails a stray note ${how}: an orphan, and breaking under a patch`, () => {
      const root = prereleaseRepo({ preJson });
      note(root, 'stray', stray);
      const result = checkUpgradeLedger(root);
      expect(rules(result)).toEqual(['bump-too-small', 'note-without-changeset']);
      expect(result.violations.find((v) => v.rule === 'note-without-changeset').file).toBe(
        'upgrade/pending/stray.json',
      );
      expect(result.summary.unrecorded).toBeNull();
    });
  }
});

describe('checkUpgradeLedger: a release recorded from its tarball', () => {
  /**
   * The repo at a release with a tooling export (./eslint-plugin: hand-written
   * types that ship as written), its release snapshot recorded the way
   * `snapshot.mjs --from-npm` reads the tarball: dist/types for the built
   * entries, the shipped .d.mts for the tooling one.
   */
  function releasedFromTarball() {
    const root = releasedRepo();
    editPkg(root, (pkg) => {
      pkg.exports['./eslint-plugin'] = {
        types: './scripts/eslint-plugin-hds/index.d.mts',
        default: './scripts/eslint-plugin-hds/index.mjs',
      };
      pkg.files.push(
        'scripts/eslint-plugin-hds/index.mjs',
        'scripts/eslint-plugin-hds/index.d.mts',
      );
    });
    write(
      root,
      'scripts/eslint-plugin-hds/index.d.mts',
      'declare const plugin: { configs: object };\nexport default plugin;\n',
    );
    write(root, 'scripts/eslint-plugin-hds/index.mjs', 'export default { configs: {} };\n');
    const built = join(root, 'tarball');
    write(built, 'package.json', JSON.stringify(readPkg(root)));
    write(
      built,
      'scripts/eslint-plugin-hds/index.d.mts',
      'declare const plugin: { configs: object };\nexport default plugin;\n',
    );
    write(
      built,
      'dist/types/src/index.d.ts',
      "export * from './button.js';\nexport * from './callout.js';\n",
    );
    write(built, 'dist/types/src/button.d.ts', 'export declare function Button(): null;\n');
    write(built, 'dist/types/src/callout.d.ts', 'export declare function Callout(): null;\n');
    write(built, 'dist/types/src/patterns.d.ts', 'export declare function Page(): null;\n');
    write(root, 'docs/api/releases/0.20.0.json', formatJson(snapshotPackage(built)));
    return root;
  }

  it('finds no fact in the released tree, tooling export included', () => {
    const root = releasedFromTarball();
    const released = JSON.parse(formatJson(snapshotPackage(join(root, 'tarball'))));
    expect(released.entries['./eslint-plugin']).toEqual({
      default: 'scripts/eslint-plugin-hds/index',
    });
    const result = checkUpgradeLedger(root);
    expect(result.violations).toEqual([]);
    expect(result.summary.facts).toBe(0);
  });

  // The verifier's repro: a patch changeset and its note on the released tree
  // failed on removed:./eslint-plugin:default, which no change had made.
  it('passes a patch changeset with its note on top of the release', () => {
    const root = releasedFromTarball();
    changeset(root, 'fix-copy', 'patch');
    note(root, 'fix-copy', { impact: 'none' });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('still fails a tooling export that loses its default, naming the fact', () => {
    const root = releasedFromTarball();
    write(root, 'scripts/eslint-plugin-hds/index.d.mts', 'export {};\n');
    changeset(root, 'drop-plugin', 'patch');
    note(root, 'drop-plugin', { impact: 'none' });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small', 'fact-without-step']);
    expect(messages(result)).toContain('removed:./eslint-plugin:default');
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

// Between a release publishing and someone recording it (until hds#451 does it
// at changeset version), the gate passes and prints one "! … not recorded" hint
// on stderr. That hint must not fail pnpm test for every PR in the window.
const onlyRecordHints = (stderr) =>
  stderr
    .split('\n')
    .filter((line) => line.trim() !== '')
    .every((line) => line.startsWith('! check-upgrade-ledger — '));

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
    expect(onlyRecordHints(failed.stderr)).toBe(false);
  });

  it('says on stderr how to record a published release it finds unrecorded, and still passes', () => {
    const root = releasedRepo();
    removeCallout(root);
    note(root, 'drop-callout', calloutRemoved);
    editPkg(root, (pkg) => (pkg.version = '0.21.0'));
    changeset(root, 'fix-copy', 'patch');
    note(root, 'fix-copy', { impact: 'none' });
    const res = run(['--root', root]);
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('0.21.0 is in package.json but not recorded');
    expect(res.stderr).toContain('snapshot.mjs --from-npm 0.21.0');
    expect(res.stderr).toContain(
      'move upgrade/pending/drop-callout.json to upgrade/sources/0.21.0/notes/',
    );
    expect(res.stderr).toContain('upgrade/published.json');
    expect(onlyRecordHints(res.stderr)).toBe(true);
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
    expect(res.status).toBe(0);
    expect(onlyRecordHints(res.stderr)).toBe(true);
  });

  it('runs in pretest, so pnpm test fails a change without its step', () => {
    const pkg = readPkg(REPO);
    expect(pkg.scripts.pretest).toContain('node scripts/check-upgrade-ledger.mjs');
  });
});
