/**
 * scripts/upgrade/note.mjs, `pnpm upgrade:note` (hds#448): pre-fills a
 * changeset's upgrade note, upgrade/pending/<changeset>.json, from the facts
 * the upgrade gate finds, so the author only writes the plain lines.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpgradeCss } from '../check-upgrade-css.mjs';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import { writeNote } from '../upgrade/note.mjs';
import { TODO_PLAIN } from '../upgrade/schema.mjs';
import {
  PACKAGE,
  RELEASED_CSS,
  buildCss,
  changeset,
  cleanUpRepos,
  cssRepo,
  editPkg,
  note,
  readNote,
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
const CLI = join(REPO, 'scripts/upgrade/note.mjs');

afterEach(cleanUpRepos);

const rules = (root) =>
  checkUpgradeLedger(root)
    .violations.map((v) => v.rule)
    .sort();

/** Replaces every TODO plain line, as the author would. */
function fillIn(root, name) {
  const filled = JSON.stringify(readNote(root, name)).replaceAll(
    JSON.stringify(TODO_PLAIN),
    JSON.stringify('Read the step before upgrading.'),
  );
  note(root, name, JSON.parse(filled));
}

describe('writeNote', () => {
  it('pre-fills a step per fact with its facts, how to detect it and a TODO the gate refuses', () => {
    const root = releasedRepo();
    removeCallout(root);
    editPkg(root, (pkg) => delete pkg.dependencies['date-fns']);
    changeset(root, 'drop', 'minor');

    const result = writeNote(root, { name: 'drop' });
    expect(result.file).toBe('upgrade/pending/drop.json');
    expect(readNote(root, 'drop')).toEqual({
      impact: 'breaking',
      plain: TODO_PLAIN,
      steps: [
        {
          id: 'removed/Callout',
          kind: 'removed',
          impact: 'breaking',
          plain: TODO_PLAIN,
          detect: { imports: [{ from: PACKAGE, names: ['Callout'] }] },
          facts: ['removed:.:Callout'],
        },
        {
          id: 'dependency/date-fns',
          kind: 'dependency',
          impact: 'breaking',
          plain: TODO_PLAIN,
          detect: { bareImports: ['date-fns'] },
          range: '^4.1.0',
          facts: ['dependency-removed:date-fns'],
        },
      ],
    });
    expect(rules(root)).toEqual(['note-invalid']);

    fillIn(root, 'drop');
    expect(rules(root)).toEqual([]);
  });

  // hds#449: with a build, the CSS facts too, each detected by name in consumer code.
  it('pre-fills a removed step per CSS removal and a value-changed step per changed variable, from the build', () => {
    const root = cssRepo();
    buildCss(
      root,
      RELEASED_CSS.replace('size-xs:13px', 'size-xs:12px')
        .replace(/--hds-space:\dpx;?/g, '')
        .replace('.hds-focus:focus-visible{outline:2px solid}', '')
        .replace('.flex{display:flex}', ''),
    );
    changeset(root, 'css', 'minor');
    writeNote(root, { name: 'css' });
    expect(readNote(root, 'css')).toEqual({
      impact: 'breaking',
      plain: TODO_PLAIN,
      steps: [
        {
          id: 'removed/--hds-space',
          kind: 'removed',
          impact: 'breaking',
          plain: TODO_PLAIN,
          detect: { cssVars: ['--hds-space'], cssVarWrites: ['--hds-space'] },
          facts: ['css-var-removed:--hds-space'],
        },
        {
          id: 'value-changed/--primitive-typography-size-xs',
          kind: 'value-changed',
          impact: 'look',
          plain: TODO_PLAIN,
          detect: {
            cssVars: ['--primitive-typography-size-xs'],
            cssVarWrites: ['--primitive-typography-size-xs'],
          },
          facts: ['css-var-changed:--primitive-typography-size-xs::root'],
        },
        {
          id: 'removed/hds-focus',
          kind: 'removed',
          impact: 'breaking',
          plain: TODO_PLAIN,
          detect: { classes: ['hds-focus'] },
          facts: ['class-removed:hds-focus'],
        },
      ],
    });
    fillIn(root, 'css');
    expect(checkUpgradeCss(root).violations).toEqual([]);
    expect(rules(root)).toEqual([]);
  });

  it('writes one step for a name that left two entries', () => {
    const root = releasedRepo();
    write(root, 'src/index.ts', "export * from './button';\nexport { Page } from './patterns';\n");
    recordRelease(root);
    write(root, 'src/index.ts', "export * from './button';\n");
    write(root, 'src/patterns.ts', 'export {};\n');
    changeset(root, 'drop-page', 'minor');

    const { steps } = writeNote(root, { name: 'drop-page' }).note;
    expect(steps).toEqual([
      expect.objectContaining({
        id: 'removed/Page',
        detect: {
          imports: [
            { from: PACKAGE, names: ['Page'] },
            { from: `${PACKAGE}/patterns`, names: ['Page'] },
          ],
        },
        facts: ['removed:.:Page', 'removed:./patterns:Page'],
      }),
    ]);
  });

  it('writes steps for a removed exports key, bin, narrowed peer and raised engines', () => {
    const root = releasedRepo();
    editPkg(root, (pkg) => {
      delete pkg.exports['./styles.css'];
      delete pkg.bin['hds-tile-grid'];
      pkg.peerDependencies.zod = '^4.0.0';
      pkg.engines.node = '>=22';
    });
    changeset(root, 'tighten', 'minor');
    const { note: written } = writeNote(root, { name: 'tighten' });
    expect(written.steps.map((s) => [s.id, s.impact])).toEqual([
      ['exports/./styles.css', 'breaking'],
      ['peer/zod', 'breaking'],
      ['engines/node', 'breaking'],
      ['removed/hds-tile-grid', 'breaking'],
    ]);
    fillIn(root, 'tighten');
    expect(rules(root)).toEqual([]);
  });

  it('guesses impact from the facts: a widened peer is additive, an added export additive, nothing none', () => {
    const widened = releasedRepo();
    editPkg(widened, (pkg) => (pkg.peerDependencies.react = '^18.3.0 || ^19.0.0 || ^20.0.0'));
    changeset(widened, 'react-20', 'patch');
    const peer = writeNote(widened, { name: 'react-20' }).note;
    expect(peer.impact).toBe('additive');
    expect(peer.steps).toEqual([
      expect.objectContaining({
        id: 'peer/react',
        impact: 'additive',
        range: '^18.3.0 || ^19.0.0',
      }),
    ]);

    const added = releasedRepo();
    write(
      added,
      'src/patterns.ts',
      'export function Page() { return null; }\nexport const x = 1;\n',
    );
    changeset(added, 'add-x', 'patch');
    expect(writeNote(added, { name: 'add-x' }).note).toEqual({
      impact: 'additive',
      plain: TODO_PLAIN,
    });

    const quiet = releasedRepo();
    changeset(quiet, 'refactor', 'patch');
    expect(writeNote(quiet, { name: 'refactor' }).note).toEqual({
      impact: 'none',
      plain: TODO_PLAIN,
    });
  });

  // An added export needs no step, so nothing ties it to one changeset. With
  // another changeset pending, the addition may be that one's (hds#448 verify).
  it("does not guess additive from another changeset's additions", () => {
    const root = releasedRepo();
    write(
      root,
      'src/patterns.ts',
      'export function Page() { return null; }\nexport const x = 1;\n',
    );
    changeset(root, 'add-x', 'patch');
    changeset(root, 'fix-copy', 'patch');
    // Before add-x has its note, and after.
    expect(writeNote(root, { name: 'fix-copy' }).note).toEqual({
      impact: 'none',
      plain: TODO_PLAIN,
    });
    note(root, 'add-x', { impact: 'additive', plain: 'Patterns export x.' });
    note(root, 'fix-copy', { impact: 'none' });
    expect(writeNote(root, { name: 'fix-copy' }).note).toEqual({ impact: 'none' });
    // A step for an unrelated fact still sets the impact it needs.
    removeCallout(root);
    expect(writeNote(root, { name: 'fix-copy' }).note.impact).toBe('breaking');
  });

  it('keeps what the author wrote, adds only what is still uncovered, and a second run changes nothing', () => {
    const root = releasedRepo();
    removeCallout(root);
    changeset(root, 'drop', 'minor');
    writeNote(root, { name: 'drop' });
    fillIn(root, 'drop');
    const authored = readNote(root, 'drop');

    editPkg(root, (pkg) => delete pkg.dependencies['date-fns']);
    const second = writeNote(root, { name: 'drop' });
    expect(second.added).toEqual(['dependency/date-fns']);
    const merged = readNote(root, 'drop');
    expect(merged.plain).toBe(authored.plain);
    expect(merged.steps[0]).toEqual(authored.steps[0]);
    expect(merged.steps.map((s) => s.id)).toEqual(['removed/Callout', 'dependency/date-fns']);

    const bytes = readFileSync(join(root, 'upgrade/pending/drop.json'), 'utf8');
    expect(writeNote(root, { name: 'drop' }).added).toEqual([]);
    expect(readFileSync(join(root, 'upgrade/pending/drop.json'), 'utf8')).toBe(bytes);
  });

  it('raises the impact an author wrote when a new step is more severe', () => {
    const root = releasedRepo();
    changeset(root, 'drop', 'minor');
    note(root, 'drop', { impact: 'none' });
    removeCallout(root);
    expect(writeNote(root, { name: 'drop' }).note.impact).toBe('breaking');
  });
});

describe('upgrade:note CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  it('picks the one changeset without a note when --name is left out', () => {
    const root = releasedRepo();
    removeCallout(root);
    changeset(root, 'has-note', 'patch');
    note(root, 'has-note', { impact: 'none' });
    changeset(root, 'drop', 'minor');
    const res = run(['--root', root]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('upgrade/pending/drop.json');
    expect(res.stdout).toMatch(/TODO/);
    expect(readNote(root, 'drop').steps[0].id).toBe('removed/Callout');
  });

  it('says a breaking note needs a minor changeset', () => {
    const root = releasedRepo();
    removeCallout(root);
    changeset(root, 'drop', 'patch');
    const res = run(['--root', root, '--name', 'drop']);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(`'${PACKAGE}': minor`);
  });

  it('accepts the changeset path as the name', () => {
    const root = releasedRepo();
    changeset(root, 'quiet', 'patch');
    expect(run(['--root', root, '--name', `${CHANGESETS}/quiet.md`]).status).toBe(0);
    expect(readNote(root, 'quiet').impact).toBe('none');
  });

  it('refuses to guess between two changesets without notes, and with none pending', () => {
    const root = releasedRepo();
    const none = run(['--root', root]);
    expect(none.status).toBe(2);
    expect(none.stderr).toContain('pnpm changeset');

    changeset(root, 'a', 'patch');
    changeset(root, 'b', 'patch');
    const two = run(['--root', root]);
    expect(two.status).toBe(2);
    expect(two.stderr).toContain('--name');
    expect(two.stderr).toContain('a, b');
  });

  it('is pnpm upgrade:note', () => {
    expect(readPkg(REPO).scripts['upgrade:note']).toBe('node scripts/upgrade/note.mjs');
  });
});
