/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * ledger.mjs — what every release-ledger generator shares (hds#447).
 *
 * A ledger (upgrade/releases/<version>.json, shape in ./schema.mjs) is built
 * from the facts between two release snapshots (./diff.mjs), each turned into a
 * step, plus the look and behavior steps that only CHANGELOG prose records.
 * The backfill generator (./build-ledger.mjs, hds#450: 0.17.0 to 0.20.0) and
 * the history check (./history.mjs) use them; the release compiler (hds#451)
 * builds on the same helpers.
 */
import { FACT_KINDS } from './diff.mjs';
import { narrows } from './ranges.mjs';
import { Release, STEP_KINDS, compareVersions } from './schema.mjs';

/** Facts that add something: a ledger may list them, but none needs a step. */
const ADDITIVE_FACTS = new Set(['added', 'exports-key-added', 'dependency-added', 'bin-added']);

/** The fact kinds a ledger must account for. */
export const FACTS_NEEDING_A_STEP = FACT_KINDS.filter((kind) => !ADDITIVE_FACTS.has(kind));

/** Facts that take something away a consumer may use (hds#445 decision 3). */
const BREAKING_FACTS = new Set([
  'removed',
  'moved',
  'exports-key-removed',
  'dependency-removed',
  'bin-removed',
]);

/**
 * What a fact does to a consumer that does nothing: breaking when it removes
 * or moves something public, drops a dependency, narrows a peer (or makes one
 * required, or adds or drops a required one, which npm and pnpm install for
 * the consumer) or raises engines; additive when it only adds or widens.
 * scripts/check-upgrade-ledger.mjs bumps by it; `pnpm upgrade:note` guesses a
 * step's impact from it.
 * @param {{ kind: string, from?: any, to?: any }} fact
 * @returns {'none' | 'additive' | 'breaking'}
 */
export function factImpact(fact) {
  if (ADDITIVE_FACTS.has(fact.kind)) return 'additive';
  if (BREAKING_FACTS.has(fact.kind)) return 'breaking';
  const { from, to } = fact;
  if (fact.kind === 'peer-changed') {
    if (!from) return to.optional ? 'additive' : 'breaking';
    if (!to) return from.optional ? 'none' : 'breaking';
    if (from.optional && !to.optional) return 'breaking';
    return narrows(from.range, to.range) ? 'breaking' : 'additive';
  }
  if (fact.kind === 'engines-changed') {
    if (!from) return 'breaking';
    if (!to) return 'additive';
    return narrows(from, to) ? 'breaking' : 'additive';
  }
  throw new Error(`unknown fact kind: ${fact.kind}`);
}

/**
 * Step kinds that take something public away (hds#445 decision 3): an export
 * removed, moved, renamed or folded into another, and what the snapshot diff
 * cannot see yet, such as a removed CSS variable or class (hds#449). Each
 * forces the breaking bump whatever its impact says, because a consumer that
 * used the thing has to change.
 */
const REMOVING_STEP_KINDS = new Set(['removed', 'moved', 'renamed', 'folded']);

/**
 * True when a step needs the breaking bump: its impact is breaking, or its
 * kind takes something public away.
 * @param {{ kind?: string, impact?: string }} step
 */
export function stepIsBreaking(step) {
  return step.impact === 'breaking' || REMOVING_STEP_KINDS.has(step.kind);
}

/** Bumps from smallest to largest; `none` is a changeset that releases nothing. */
export const BUMP_RANK = { none: 0, patch: 1, minor: 2, major: 3 };

/**
 * The bump a breaking change needs from `version`: minor below 1.0 (semver
 * treats 0.x minors as breaking), major from 1.0.
 * @returns {'minor' | 'major'}
 */
export function breakingBump(version) {
  return Number(version.split('.')[0]) === 0 ? 'minor' : 'major';
}

/**
 * The semver bump from `previous` to `version`.
 * @returns {'major' | 'minor' | 'patch'}
 */
export function bumpBetween(previous, version) {
  if (compareVersions(version, previous) !== 1) {
    throw new Error(`${version} is not a release after ${previous}`);
  }
  const [a, b] = [previous, version].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  if (a[0] !== b[0]) return 'major';
  if (a[1] !== b[1]) return 'minor';
  return 'patch';
}

/**
 * `CHANGELOG.md:<line>` for the one line of `version`'s section holding
 * `needle`, numbered as the file read when `version` shipped. `changeset
 * version` writes each release's section at the top (its heading on line 3)
 * and never edits it again, so the line a release's ledger cites stays true
 * however many sections later releases add above it.
 *
 * @param {string} changelog the current CHANGELOG.md text
 * @param {string} version
 * @param {string} needle text unique within that section
 */
export function changelogSource(changelog, version, needle) {
  const lines = changelog.split('\n');
  const heading = lines.indexOf(`## ${version}`);
  if (heading === -1) throw new Error(`CHANGELOG.md has no "## ${version}" section`);
  let end = lines.findIndex((line, i) => i > heading && line.startsWith('## '));
  if (end === -1) end = lines.length;
  const hits = [];
  for (let i = heading + 1; i < end; i++) if (lines[i].includes(needle)) hits.push(i);
  if (hits.length === 0) throw new Error(`"${needle}" is not in CHANGELOG.md's ${version} section`);
  if (hits.length > 1) {
    throw new Error(`"${needle}" matches more than one line of CHANGELOG.md's ${version} section`);
  }
  return `CHANGELOG.md:${hits[0] - heading + 3}`;
}

/**
 * The facts that need a step and that no step lists in `facts`.
 * @param {{ id: string, kind: string }[]} facts
 * @param {{ facts?: string[] }[]} steps
 */
export function uncoveredFacts(facts, steps) {
  const covered = new Set(steps.flatMap((step) => step.facts ?? []));
  return facts.filter((fact) => !ADDITIVE_FACTS.has(fact.kind) && !covered.has(fact.id));
}

function compareSteps(a, b) {
  const byKind = STEP_KINDS.indexOf(a.kind) - STEP_KINDS.indexOf(b.kind);
  if (byKind !== 0) return byKind;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * A validated ledger: steps sorted by kind, then id; fields in schema order.
 * Throws with every schema problem, by path.
 */
export function assembleRelease({ version, previous, date, summary, backfilled, steps }) {
  const result = Release.safeParse({
    version,
    date,
    bump: bumpBetween(previous, version),
    summary,
    backfilled,
    steps: [...steps].sort(compareSteps),
  });
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(
      `the ${version} ledger does not fit upgrade/schema.json:\n${problems.join('\n')}`,
    );
  }
  return result.data;
}
