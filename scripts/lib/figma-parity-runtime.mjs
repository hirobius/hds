/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The parity read: what the two read-only use_figma scripts of
 * `pnpm figma:parity --emit-read` run inside Figma (scripts/lib/figma-parity.mjs
 * builds them, scripts/check-figma-parity.mjs compares the results with code).
 *
 *   hdsParityVariables   one hash per variable collection, text styles and effect
 *                        styles, built from the same per-record hashes as
 *                        snapshot-diff.js (hdsDiffIndex). The gate computes the same
 *                        hashes from the committed figma/snapshot.json, so "the live
 *                        library still is the snapshot" is one small result, not 165 KB.
 *   hdsParityComponents  every component and component set of the file, page by
 *                        page: property definitions (name, type, default, options),
 *                        variant count, and the library components its default
 *                        variant nests. A use_figma result holds about 20 KB, so the
 *                        read is split into `parts` by page index.
 *
 * Both only read. Rules (as figma-snapshot-diff.mjs): top level holds only
 * `export function` / `export async function` plus imports; no module-level
 * constants; ES2020; text literals on one line.
 */

import { hdsChecksum } from './figma-runtime.mjs';
import { hdsAgentReadState } from './figma-agent-runtime.mjs';
import { hdsDiffIndex, hdsDiffTopHash } from './figma-snapshot-diff.mjs';

/** One hash per collection and style list of `state`, from its per-record hashes. */
export function hdsParityDigest(state) {
  const index = hdsDiffIndex(state);
  const styles = (kind) => ({
    count: state[kind].length,
    hash: hdsChecksum(state[kind].map((s) => index[s.id].hash).join('')),
  });
  return {
    top: hdsDiffTopHash(state),
    collections: state.collections.map((c) => ({
      id: c.id,
      name: c.name,
      modes: c.modes.length,
      variables: c.variables.length,
      hash: hdsChecksum(index[c.id].hash + c.variables.map((v) => index[v.id].hash).join('')),
    })),
    textStyles: styles('textStyles'),
    effectStyles: styles('effectStyles'),
  };
}

/** The variables half of the parity read. `file` is the committed snapshot's `file`. */
export async function hdsParityVariables(figma, file) {
  const state = await hdsAgentReadState(figma, file);
  const digest = hdsParityDigest(state);
  digest.format = 'parity-variables';
  digest.file = figma.fileKey;
  digest.takenAt = state.takenAt;
  return digest;
}

/** One component or component set as a parity row. `detail` is false on archive pages and for icons. */
export async function hdsParityRow(node, detail) {
  const row = { id: node.id, name: node.name, type: node.type === 'COMPONENT_SET' ? 'SET' : 'ONE' };
  if (node.type === 'COMPONENT_SET') row.variants = node.children.length;
  if (!detail) return row;
  const defs = node.componentPropertyDefinitions;
  row.props = Object.keys(defs).map((key) => {
    const def = defs[key];
    const prop = [key.replace(/#\d+:\d+$/, ''), def.type, def.defaultValue];
    if (def.variantOptions) prop.push(def.variantOptions);
    return prop;
  });
  const root = node.type === 'COMPONENT_SET' ? node.defaultVariant : node;
  const nested = {};
  const instances = root ? root.findAllWithCriteria({ types: ['INSTANCE'] }) : [];
  for (const instance of instances) {
    if (instance.id.charAt(0) === 'I') continue;
    const main = await instance.getMainComponentAsync();
    if (!main) continue;
    const owner = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : main;
    nested[owner.name.indexOf('Icon/') === 0 ? 'Icon' : owner.name] = true;
  }
  row.nests = Object.keys(nested).sort();
  return row;
}

/**
 * The components half of the parity read: pages whose index is `part` modulo
 * `parts`. Returns `{ tooLarge }` instead of a result over `maxChars`, so the
 * caller asks for more parts and nothing is cut short.
 */
export async function hdsParityComponents(figma, part, parts, maxChars) {
  const pages = [];
  for (let i = 0; i < figma.root.children.length; i++) {
    if (i % parts !== part) continue;
    const page = figma.root.children[i];
    await page.loadAsync();
    const plain = /^(Archive|Deprecated|Icon$)/.test(page.name);
    const rows = [];
    const nodes = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
    for (const node of nodes) {
      if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET')
        continue;
      rows.push(await hdsParityRow(node, !plain && node.name.charAt(0) !== '_'));
    }
    pages.push({ id: page.id, name: page.name, index: i, components: rows });
  }
  const result = {
    format: 'parity-components',
    file: figma.fileKey,
    part: part,
    parts: parts,
    pageCount: figma.root.children.length,
    pages: pages,
  };
  const chars = JSON.stringify(result).length;
  if (chars > maxChars) {
    return { format: 'parity-components', tooLarge: true, part: part, parts: parts, chars: chars };
  }
  return result;
}
