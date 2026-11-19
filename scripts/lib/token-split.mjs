/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Splits the DTCG token tree into values and descriptions (budget, hds tokens JSON graph).
 * `tokens` from /tokens ships the values; `tokenDescriptions` from /tokens/descriptions
 * ships every `$description` keyed by its dot path ('' for the root). `joinDescriptions`
 * puts them back, and the parity test pins that the join equals hirobius.tokens.json.
 */

/** A copy of `tree` with every `$description` removed. */
export function stripDescriptions(tree) {
  if (Array.isArray(tree)) return tree.map(stripDescriptions);
  if (tree === null || typeof tree !== 'object') return tree;
  const out = {};
  for (const [key, value] of Object.entries(tree)) {
    if (key === '$description') continue;
    // $extensions, $value and the rest are kept as they are, as collectDescriptions skips them.
    out[key] = key.startsWith('$') ? value : stripDescriptions(value);
  }
  return out;
}

/** Every `$description` in `tree`, keyed by the dot path of the node that holds it. */
export function collectDescriptions(tree, path = [], out = {}) {
  if (tree === null || typeof tree !== 'object' || Array.isArray(tree)) return out;
  for (const [key, value] of Object.entries(tree)) {
    if (key === '$description') out[path.join('.')] = value;
    else if (!key.startsWith('$')) collectDescriptions(value, [...path, key], out);
  }
  return out;
}

/** The inverse of the split: values with each description put back at its path. */
export function joinDescriptions(values, descriptions) {
  const out = structuredClone(values);
  for (const [path, text] of Object.entries(descriptions)) {
    let node = out;
    for (const key of path ? path.split('.') : []) node = node?.[key];
    if (!node || typeof node !== 'object') throw new Error(`no token node at "${path}"`);
    node.$description = text;
  }
  return out;
}
