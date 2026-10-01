/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the snapshot delta codec (hds#417, hds#397 C2).
 *
 * After a verified Sync the plugin writes the snapshot it took into the file
 * as receipt pages, so an agent can collect it without a Download. The pages
 * hold `snapshotDelta(base, post)`: what changed from the committed
 * figma/snapshot.json (the sync bundle's `base`) to the snapshot the Sync
 * took. `pnpm figma:snapshot --from-receipt` rebuilds the snapshot with
 * `applySnapshotDelta(base, delta)` and checks it against the plugin's
 * `post` checksum, so the round trip is byte-identical or it is refused.
 *
 * A delta is keyed by id (variables, collections and styles keep their ids):
 *   { top?:          { field: value }          changed top-level fields (takenAt, lastPush, file)
 *     collections?:  List                      collection headers; a new or reshaped one whole
 *     variables?:    { collectionId: List }    per collection that is in both
 *     textStyles?:   List
 *     effectStyles?: List }
 *   List = { set?: { id: record }, put?: { id: { field: value } }, del?: [id], order?: [id] }
 * `set` is a new record (or one whose fields changed shape), `put` only the
 * fields that changed. Both leave out what the rebuild derives: a `set`
 * record's `id` (its key), and an alias's `to` ("Collection: name" of its
 * target, as hdsReadState writes it) wherever the post state gives exactly
 * that. Variables and styles come back sorted by name, as
 * hdsReadState reads them, and collections in their order, new ones last;
 * `order` is written only where that would not give the post order. Where a
 * delta cannot reproduce `post` exactly (no base, or a base that is not a
 * snapshot of the same shape), it is `{ full: post }`.
 *
 * The Sync plugin carries this file in its code.js (deltaRuntimeSource in
 * figma-scripts.mjs), so the rules of figma-sync-runtime.mjs apply: only
 * `export function` at top level plus the one import of figma-runtime.mjs,
 * no module-level constants, ES2020 (scripts/__tests__/figma-snapshot-delta.test.mjs).
 */

import { hdsByName } from './figma-runtime.mjs';

/** The snapshot's lists of records with ids. Variables live inside their collection. */
export function hdsDeltaLists() {
  return ['collections', 'textStyles', 'effectStyles'];
}

export function hdsDeltaCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Each variable id's alias label in `snapshot`: "Collection: name", as hdsReadState writes `to`. */
export function hdsDeltaNames(snapshot) {
  const names = new Map();
  snapshot.collections.forEach((c) =>
    c.variables.forEach((v) => names.set(v.id, c.name + ': ' + v.name)),
  );
  return names;
}

/** A copy of `record` without what the rebuild derives: its leading `id` (unless `keepId`), and `to` where `names` gives it. */
export function hdsDeltaSlim(record, names, keepId) {
  const out = hdsDeltaCopy(record);
  if (!keepId && Object.keys(out)[0] === 'id') delete out.id;
  if (out.variables) out.variables = out.variables.map((v) => hdsDeltaSlim(v, names, true));
  Object.values(out.valuesByMode || {}).forEach((entry) => {
    const plain = entry && Object.keys(entry).join() === 'alias,to';
    if (plain && entry.to === names.get(entry.alias)) delete entry.to;
  });
  return out;
}

/** A `set` record with its id back in front. */
export function hdsDeltaWhole(id, record) {
  return 'id' in record ? hdsDeltaCopy(record) : Object.assign({ id: id }, hdsDeltaCopy(record));
}

/**
 * The changes from `base` to `post` in one list, or null. A collection's
 * `variables` are diffed on their own (snapshotDelta). `order` is added only
 * where hdsDeltaApply would not give the post order on its own.
 */
export function hdsDeltaList(base, post, sorted, names) {
  const was = new Map(base.map((r) => [r.id, r]));
  const shape = (r) => Object.keys(r).join();
  const ids = (list) => list.map((r) => r.id).join('\n');
  const d = { set: {}, put: {}, del: base.filter((r) => !post.some((p) => p.id === r.id)) };
  d.del = d.del.map((r) => r.id);
  post.forEach((r) => {
    const old = was.get(r.id);
    if (!old || shape(old) !== shape(r)) d.set[r.id] = r;
    else {
      Object.keys(r).forEach((k) => {
        if (k === 'variables' || JSON.stringify(r[k]) === JSON.stringify(old[k])) return;
        d.put[r.id] = d.put[r.id] || {};
        d.put[r.id][k] = r[k];
      });
    }
  });
  if (ids(hdsDeltaApply(base, d, sorted, null)) !== ids(post)) d.order = post.map((r) => r.id);
  ['set', 'put'].forEach((part) =>
    Object.keys(d[part]).forEach((id) => (d[part][id] = hdsDeltaSlim(d[part][id], names, false))),
  );
  Object.keys(d).forEach((part) => Object.keys(d[part]).length || delete d[part]);
  return Object.keys(d).length ? d : null;
}

/** One list rebuilt from `base` and its List delta `d` (missing: no change); `inner` finishes each kept record. */
export function hdsDeltaApply(base, d, sorted, inner) {
  const change = d || {};
  const set = change.set || {};
  const put = change.put || {};
  const out = base
    .filter((r) => (change.del || []).indexOf(r.id) === -1)
    .map((r) => {
      if (r.id in set) return hdsDeltaWhole(r.id, set[r.id]);
      const next = Object.assign(hdsDeltaCopy(r), hdsDeltaCopy(put[r.id] || {}));
      return inner ? inner(next) : next;
    });
  Object.keys(set).forEach((id) => {
    if (!base.some((r) => r.id === id)) out.push(hdsDeltaWhole(id, set[id]));
  });
  if (change.order) return change.order.map((id) => out.find((r) => r.id === id));
  return sorted ? out.sort(hdsByName) : out;
}

/** The delta that turns `base` into `post` (both hdsReadState snapshots). Pure. */
export function snapshotDelta(base, post) {
  const full = { full: post };
  try {
    if (!base || Object.keys(base).join() !== Object.keys(post).join()) return full;
    const names = hdsDeltaNames(post);
    const delta = {};
    Object.keys(post).forEach((k) => {
      if (hdsDeltaLists().indexOf(k) !== -1) {
        const d = hdsDeltaList(base[k], post[k], k !== 'collections', names);
        if (d) delta[k] = d;
      } else if (JSON.stringify(base[k]) !== JSON.stringify(post[k])) {
        delta.top = delta.top || {};
        delta.top[k] = post[k];
      }
    });
    const replaced = (delta.collections && delta.collections.set) || {};
    post.collections.forEach((c) => {
      const old = base.collections.find((b) => b.id === c.id);
      const d = old && !(c.id in replaced) && hdsDeltaList(old.variables, c.variables, true, names);
      if (!d) return;
      delta.variables = delta.variables || {};
      delta.variables[c.id] = d;
    });
    const same = JSON.stringify(applySnapshotDelta(base, delta)) === JSON.stringify(post);
    return same ? delta : full;
  } catch (_error) {
    return full;
  }
}

/** The snapshot `delta` (from snapshotDelta) makes of `base`. Pure. */
export function applySnapshotDelta(base, delta) {
  if (delta.full) return hdsDeltaCopy(delta.full);
  const top = delta.top || {};
  const variables = delta.variables || {};
  const inner = (c) =>
    Object.assign(c, { variables: hdsDeltaApply(c.variables, variables[c.id], true, null) });
  const out = {};
  Object.keys(base).forEach((k) => {
    out[k] =
      hdsDeltaLists().indexOf(k) === -1
        ? hdsDeltaCopy(k in top ? top[k] : base[k])
        : hdsDeltaApply(base[k], delta[k], k !== 'collections', k === 'collections' && inner);
  });
  const names = hdsDeltaNames(out);
  out.collections.forEach((c) =>
    c.variables.forEach((v) =>
      Object.values(v.valuesByMode).forEach((entry) => {
        if (entry && 'alias' in entry && !('to' in entry)) entry.to = names.get(entry.alias);
      }),
    ),
  );
  return out;
}
