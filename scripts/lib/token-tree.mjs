/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Pure token-tree primitives: walk a DTCG token tree, parse and resolve
 * `{a.b.c}` aliases. No fs, no process, no imports — safe to import from any
 * script or test without side effects (hds#645).
 */

/** DTCG meta keys that are never child groups/tokens. */
export const DTCG_KEYS = new Set([
  '$type',
  '$value',
  '$description',
  '$extensions',
  '$schema',
  '$deprecated',
]);

const ALIAS_RE = /^\{([^}]+)\}$/;

/** '{a.b.c}' → 'a.b.c'; anything that is not a whole-string alias → null. */
export function parseAlias(value) {
  if (typeof value !== 'string') return null;
  const m = ALIAS_RE.exec(value);
  return m ? m[1] : null;
}

/** A leaf token is an object that carries `$value`. */
export const isLeaf = (node) => !!node && typeof node === 'object' && '$value' in node;

/**
 * Generator over every node of a token tree, pre-order (groups before their
 * children). Yields `{ path, node, type, isLeaf }` where `type` is the nearest
 * ancestor-or-self `$type`.
 *
 * @param {object} node
 * @param {object} [opts]
 * @param {string[]} [opts.path]            path of `node` (default root)
 * @param {string|null} [opts.inheritedType]
 * @param {(key: string) => boolean} [opts.skipKey]  child keys to ignore (default: DTCG meta keys)
 * @param {(entry: object) => boolean} [opts.prune]  true → entry is yielded but not descended into
 */
export function* walkNodes(node, opts = {}) {
  const { path = [], inheritedType = null, skipKey = (k) => DTCG_KEYS.has(k), prune } = opts;
  if (!node || typeof node !== 'object') return;
  const type = node.$type || inheritedType;
  const entry = { path, node, type, isLeaf: '$value' in node };
  yield entry;
  if (entry.isLeaf || prune?.(entry)) return;
  for (const key of Object.keys(node)) {
    if (skipKey(key)) continue;
    yield* walkNodes(node[key], { path: [...path, key], inheritedType: type, skipKey, prune });
  }
}

/**
 * Generator: walks the token tree yielding leaf token descriptors.
 * Handles group-level $type inheritance (nearest ancestor wins).
 */
export function* walkTokens(node, path = [], inheritedType = null) {
  for (const e of walkNodes(node, { path, inheritedType })) {
    if (!e.isLeaf) continue;
    yield {
      path: e.path,
      type: e.type,
      value: e.node.$value,
      extensions: e.node.$extensions,
      description: e.node.$description,
      deprecated: e.node.$deprecated,
    };
  }
}

/**
 * Recursively resolves a {ref} alias to its raw $value. Non-alias input is
 * returned unchanged. Throws on cycles, missing tokens, non-leaf targets, and
 * (when given) chains deeper than `maxDepth`.
 *
 * @param {unknown} ref
 * @param {object} root
 * @param {{ maxDepth?: number }} [opts]
 */
export function resolveAlias(ref, root, { maxDepth = Infinity } = {}) {
  const visited = new Set();
  let current = ref;
  while (typeof current === 'string' && current.startsWith('{')) {
    if (visited.has(current)) throw new Error(`Circular reference: ${current}`);
    if (visited.size >= maxDepth) throw new Error(`Alias chain deeper than ${maxDepth}: ${ref}`);
    visited.add(current);
    let node = root;
    for (const p of current.replace(/^\{|\}$/g, '').split('.')) {
      node = node?.[p];
      if (node === undefined) throw new Error(`Token not found: ${current}`);
    }
    if (!('$value' in node)) throw new Error(`Not a leaf token: ${current}`);
    current = node.$value;
  }
  return current;
}
