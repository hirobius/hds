/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * history.mjs — the release history the upgrade command walks (hds#450): the
 * snapshots in docs/api/releases (./snapshot.mjs) and the ledgers in
 * upgrade/releases (./schema.mjs).
 *
 * The oldest committed snapshot is the floor, the oldest version the upgrade
 * command can upgrade from (`floor` in upgrade/index.json, hds#451). Every
 * later snapshot has a ledger, and every fact between two consecutive
 * snapshots that needs a step (./ledger.mjs FACTS_NEEDING_A_STEP: an export
 * removed or moved, a dependency, peer, engine, exports key or bin) is listed
 * by a step of the newer release's ledger. So an upgrade from the floor crosses
 * no change that some step does not report.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffSnapshots } from './diff.mjs';
import { bumpBetween, uncoveredFacts } from './ledger.mjs';
import { compareVersions } from './schema.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SNAPSHOTS_DIR = join(REPO, 'docs/api/releases');
export const LEDGERS_DIR = join(REPO, 'upgrade/releases');

/** The versions with a `<version>.json` in `dir`, oldest first. */
export function releaseVersions(dir = SNAPSHOTS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.json$/.test(file))
    .map((file) => file.slice(0, -'.json'.length))
    .sort(compareVersions);
}

/** The oldest version the upgrade command can upgrade from: the oldest committed snapshot. */
export function floor(snapshotsDir = SNAPSHOTS_DIR) {
  const [oldest] = releaseVersions(snapshotsDir);
  if (!oldest) throw new Error(`${snapshotsDir} holds no release snapshot`);
  return oldest;
}

const readJson = (dir, version) => JSON.parse(readFileSync(join(dir, `${version}.json`), 'utf8'));

/**
 * Everything wrong with the history, one line each, prefixed with the
 * release: a release with a snapshot and no ledger (or the reverse), a ledger
 * whose bump is not the one between the two snapshots, a fact that needs a
 * step and has none, and a step listing a fact the diff does not have.
 *
 * @param {{ snapshotsDir?: string, ledgersDir?: string }} [dirs]
 * @returns {string[]}
 */
export function historyProblems({ snapshotsDir = SNAPSHOTS_DIR, ledgersDir = LEDGERS_DIR } = {}) {
  const snapshots = releaseVersions(snapshotsDir);
  const ledgers = new Set(releaseVersions(ledgersDir));
  const problems = [];

  for (let i = 1; i < snapshots.length; i++) {
    const [previous, version] = [snapshots[i - 1], snapshots[i]];
    if (!ledgers.has(version)) {
      problems.push(
        `${version}: docs/api/releases/${version}.json has no ledger upgrade/releases/${version}.json`,
      );
      continue;
    }
    const ledger = readJson(ledgersDir, version);
    const bump = bumpBetween(previous, version);
    if (ledger.bump !== bump) {
      problems.push(
        `${version}: bump is ${ledger.bump}, but ${previous} -> ${version} is a ${bump}`,
      );
    }
    const facts = diffSnapshots(readJson(snapshotsDir, previous), readJson(snapshotsDir, version));
    for (const fact of uncoveredFacts(facts, ledger.steps)) {
      problems.push(
        `${version}: ${fact.id} (${previous} -> ${version}) has no step in upgrade/releases/${version}.json`,
      );
    }
    const known = new Set(facts.map((fact) => fact.id));
    for (const step of ledger.steps) {
      for (const id of step.facts ?? []) {
        if (!known.has(id)) {
          problems.push(
            `${version}: step ${step.id} lists ${id}, which is not in the ${previous} -> ${version} diff`,
          );
        }
      }
    }
  }

  const covered = new Set(snapshots.slice(1));
  for (const version of ledgers) {
    if (covered.has(version)) continue;
    problems.push(
      snapshots.includes(version)
        ? `${version}: upgrade/releases/${version}.json is the floor's own ledger; no older snapshot is committed to diff it against`
        : `${version}: upgrade/releases/${version}.json has no snapshot docs/api/releases/${version}.json`,
    );
  }
  // Stable: within a release, problems keep the diff's order.
  return problems.sort((a, b) => compareVersions(a.split(':')[0], b.split(':')[0]));
}
