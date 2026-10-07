#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-upgrade-ledger.mjs — every change since the last release has an upgrade
 * step, every changeset carries its upgrade note, and the bump fits (hds#448).
 *
 * Why: nothing read a changeset's bump, so a removal could ship as a patch;
 * `pnpm api:update` cleared a removed export with no migration step; 0.20.0
 * dropped five runtime dependencies under Patch Changes. This gate compares
 * the working tree, read from source with no build (scripts/upgrade/
 * snapshot.mjs), with the newest release snapshot at or below package.json's
 * version (docs/api/releases/<v>.json), and fails when:
 *
 *   1. a fact that takes something away (scripts/upgrade/ledger.mjs
 *      FACTS_NEEDING_A_STEP: an export removed or moved, an exports key, a
 *      dependency or a bin gone, a peer or engines change) is listed by no step
 *      in upgrade/pending/*.json (or, once versioned, in the release's ledger);
 *   2. a .changeset/*.md has no upgrade/pending/<same name>.json, or that note
 *      does not fit the schema: impact always stated ("none" included), a plain
 *      line unless impact is none, and no TODO left from `pnpm upgrade:note`;
 *      or what `pnpm changeset:version` would refuse or misfile: a note step
 *      listing a fact the diff no longer has (a reverted removal), or, once
 *      package.json's version has its snapshot, a note with no changeset of
 *      the same name (hds#541: it would be recorded citing a changeset that
 *      never existed); or a step of package.json's ledger citing
 *      `.changeset/<name>.md`, which its own Version PR deletes (compile.mjs
 *      found no CHANGELOG entry for that changeset);
 *   3. something is breaking (a breaking fact, a note that says so, or a step
 *      that removes, moves, renames or folds something public) and the
 *      changesets bump @hirobius/design-system by less than minor below 1.0
 *      (major from 1.0). The ledger of package.json's version must not
 *      record a smaller bump than its breaking steps need. `pnpm
 *      changeset:version` records each release on its Version PR
 *      (scripts/upgrade/compile.mjs --release, hds#451: snapshot, ledger,
 *      notes moved to upgrade/sources/<version>/notes). A Version PR cut
 *      without it (package.json past the snapshot, no changesets left) has
 *      its real bump checked instead; once that release is published and
 *      changesets are pending again, but before anyone records it by hand,
 *      the notes whose changesets are gone, and the facts their steps list,
 *      are that release's: they still cover their facts but do not count
 *      toward the next bump, and the gate names the release to record;
 *   4. a changeset bumps major below 1.0, or the version crosses 1.0 (on the
 *      Version PR, or in the ledger compile.mjs recorded for it), without
 *      upgrade/ALLOW_1_0 (the 1.0 cut is a decision, #396).
 *
 * The fix it names is `pnpm upgrade:note`, which pre-fills the note from the
 * facts (scripts/upgrade/note.mjs).
 *
 * Usage:
 *   node scripts/check-upgrade-ledger.mjs [--root <dir>] [--json]
 *
 * Runs in pretest, so pre-push, CI and the Ralph gate run it. Fixture mode
 * (docs/guardrails/FIXTURE_DIR_HARNESS.md): with FIXTURE_DIR set, that
 * directory is the repo root (fixtures/check-upgrade-ledger/*.example.d).
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitResult, hasJsonFlag } from './lib/gate-output.mjs';
import {
  BUMP_RANK,
  breakingBump,
  bumpBetween,
  factImpact,
  stepIsBreaking,
  uncoveredFacts,
} from './upgrade/ledger.mjs';
import {
  ALLOW_1_0,
  PENDING_DIR,
  RELEASES_SNAPSHOTS,
  newFacts,
  noteImpact,
  noteSteps,
  readUpgradeState,
} from './upgrade/pending.mjs';
import { compareVersions } from './upgrade/schema.mjs';
import { PACKAGE } from './upgrade/snapshot.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE = 'pnpm upgrade:note';

const entryName = (entry) => (entry === '.' ? PACKAGE : `${PACKAGE}/${entry.slice(2)}`);
const peerText = (peer) => (peer ? `${peer.range}${peer.optional ? ' (optional)' : ''}` : 'absent');
const major = (version) => Number(version.split('.')[0]);

/** A fact in words. */
export function describeFact(fact) {
  switch (fact.kind) {
    case 'removed':
      return `${fact.name} is no longer exported from ${entryName(fact.entry)}`;
    case 'moved':
      return `${fact.name} moved from ${entryName(fact.from)} to ${entryName(fact.to)}`;
    case 'exports-key-removed':
      return `package.json#exports no longer has ${fact.key}`;
    case 'dependency-removed':
      return `${fact.name} is no longer a dependency`;
    case 'peer-changed':
      return `peer ${fact.name} went from ${peerText(fact.from)} to ${peerText(fact.to)}`;
    case 'engines-changed':
      return `engines.${fact.name} went from ${fact.from ?? 'absent'} to ${fact.to ?? 'absent'}`;
    case 'bin-removed':
      return `the ${fact.name} bin is gone`;
    default:
      return fact.id;
  }
}

const violation = (file, rule, message, extra = {}) => ({
  file,
  line: null,
  rule,
  severity: 'error',
  message,
  ...extra,
});

/** `a, b and 3 more`. */
function list(items, shown = 3) {
  if (items.length <= shown) return items.join(', ');
  return `${items.slice(0, shown).join(', ')} and ${items.length - shown} more`;
}

function factViolations(state) {
  const steps = state.notes.flatMap(noteSteps);
  const facts = newFacts(state);
  const uncovered = uncoveredFacts(facts, steps).map((fact) =>
    violation(
      `${PENDING_DIR}/`,
      'fact-without-step',
      `${fact.id}: ${describeFact(fact)}, and no upgrade step lists it in facts. Run ${NOTE} to pre-fill one in ${PENDING_DIR}/<changeset>.json.`,
      { fact: fact.id },
    ),
  );
  // A step listing a fact the diff lacks stops the release compiler
  // (build-ledger.mjs ledgerFromSources), so the gate refuses it first.
  const known = new Set(facts.map((fact) => fact.id));
  const unknown = [];
  for (const note of state.notes) {
    for (const step of noteSteps(note)) {
      const ids = (Array.isArray(step.facts) ? step.facts : []).filter(
        (id) => typeof id === 'string' && !known.has(id),
      );
      if (ids.length === 0) continue;
      unknown.push(
        violation(
          note.file,
          'step-fact-unknown',
          `${note.file}: step ${step.id} lists ${ids.join(', ')}, which the diff since ${state.previousVersion} does not have (the change was reverted, or an earlier release shipped it), so pnpm changeset:version would refuse this note. Take ${ids.length === 1 ? 'it' : 'them'} out of facts, and the step too if nothing is left to tell; ${NOTE} then adds a step for any fact still uncovered.`,
          { facts: ids },
        ),
      );
    }
  }
  return [...uncovered, ...unknown];
}

function noteViolations(state, versionPr) {
  const out = [];
  const noted = new Set(state.notes.map((note) => note.name));
  for (const changeset of state.changesets) {
    if (changeset.error) {
      out.push(
        violation(
          changeset.file,
          'changeset-unreadable',
          `${changeset.file}: ${changeset.error}, such as '${PACKAGE}': patch.`,
        ),
      );
    }
    if (!noted.has(changeset.name)) {
      out.push(
        violation(
          changeset.file,
          'changeset-without-note',
          `${changeset.file} has no ${PENDING_DIR}/${changeset.name}.json. Run ${NOTE} --name ${changeset.name}, then state its impact (none, additive, look, behavior or breaking) and, unless it is none, one plain line.`,
        ),
      );
    }
  }
  for (const note of state.notes) {
    if (note.problems.length > 0) {
      out.push(violation(note.file, 'note-invalid', `${note.file}: ${note.problems.join('; ')}.`));
    }
  }
  // hds#541: a note with no changeset of its name. Once package.json's version
  // has its snapshot, no release is waiting to be recorded, so no note belongs
  // to one (releasedNotes): the next release would merge it, citing a
  // changeset that never existed.
  if (!versionPr && compareVersions(state.version, state.previousVersion) <= 0) {
    const pending = new Set(state.changesets.map((changeset) => changeset.name));
    for (const note of state.notes.filter((n) => !pending.has(n.name))) {
      out.push(
        violation(
          note.file,
          'note-without-changeset',
          `${note.file} has no .changeset/${note.name}.md, and a note travels with the changeset of its name: rename it to its changeset's name, or delete it if its change is gone (${NOTE} --name <changeset> writes the note a changeset needs).`,
        ),
      );
    }
  }
  if (state.summary?.problem) {
    out.push(
      violation(
        state.summary.file,
        'summary-invalid',
        `${state.summary.problem}: shorten it to one line, or delete it to have the summary counted from the steps.`,
      ),
    );
  }
  if (state.ledger?.problems.length > 0) {
    out.push(
      violation(
        state.ledger.file,
        'ledger-invalid',
        `${state.ledger.file}: ${state.ledger.problems.join('; ')}.`,
      ),
    );
  }
  out.push(...deadCitations(state));
  return out;
}

/**
 * Steps of package.json's ledger that cite `.changeset/<name>.md`: compile.mjs
 * --release found no single CHANGELOG entry for that changeset, and the
 * Version PR that recorded the ledger deletes the file, so the published
 * ledger would cite nothing. One violation per changeset.
 */
function deadCitations(state) {
  const { ledger, version } = state;
  const bySource = new Map();
  for (const step of ledger?.release?.steps ?? []) {
    if (!/^\.changeset\/.+\.md$/.test(step.source ?? '')) continue;
    bySource.set(step.source, [...(bySource.get(step.source) ?? []), step.id]);
  }
  const sources = `upgrade/sources/${version}/release.json`;
  return [...bySource].map(([source, ids]) => {
    const name = source.slice('.changeset/'.length, -'.md'.length);
    return violation(
      ledger.file,
      'ledger-cites-changeset',
      `${ledger.file}: ${list(ids)} ${ids.length === 1 ? 'cites' : 'cite'} ${source}, a file this release deletes: compile.mjs --release found no single ${version} CHANGELOG entry for that changeset. In ${sources}, set notes.${name} to { "needle": <text of its entry>, "source": "CHANGELOG.md:<line>" }, then run node scripts/upgrade/build-ledger.mjs ${version} and node scripts/upgrade/compile.mjs.`,
      { steps: ids },
    );
  });
}

/**
 * The notes of a release that is published but not yet recorded: package.json
 * names a version past the newest release snapshot, and changesets are pending
 * again (not the Version PR). A release cut without the release compiler
 * (scripts/upgrade/compile.mjs --release, hds#451) leaves its notes in
 * upgrade/pending after `changeset version` consumed their changesets, so a
 * note whose changeset is gone belongs to the version package.json already
 * names. Its Version PR checked its bump. A release cut through `pnpm
 * changeset:version` has its snapshot, so this is always empty for it.
 */
function releasedNotes(state, versionPr) {
  if (versionPr || compareVersions(state.version, state.previousVersion) <= 0) return [];
  const pending = new Set(state.changesets.map((changeset) => changeset.name));
  return state.notes.filter((note) => !pending.has(note.name));
}

/**
 * What says the change is breaking: fact ids, note files and step ids. A note
 * that says breaking counts as a whole; otherwise each of its steps that takes
 * something away counts (a removed CSS variable the diff cannot see yet). The
 * notes of a published but unrecorded release, and the facts their steps list,
 * are that release's, so they do not count toward the next bump; their steps
 * still cover their facts (factViolations).
 */
function breakingEvidence(state, versionPr) {
  const released = new Set(releasedNotes(state, versionPr));
  const releasedFacts = new Set(
    [...released]
      .flatMap(noteSteps)
      .flatMap((step) => (Array.isArray(step.facts) ? step.facts : [])),
  );
  const facts = versionPr ? state.facts : newFacts(state).filter((f) => !releasedFacts.has(f.id));
  const evidence = facts.filter((fact) => factImpact(fact) === 'breaking').map((fact) => fact.id);
  for (const note of state.notes) {
    if (released.has(note)) continue;
    if (noteImpact(note) === 'breaking') evidence.push(note.file);
    else for (const step of noteSteps(note)) if (stepIsBreaking(step)) evidence.push(step.id);
  }
  if (versionPr) {
    for (const step of state.ledger?.release?.steps ?? []) {
      if (stepIsBreaking(step)) evidence.push(step.id);
    }
  }
  return [...new Set(evidence)];
}

function bumpViolations(state, versionPr) {
  const { version, previousVersion, changesets, ledger } = state;
  const out = [];
  const evidence = breakingEvidence(state, versionPr);
  if (versionPr) {
    const actual = bumpBetween(previousVersion, version);
    const need = breakingBump(previousVersion);
    if (evidence.length > 0 && BUMP_RANK[actual] < BUMP_RANK[need]) {
      out.push(
        violation(
          'package.json',
          'bump-too-small',
          `${version} is a ${actual} release after ${previousVersion}, but it breaks something (${list(evidence)}): a breaking release needs a ${need} bump below 1.0 (a major from 1.0).`,
        ),
      );
    }
  } else if (evidence.length > 0) {
    const need = breakingBump(version);
    const bump = changesets.reduce(
      (max, c) => (BUMP_RANK[c.bump] > BUMP_RANK[max] ? c.bump : max),
      'none',
    );
    if (BUMP_RANK[bump] < BUMP_RANK[need]) {
      const files = changesets.map((c) => c.file);
      const fix =
        files.length === 1
          ? `${files[0]} bumps ${PACKAGE} by ${bump}: make it '${PACKAGE}': ${need}`
          : files.length > 1
            ? `${list(files)} bump ${PACKAGE} by ${bump} at most: make one of them '${PACKAGE}': ${need}`
            : `no .changeset/*.md is pending: add one with pnpm changeset (${need}), then run ${NOTE}`;
      out.push(
        violation(
          files[0] ?? '.changeset/',
          'bump-too-small',
          `${list(evidence)} ${evidence.length === 1 ? 'is' : 'are'} breaking, so the next release needs a ${need} bump below 1.0 (a major from 1.0), but ${fix}.`,
        ),
      );
    }
  }
  // The ledger of package.json's version, as compiled: its bump must cover its
  // own breaking steps. (On the Version PR the real bump is checked above.)
  if (!versionPr && ledger?.release) {
    const breaking = ledger.release.steps.filter(stepIsBreaking);
    const need = breakingBump(version);
    if (breaking.length > 0 && BUMP_RANK[ledger.release.bump] < BUMP_RANK[need]) {
      out.push(
        violation(
          ledger.file,
          'ledger-bump-too-small',
          `${ledger.file} records a ${ledger.release.bump} release, but ${list(breaking.map((s) => s.id))} ${breaking.length === 1 ? 'is' : 'are'} breaking: a breaking release needs a ${need} bump.`,
        ),
      );
    }
  }
  return out;
}

function allowViolations(state, versionPr) {
  if (state.allow10) return [];
  const why = `HDS stays below 1.0 until the 1.0 cut is decided (#396): use minor for a breaking change, or create ${ALLOW_1_0} when 1.0 is agreed`;
  if (versionPr) {
    const { version, previousVersion } = state;
    return major(previousVersion) === 0 && major(version) >= 1
      ? [
          violation(
            'package.json',
            'major-before-1.0',
            `${version} cuts 1.0 from ${previousVersion}. ${why}.`,
          ),
        ]
      : [];
  }
  // A Version PR the release compiler recorded (hds#451) has its snapshot, so
  // it is not versionPr above; the ledger it wrote still names the 1.0 cut.
  const ledger = state.ledger?.release;
  if (ledger?.bump === 'major' && /^1\.0\.0(?:-|$)/.test(state.version)) {
    return [
      violation(
        state.ledger.file,
        'major-before-1.0',
        `${state.ledger.file} records ${state.version} as a major release, which cuts 1.0. ${why}.`,
      ),
    ];
  }
  if (major(state.version) !== 0) return [];
  return state.changesets
    .filter((c) => c.bump === 'major')
    .map((c) =>
      violation(
        c.file,
        'major-before-1.0',
        `${c.file} bumps ${PACKAGE} by major, which cuts 1.0.0 from ${state.version}. ${why}.`,
      ),
    );
}

/**
 * Every problem in the tree at `root`, in the gate-output shape, plus the
 * release it compared against.
 * @param {string} [root]
 */
export function checkUpgradeLedger(root = REPO) {
  let state;
  try {
    state = readUpgradeState(root);
  } catch (error) {
    const message = `the working tree cannot be read as a package: ${error.message}`;
    return { violations: [violation('package.json', 'source-unreadable', message)], ok: false };
  }
  if (!state.previousVersion) {
    const message = `no release snapshot at or below ${state.version} in ${RELEASES_SNAPSHOTS}/: record the last release with node scripts/upgrade/snapshot.mjs --from-npm <version>.`;
    return {
      violations: [violation(`${RELEASES_SNAPSHOTS}/`, 'no-release-snapshot', message)],
      ok: false,
      previous: null,
    };
  }
  // The Version PR: `changeset version` consumed every changeset and bumped
  // package.json past the last release snapshot.
  const versionPr =
    state.changesets.length === 0 && compareVersions(state.version, state.previousVersion) > 0;
  const violations = [
    ...factViolations(state),
    ...noteViolations(state, versionPr),
    ...bumpViolations(state, versionPr),
    ...allowViolations(state, versionPr),
  ];
  return {
    violations,
    ok: violations.length === 0,
    previous: state.previousVersion,
    summary: {
      previous: state.previousVersion,
      version: state.version,
      facts: state.facts.length,
      changesets: state.changesets.length,
      notes: state.notes.length,
      unrecorded: unrecorded(state, versionPr),
    },
  };
}

/**
 * The published release no snapshot records yet, with the notes that belong
 * to it, or null: a release cut without compile.mjs --release, which is
 * then recorded by hand.
 */
function unrecorded(state, versionPr) {
  if (versionPr || compareVersions(state.version, state.previousVersion) <= 0) return null;
  return {
    version: state.version,
    previous: state.previousVersion,
    notes: releasedNotes(state, versionPr).map((note) => note.file),
  };
}

/** How to record the release `summary.unrecorded` names, in one line. */
export function recordHint({ version, notes }) {
  const move =
    notes.length > 0
      ? `, move ${list(notes)} to upgrade/sources/${version}/notes/ and cite each in its release.json`
      : '';
  return `${version} is in package.json but not recorded: run node scripts/upgrade/snapshot.mjs --from-npm ${version}${move}, run node scripts/upgrade/build-ledger.mjs ${version}, and add ${version} to upgrade/published.json (upgrade/README.md, "Recording a release by hand").`;
}

function parseRoot(argv) {
  const at = argv.indexOf('--root');
  if (at !== -1) return resolve(argv[at + 1] ?? '.');
  const fixtureMode = argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
  if (fixtureMode && process.env.FIXTURE_DIR) return resolve(process.env.FIXTURE_DIR);
  return REPO;
}

function main(argv) {
  const json = hasJsonFlag(argv);
  const result = checkUpgradeLedger(parseRoot(argv));
  emitResult(result, json);
  if (result.summary?.unrecorded)
    console.error(`! check-upgrade-ledger — ${recordHint(result.summary.unrecorded)}`);
  const since = result.previous
    ? `since ${result.previous} (${RELEASES_SNAPSHOTS}/${result.previous}.json)`
    : '';
  if (!result.ok) {
    console.error(
      `✗ check-upgrade-ledger — ${result.violations.length} problem(s) ${since}:`.replace(
        ' :',
        ':',
      ),
    );
    for (const v of result.violations) console.error(`  - ${v.message}`);
    console.error(
      `  fix: ${NOTE} [--name <changeset>] writes ${PENDING_DIR}/<changeset>.json with a step for each fact; replace its TODO plain lines, and make the changeset minor when the change is breaking (upgrade/README.md).`,
    );
    return 1;
  }
  if (!json) {
    const { facts, changesets } = result.summary;
    console.log(
      `✓ check-upgrade-ledger — every change ${since} has its upgrade step and the right bump (${facts} fact(s), ${changesets} changeset(s)).`,
    );
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
