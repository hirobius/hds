/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * docs-type-ramp — the pure half of check-docs-type-ramp (hds#1496).
 *
 * The ramp is read from hirobius.tokens.json (the source), never hand-copied, so a
 * retuned role moves the gate with it. A text element is on the ramp when its computed
 * font-family (first family), font-size, font-weight and line-height all equal one role.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Roles the docs site may render. `uiItalic` is `ui` plus font-style, so it needs no row of its own. */
export const RAMP_ROLES = [
  'display',
  'title',
  'titleSm',
  'body',
  'bodyStrong',
  'ui',
  'uiRegular',
  'caption',
  'mono',
];

const EPS = 0.01;

function resolveRef(tokens, value) {
  let v = value;
  for (let i = 0; i < 8 && typeof v === 'string' && /^\{.*\}$/.test(v); i++) {
    let node = tokens;
    for (const part of v.slice(1, -1).split('.')) node = node?.[part];
    v = node?.$value;
  }
  return v;
}

const px = (d) => (d && typeof d === 'object' ? (d.unit === 'rem' ? d.value * 16 : d.value) : d);

/** { role: { family, size, sizeMin?, weight, lineHeight } } from the token file. */
export function loadRamp(tokensPath = path.join(ROOT, 'hirobius.tokens.json')) {
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  const ramp = {};
  for (const role of RAMP_ROLES) {
    const v = tokens.semantic.typography[role]?.$value;
    if (!v) throw new Error(`semantic.typography.${role} is missing from the token file`);
    const family = resolveRef(tokens, v.fontFamily);
    ramp[role] = {
      family: String(Array.isArray(family) ? family[0] : family).toLowerCase(),
      size: Number(px(resolveRef(tokens, v.fontSize))),
      sizeMin: v.fontSizeMin ? Number(px(resolveRef(tokens, v.fontSizeMin))) : undefined,
      weight: Number(resolveRef(tokens, v.fontWeight)),
      lineHeight: Number(resolveRef(tokens, v.lineHeight)),
    };
  }
  return ramp;
}

/**
 * The docs site loads the Sora file through next/font/local (app/layout.tsx), which names the
 * face `sans` ahead of the token family. `sans` is not a CSS generic (`sans-serif` is), so it
 * can only be that face: read it as Sora.
 */
const FACE_ALIASES = { sans: 'sora' };

/** First family of a computed font-family list, lowercased, unquoted, next/font alias resolved. */
export function firstFamily(list) {
  const first = String(list ?? '')
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
  return FACE_ALIASES[first] ?? first;
}

/**
 * The role a computed style matches, or null. `lineHeight` is the computed px
 * (or "normal"); the ratio to font-size must equal the role's unitless value.
 * Display may sit between its fluid floor (fontSizeMin) and its size: the fluid
 * opt-in documented in DESIGN.md.
 */
export function matchRole(style, ramp) {
  const size = parseFloat(style.fontSize);
  const lh = parseFloat(style.lineHeight);
  if (!Number.isFinite(size) || !Number.isFinite(lh)) return null;
  const family = firstFamily(style.family ?? style.fontFamily);
  const weight = Number(style.fontWeight);
  for (const [role, r] of Object.entries(ramp)) {
    const sizeOk =
      Math.abs(size - r.size) < EPS ||
      (role === 'display' && r.sizeMin && size >= r.sizeMin - EPS && size <= r.size + EPS);
    if (
      sizeOk &&
      family === r.family &&
      weight === r.weight &&
      Math.abs(lh / size - r.lineHeight) < EPS
    )
      return role;
  }
  return null;
}

/** Group offenders by selector + values, keeping a count and one sample text. */
export function groupGaps(gaps) {
  const map = new Map();
  for (const g of gaps) {
    const key = `${g.selector}|${g.family}|${g.fontSize}|${g.fontWeight}|${g.lineHeight}`;
    const hit = map.get(key);
    if (hit) hit.count += 1;
    else map.set(key, { ...g, count: 1 });
  }
  return [...map.values()];
}

export const describeStyle = (g) =>
  `${firstFamily(g.family)} ${g.fontSize}/${g.lineHeight} ${g.fontWeight}`;
