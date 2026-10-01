/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * pending.mjs — the upgrade state of a working tree between releases (hds#448).
 *
 * Read by the gate (scripts/check-upgrade-ledger.mjs) and by `pnpm
 * upgrade:note` (./note.mjs), so both see the same facts:
 *
 *   - the release snapshot to compare against: the newest
 *     docs/api/releases/<v>.json whose version is at or below package.json's;
 *   - the snapshot of the working tree, read from source (./snapshot.mjs), and
 *     the facts between the two (./diff.mjs);
 *   - the ledger of package.json's version, upgrade/releases/<version>.json,
 *     when it exists (after `changeset version`, before the next snapshot);
 *   - the pending changesets (.changeset/*.md but README.md), each with the
 *     bump it gives @hirobius/design-system;
 *   - the pending notes, upgrade/pending/<changeset>.json, each validated
 *     against PendingNote (./schema.mjs);
 *   - whether upgrade/ALLOW_1_0 exists.
 *
 * Nothing here touches the network or builds anything.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { diffSnapshots } from './diff.mjs';
import { IMPACTS, PendingNote, Release, compareVersions } from './schema.mjs';
import { PACKAGE, snapshotFromSource } from './snapshot.mjs';

export const RELEASES_SNAPSHOTS = 'docs/api/releases';
export const PENDING_DIR = 'upgrade/pending';
export const ALLOW_1_0 = 'upgrade/ALLOW_1_0';

const BUMPS = new Set(['patch', 'minor', 'major']);
const SEMVER_FILE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.json$/;

/** Schema issues as `<path>[, <path>...]: <message>`, one line per distinct message. */
function issuesOf(error) {
  const byMessage = new Map();
  for (const issue of error.issues) {
    const paths = byMessage.get(issue.message) ?? [];
    paths.push(issue.path.join('.') || '(root)');
    byMessage.set(issue.message, paths);
  }
  return [...byMessage].map(([message, paths]) => `${paths.join(', ')}: ${message}`);
}

/**
 * One changeset's bump for this package: `none` when its front matter does
 * not name it (an empty changeset). `error` says why a file cannot be read.
 */
function readChangeset(root, file) {
  const rel = `.changeset/${file}`;
  const changeset = { name: file.replace(/\.md$/, ''), file: rel, bump: 'none', error: null };
  const lines = readFileSync(join(root, rel), 'utf8').split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  if (lines[0] !== '---' || end === -1) {
    return { ...changeset, error: 'it has no front matter (a --- block naming the bump)' };
  }
  let data;
  try {
    data = parseYaml(lines.slice(1, end).join('\n')) ?? {};
  } catch (error) {
    return { ...changeset, error: `its front matter is not YAML (${error.message})` };
  }
  const bump = typeof data === 'object' && !Array.isArray(data) ? (data[PACKAGE] ?? 'none') : null;
  if (bump !== 'none' && !BUMPS.has(bump)) {
    return {
      ...changeset,
      error: `its front matter does not bump ${PACKAGE} by patch, minor or major`,
    };
  }
  return { ...changeset, bump };
}

/** Every pending changeset, by name. */
export function readChangesets(root) {
  const dir = join(root, '.changeset');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file.toLowerCase() !== 'readme.md')
    .sort()
    .map((file) => readChangeset(root, file));
}

/**
 * Every pending note. A note that does not fit the schema keeps what it says
 * in `raw`, so its steps still cover their facts and only the note itself is
 * reported.
 */
export function readPendingNotes(root) {
  const dir = join(root, PENDING_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const note = { name: file.replace(/\.json$/, ''), file: `${PENDING_DIR}/${file}` };
      let raw;
      try {
        raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      } catch (error) {
        return { ...note, note: null, raw: null, problems: [`not JSON (${error.message})`] };
      }
      const result = PendingNote.safeParse(raw);
      return result.success
        ? { ...note, note: result.data, raw, problems: [] }
        : { ...note, note: null, raw, problems: issuesOf(result.error) };
    });
}

/** The steps a note holds, read as far as its JSON allows. */
export function noteSteps(pending) {
  const steps = pending.note?.steps ?? pending.raw?.steps;
  return Array.isArray(steps) ? steps.filter((step) => step && typeof step === 'object') : [];
}

/** A note's impact, read as far as its JSON allows; null when it has none. */
export function noteImpact(pending) {
  const impact = pending.note?.impact ?? pending.raw?.impact;
  return IMPACTS.includes(impact) ? impact : null;
}

/** The newest committed release snapshot at or below `version`, or null. */
function previousRelease(root, version) {
  const dir = join(root, RELEASES_SNAPSHOTS);
  if (!existsSync(dir)) return null;
  const versions = readdirSync(dir)
    .filter((file) => SEMVER_FILE.test(file))
    .map((file) => file.replace(/\.json$/, ''))
    .filter((v) => compareVersions(v, version) <= 0)
    .sort(compareVersions);
  return versions.at(-1) ?? null;
}

/** upgrade/releases/<version>.json, validated, or null when there is none. */
function readLedger(root, version) {
  const file = `upgrade/releases/${version}.json`;
  if (!existsSync(join(root, file))) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(root, file), 'utf8'));
  } catch (error) {
    return { file, release: null, problems: [`not JSON (${error.message})`] };
  }
  const result = Release.safeParse(raw);
  return result.success
    ? { file, release: result.data, problems: [] }
    : { file, release: null, problems: issuesOf(result.error) };
}

/**
 * The upgrade state of the tree at `root`. Throws when package.json or an
 * exports entry's source cannot be read.
 * @param {string} root
 */
export function readUpgradeState(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const version = pkg.version;
  const previousVersion = previousRelease(root, version);
  const facts = previousVersion
    ? diffSnapshots(
        JSON.parse(readFileSync(join(root, RELEASES_SNAPSHOTS, `${previousVersion}.json`), 'utf8')),
        snapshotFromSource(root),
      )
    : [];
  return {
    root,
    version,
    previousVersion,
    facts,
    ledger: readLedger(root, version),
    changesets: readChangesets(root),
    notes: readPendingNotes(root),
    allow10: existsSync(join(root, ALLOW_1_0)),
  };
}

/**
 * The facts the ledger of package.json's version already accounts for: after
 * `changeset version` bumps the version, and before that release's snapshot is
 * committed, the diff still holds the release's own facts.
 */
export function releasedFactIds(state) {
  const { version, previousVersion, ledger } = state;
  if (!previousVersion || compareVersions(version, previousVersion) <= 0) return new Set();
  return new Set((ledger?.release?.steps ?? []).flatMap((step) => step.facts ?? []));
}

/** The facts since the last release that this release has not accounted for. */
export function newFacts(state) {
  const released = releasedFactIds(state);
  return state.facts.filter((fact) => !released.has(fact.id));
}
