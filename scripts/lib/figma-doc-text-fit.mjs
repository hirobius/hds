/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-doc-text-fit (hds#1462): the doc sheets in the HDS Figma library
 * (Getting started and the Foundations pages, ledger 2026-11-06) were drawn
 * with fixed-width text, so the Sora swap (0.41.0) clipped captions such as
 * "Primary · Default". hdsFitDocText walks one sheet and makes every text it
 * owns fit its text:
 *   - a single-line text hugs (WIDTH_AND_HEIGHT, HUG in auto layout);
 *   - a multi-line or column-filling text keeps its width and grows in height;
 *   - an auto-layout frame on the way up with a FIXED axis hugs that axis
 *     (unless it fills its own parent) and stops clipping.
 * Instances are skipped: their text belongs to the component, not the sheet.
 * With { slots: true } the walk also enters instances (the doc sheets put their
 * content in the spec-sheet kit's Section slot) but only to apply the clip rule:
 *   - a frame that clips and is narrower (or shorter) than a text inside it
 *     stops clipping and is nudged to re-hug (Surface's "Live / Primary ·
 *     Default" frames were 110 wide around a 114-wide hugging caption).
 * It returns the changes; a second run returns [].
 *
 * docTextFitScript(ids) builds the use_figma script that runs it on the named
 * sheets (fonts loaded first, as the Plugin API requires for text layout).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { guardPrelude } from './figma-deprecated-styles.mjs';

const readTokens = () =>
  JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'hirobius.tokens.json'),
      'utf8',
    ),
  );

export function hdsFitDocText(root, options = {}) {
  const slots = Boolean(options.slots);
  const changes = [];
  const touchedFrames = new Set();
  const isAuto = (n) => n && n.layoutMode && n.layoutMode !== 'NONE';

  function fitFrame(f) {
    if (!f || f.type !== 'FRAME' || touchedFrames.has(f)) return;
    touchedFrames.add(f);
    if (!isAuto(f)) return;
    const before = `${f.primaryAxisSizingMode}/${f.counterAxisSizingMode}/${f.clipsContent}`;
    const horizontal = f.layoutMode === 'HORIZONTAL';
    const fillsW = f.layoutSizingHorizontal === 'FILL';
    const fillsH = f.layoutSizingVertical === 'FILL';
    const primaryFills = horizontal ? fillsW : fillsH;
    const counterFills = horizontal ? fillsH : fillsW;
    if (f.primaryAxisSizingMode === 'FIXED' && !primaryFills) f.primaryAxisSizingMode = 'AUTO';
    if (f.counterAxisSizingMode === 'FIXED' && !counterFills) f.counterAxisSizingMode = 'AUTO';
    if (f.clipsContent) f.clipsContent = false;
    const after = `${f.primaryAxisSizingMode}/${f.counterAxisSizingMode}/${f.clipsContent}`;
    if (after !== before) changes.push({ id: f.id, kind: 'frame', before, after });
  }

  function fitText(t, parent, ancestors) {
    const multiLine = /\n/.test(t.characters) || t.layoutSizingHorizontal === 'FILL';
    const want = multiLine ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
    if (t.textAutoResize === want) return;
    const before = t.textAutoResize;
    t.textAutoResize = want;
    if (!multiLine && isAuto(parent)) t.layoutSizingHorizontal = 'HUG';
    changes.push({ id: t.id, kind: 'text', before, after: want, characters: t.characters });
    // The sheet itself is root: it keeps its width; frames between it and the text hug.
    for (const a of ancestors) if (a !== root) fitFrame(a);
  }

  const box = (n) =>
    n.absoluteBoundingBox ?? { x: 0, y: 0, width: n.width ?? 0, height: n.height ?? 0 };
  function unclip(t, ancestors) {
    const tb = box(t);
    const relative = !t.absoluteBoundingBox; // plain objects in tests: compare sizes only
    for (const a of ancestors) {
      if (a === root || !a.clipsContent) continue;
      const b = box(a);
      const outside = relative
        ? tb.width > b.width + 0.5 || tb.height > b.height + 0.5
        : tb.x < b.x - 0.5 ||
          tb.y < b.y - 0.5 ||
          tb.x + tb.width > b.x + b.width + 0.5 ||
          tb.y + tb.height > b.y + b.height + 0.5;
      if (!outside) continue;
      a.clipsContent = false;
      // Re-run hug: a frame laid out before the font swap keeps its old size until relaid.
      for (const axis of ['primaryAxisSizingMode', 'counterAxisSizingMode']) {
        if (a[axis] === 'AUTO') {
          a[axis] = 'FIXED';
          a[axis] = 'AUTO';
        }
      }
      changes.push({ id: a.id, kind: 'unclip', text: t.id });
    }
  }

  function walk(node, ancestors, inInstance) {
    if (node.type === 'INSTANCE') {
      if (!slots) return;
      inInstance = true;
    }
    if (node.type === 'TEXT') {
      if (!inInstance) fitText(node, ancestors[ancestors.length - 1], ancestors);
      unclip(node, ancestors);
      return;
    }
    for (const child of node.children ?? []) walk(child, [...ancestors, node], inInstance);
  }
  walk(root, [], false);
  return changes;
}

/**
 * docTextFitScript never applies a text style, but it carries the shared guard
 * (lib/figma-deprecated-styles, hds#483): any edit added to it applies styles
 * through hdsApplyTextStyle, which refuses a deprecated one in Figma.
 */
export function docTextFitScript(sheetIds, tree = readTokens()) {
  return `${guardPrelude(tree)}${hdsFitDocText.toString()}
const ids = ${JSON.stringify(sheetIds)};
const out = {};
for (const id of ids) {
  const sheet = await figma.getNodeByIdAsync(id);
  if (!sheet) { out[id] = 'missing'; continue; }
  const texts = sheet.findAllWithCriteria({ types: ['TEXT'] });
  const fonts = new Map();
  for (const t of texts) {
    if (!t.characters.length) continue;
    for (const f of t.getRangeAllFontNames(0, t.characters.length)) fonts.set(f.family + '|' + f.style, f);
  }
  await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
  out[id] = hdsFitDocText(sheet, { slots: true });
}
return out;
`;
}
