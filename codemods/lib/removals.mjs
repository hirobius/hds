/**
 * removals — what the shipped upgrade ledgers say a release took away, for the
 * codemods' reports (hds#956). Version text in a report comes from here, the
 * step that records the change, never from a literal in a codemod.
 *
 *   removalsFor('hds-patterns-subpath')
 *   → { names: Map { 'Calendar' => '0.20.0', … }, entries: ['@hirobius/design-system', '…/patterns'] }
 *   removedIn('TileGrid') → '0.20.0'
 *
 * Node builtins only; the record is read once per process.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRecord } from './record.mjs';
import { isVersion } from './semver.mjs';

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Step kinds that take a name away with nowhere for a codemod to move it. */
const GONE = new Set(['removed', 'folded']);

let shipped;
/** Every step the package ships, from its upgrade record. A broken record throws. */
export function shippedSteps(pkgDir = PKG_DIR) {
  if (pkgDir !== PKG_DIR) return loadRecord(pkgDir).ledgers.flatMap((l) => l.steps ?? []);
  shipped ??= loadRecord(PKG_DIR).ledgers.flatMap((l) => l.steps ?? []);
  return shipped;
}

/** The release a step belongs to: the head of its id (`0.20.0/removed/X`). */
export const stepVersion = (step) => {
  const head = step.id.split('/')[0];
  return isVersion(head) ? head : undefined;
};

/** The names a step's `detect.imports` lists, with the entry each is imported from. */
const imported = (step) =>
  (step.detect?.imports ?? []).flatMap((i) => i.names.map((name) => ({ name, from: i.from })));

/**
 * What the releases a codemod works on took away: each name a removed or
 * folded step lists, with its release, and every entry the codemod's own steps
 * and those removals import from. The releases are the ones holding a step
 * whose `auto.codemod` is `bin`.
 * @param {string} bin
 * @param {object[]} [steps] the steps to read (default: every shipped step)
 * @returns {{ names: Map<string, string>, entries: string[] }}
 */
export function removalsFor(bin, steps = shippedSteps()) {
  const releases = new Set(
    steps
      .filter((s) => s.auto?.codemod === bin)
      .map(stepVersion)
      .filter(Boolean),
  );
  const names = new Map();
  const entries = new Set();
  for (const s of steps) {
    const version = stepVersion(s);
    if (!releases.has(version)) continue;
    const gone = GONE.has(s.kind);
    if (!gone && s.auto?.codemod !== bin) continue;
    for (const { name, from } of imported(s)) {
      entries.add(from);
      if (gone && !names.has(name)) names.set(name, version);
    }
  }
  return { names, entries: [...entries] };
}

/**
 * The release that removed or folded `name`, from the first such step, or
 * undefined when no shipped step records it.
 */
export function removedIn(name, steps = shippedSteps()) {
  const step = steps.find((s) => GONE.has(s.kind) && imported(s).some((i) => i.name === name));
  return step && stepVersion(step);
}

/** `removed in <version>`, or `removed` when no step names the release. */
export const removedText = (version) => (version ? `removed in ${version}` : 'removed');
