/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — rebuilds the live snapshot from the committed
 * figma/snapshot.json plus what snapshot-diff.js returned
 * (`pnpm figma:snapshot --from-diff`, scripts/lib/figma-snapshot-diff.mjs).
 * Pure; Node only. Throws, with the fix in the message, on anything it cannot
 * prove: the caller then writes nothing.
 */

import { hdsChecksum, hdsByName } from './figma-runtime.mjs';

const copy = (value) => JSON.parse(JSON.stringify(value));

/**
 * @param {{ diff: object, base: { checksum: string, snapshot: object }, libraryFileKey: string }} input
 * @returns {{ checksum: string, snapshot: object }}
 */
export function rebuildFromDiff({ diff, base, libraryFileKey }) {
  if (diff?.format !== 'snapshot-diff') {
    throw new Error(
      'This is not a snapshot-diff result: save, unedited, what use_figma returned for figma/push/use-figma/snapshot-diff.js.',
    );
  }
  if (diff.file !== libraryFileKey) {
    throw new Error(
      `The diff was taken in ${diff.file}, which is not the HDS library (${libraryFileKey}). Run snapshot-diff.js on the library.`,
    );
  }
  if (diff.tooLarge) {
    throw new Error(
      `snapshot-diff.js found too much change to return (${diff.chars} characters, ${diff.records} records). It does not page. ${diff.next}`,
    );
  }
  if (diff.base !== base.checksum) {
    throw new Error(
      `The diff was taken against figma/snapshot.json ${diff.base}, but the committed figma/snapshot.json is ${base.checksum}. Run pnpm figma:push so snapshot-diff.js carries the committed snapshot, run it again, and save the new result.`,
    );
  }
  const gone = new Set(diff.removed);
  const moved = new Set(diff.changed.variables.map((e) => e.v.id));
  const snapshot = copy(base.snapshot);

  const heads = new Map(diff.changed.collections.map((c) => [c.id, c]));
  const kept = new Map(snapshot.collections.filter((c) => !gone.has(c.id)).map((c) => [c.id, c]));
  heads.forEach((head, id) => {
    const had = kept.get(id);
    kept.set(id, Object.assign({}, copy(head), { variables: had ? had.variables : [] }));
  });
  const missing = diff.collectionOrder.filter((id) => !kept.has(id));
  if (missing.length) {
    throw new Error(
      `The diff orders collection(s) it does not describe (${missing.join(', ')}): it is incomplete. Run snapshot-diff.js again and save the whole result.`,
    );
  }
  snapshot.collections = diff.collectionOrder.map((id) => kept.get(id));
  snapshot.collections.forEach((c) => {
    c.variables = c.variables.filter((v) => !gone.has(v.id) && !moved.has(v.id));
  });
  diff.changed.variables.forEach((entry) => {
    const home = snapshot.collections.find((c) => c.id === entry.c);
    if (!home) {
      throw new Error(
        `The diff puts variable ${entry.v.id} in collection ${entry.c}, which it does not describe. Run snapshot-diff.js again.`,
      );
    }
    home.variables.push(copy(entry.v));
  });
  snapshot.collections.forEach((c) => c.variables.sort(hdsByName));

  ['textStyles', 'effectStyles'].forEach((kind) => {
    const replaced = new Set(diff.changed[kind].map((s) => s.id));
    snapshot[kind] = snapshot[kind]
      .filter((s) => !gone.has(s.id) && !replaced.has(s.id))
      .concat(copy(diff.changed[kind]))
      .sort(hdsByName);
  });

  Object.assign(snapshot, copy(diff.top || {}), { takenAt: diff.takenAt });
  const checksum = hdsChecksum(JSON.stringify(snapshot));
  if (checksum !== diff.live) {
    throw new Error(
      `The rebuilt snapshot (${checksum}) does not match the live library (${diff.live}): the diff was edited or copied incompletely, or the library changed in a way snapshot-diff.js cannot carry. Nothing was written. Run snapshot-diff.js again; if it still does not match, collect the snapshot with the Sync plugin and use pnpm figma:snapshot --ingest.`,
    );
  }
  return { checksum, snapshot };
}
