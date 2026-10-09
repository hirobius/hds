/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the snapshot-diff codec: what
 * figma/push/use-figma/snapshot-diff.js runs inside Figma, and the
 * fingerprint it carries (`pnpm figma:push` writes it; `pnpm figma:snapshot
 * --from-diff` rebuilds with scripts/lib/figma-diff-rebuild.mjs).
 *
 * snapshot.js returns the whole library state (about 165 KB); a use_figma
 * result holds about 20 KB. So snapshot-diff.js carries a fingerprint of the
 * committed figma/snapshot.json (its checksum and one 32-bit FNV-1a hash per
 * record, keyed by id) and returns only the records of the live library whose
 * hash differs, the ids that are gone, and the top-level fields that changed.
 *
 * A record is a collection without its variables, a variable (hashed with its
 * collection's id, so a variable moved to another collection is changed), a
 * text style or an effect style; the top-level fields are schemaVersion, file
 * and lastPush. takenAt is never fingerprinted: it is the one field that
 * differs on every read, so the result carries the live read's own takenAt
 * and `live` is the checksum of the snapshot stamped with it. The rebuild
 * stamps the same value, so the two checksums agree by construction and a
 * mismatch means a real difference.
 *
 * Reads go through hdsAgentReadState (figma-agent-runtime.mjs), exactly as
 * delta.js reads: descriptions decoded, `file` the committed snapshot's.
 *
 * Rules (scripts/__tests__/figma-snapshot-diff.test.mjs): top level holds only
 * `export function` / `export async function` plus imports; no module-level
 * constants; ES2020.
 */

import { hdsChecksum } from './figma-runtime.mjs';
import { hdsAgentReadState } from './figma-agent-runtime.mjs';

/** The top-level fields a diff compares; `takenAt` is carried on its own. */
export function hdsDiffTopFields() {
  return ['schemaVersion', 'file', 'lastPush'];
}

/** Hash of the top-level fields of `snapshot`. */
export function hdsDiffTopHash(snapshot) {
  return hdsChecksum(JSON.stringify(hdsDiffTopFields().map((field) => snapshot[field])));
}

/**
 * Every record of `snapshot` by id: `{ hash, kind, record, c }`, where `c` is
 * a variable's collection id and `record` a collection without `variables`.
 */
export function hdsDiffIndex(snapshot) {
  const index = {};
  snapshot.collections.forEach((c) => {
    const head = Object.assign({}, c);
    delete head.variables;
    index[c.id] = { hash: hdsChecksum(JSON.stringify(head)), kind: 'collections', record: head };
    c.variables.forEach((v) => {
      index[v.id] = {
        hash: hdsChecksum(c.id + JSON.stringify(v)),
        kind: 'variables',
        record: v,
        c: c.id,
      };
    });
  });
  ['textStyles', 'effectStyles'].forEach((kind) =>
    snapshot[kind].forEach((s) => {
      index[s.id] = { hash: hdsChecksum(JSON.stringify(s)), kind: kind, record: s };
    }),
  );
  return index;
}

/** The fingerprint snapshot-diff.js embeds for a committed snapshot file `{ checksum, snapshot }`. */
export function hdsDiffFingerprint(file) {
  const ids = {};
  const index = hdsDiffIndex(file.snapshot);
  Object.keys(index).forEach((id) => (ids[id] = index[id].hash));
  return {
    base: file.checksum,
    file: file.snapshot.file,
    top: hdsDiffTopHash(file.snapshot),
    ids: ids,
  };
}

/**
 * What snapshot-diff.js returns. `fingerprint` is the embedded one and
 * `fingerprintSum` its checksum (an agent retypes the script, so a slip in the
 * ~400 hashes is caught here, before anything is read); `maxChars` is the
 * largest result a use_figma call hands back (15,000 here, as receipt pages).
 * Read only: no write function is reachable from here.
 */
export async function hdsSnapshotDiff(figma, fingerprint, fingerprintSum, maxChars) {
  if (hdsChecksum(JSON.stringify(fingerprint)) !== fingerprintSum) {
    throw new Error(
      'Refused: the fingerprint of figma/snapshot.json does not match its checksum: snapshot-diff.js changed after pnpm figma:push wrote it (a copy or transcription error). Regenerate it and pass it unmodified. Nothing was read.',
    );
  }
  const state = await hdsAgentReadState(figma, fingerprint.file);
  const live = hdsChecksum(JSON.stringify(state));
  const index = hdsDiffIndex(state);
  const changed = { collections: [], variables: [], textStyles: [], effectStyles: [] };
  Object.keys(index).forEach((id) => {
    const entry = index[id];
    if (fingerprint.ids[id] === entry.hash) return;
    changed[entry.kind].push(
      entry.kind === 'variables' ? { c: entry.c, v: entry.record } : entry.record,
    );
  });
  const result = {
    format: 'snapshot-diff',
    file: figma.fileKey,
    base: fingerprint.base,
    live: live,
    takenAt: state.takenAt,
    collectionOrder: state.collections.map((c) => c.id),
    changed: changed,
    removed: Object.keys(fingerprint.ids).filter((id) => !(id in index)),
  };
  if (hdsDiffTopHash(state) !== fingerprint.top) {
    result.top = {};
    hdsDiffTopFields().forEach((field) => (result.top[field] = state[field]));
  }
  const chars = JSON.stringify(result).length;
  if (chars > maxChars) {
    return {
      format: 'snapshot-diff',
      tooLarge: true,
      file: figma.fileKey,
      base: fingerprint.base,
      live: live,
      chars: chars,
      records: Object.keys(index).filter((id) => fingerprint.ids[id] !== index[id].hash).length,
      next:
        'The change since figma/snapshot.json is too large for one use_figma result (' +
        chars +
        ' characters, limit ' +
        maxChars +
        '). snapshot-diff.js does not page. Collect the snapshot with the Sync plugin (Plugins > Development > HDS tokens sync > Sync, then Download JSON, or receipt.js) or run snapshot.js through a paged route, then pnpm figma:snapshot --ingest <file>.',
    };
  }
  return result;
}
