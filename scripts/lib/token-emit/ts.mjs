/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Token → TypeScript emitters: the generated-token*.ts trees, the deprecation
 * notes that tag their leaves, the CSSProperties augmentation and the
 * descriptions map. Pure (no fs); split out of scripts/build-tokens.mjs (hds#645).
 */

import { removeInOf } from '../token-deprecations.mjs';
import {
  ELEVATION_SLOTS,
  TYPO_OPTIONAL_KEYS,
  TYPO_PROPS,
  buildCSSVarNames,
  pathToCSSVar,
  valueToCSS,
} from './css.mjs';

// ── TypeScript tree builder ───────────────────────────────────────────────────
export function buildTSTree(tokens) {
  const root = {};
  for (const { path, type } of tokens) {
    if (type === 'typography' || type === 'transition' || type === 'motion' || type === 'elevation')
      continue;
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (!node[k]) node[k] = {};
      node = node[k];
    }
    node[path.at(-1)] = `var(${pathToCSSVar(path)})`;
  }
  return root;
}

// ── Token refs tree ───────────────────────────────────────────────────────────
/**
 * Builds a nested tree of CSS var reference strings for ALL token types,
 * including typography composites which buildTSTree skips.
 *
 * - Simple tokens → 'var(--css-var)' string leaf
 * - Typography tokens → { fontFamily: 'var(...)', fontSize: 'var(...)', ... } object
 *
 * Used to generate generated-token-refs.ts so tokens.ts never hardcodes var strings.
 */
export function buildTokenRefsTree(tokens) {
  const root = {};
  for (const { path, type, value } of tokens) {
    if (type === 'transition') continue;
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (!node[k]) node[k] = {};
      node = node[k];
    }
    if (type === 'typography') {
      const base = pathToCSSVar(path);
      const obj = {};
      for (const [suffix, key] of TYPO_PROPS) {
        // Optional keys (e.g. maxWidth) only appear in the ref tree when the
        // composite actually defines them. Composites without the key are not
        // expected to read it at runtime.
        if (TYPO_OPTIONAL_KEYS.has(key) && (!value || value[key] == null)) continue;
        obj[key] = `var(${base}-${suffix})`;
      }
      node[path.at(-1)] = obj;
    } else if (type === 'motion') {
      const base = `--hds-motion-${path[2]}`;
      node[path.at(-1)] = {
        duration: `var(${base}-duration)`,
        easing: `var(${base}-easing)`,
      };
    } else if (type === 'elevation') {
      const base = pathToCSSVar(path);
      const obj = {};
      for (const slot of ELEVATION_SLOTS) {
        obj[slot] = `var(${base}-${slot})`;
      }
      node[path.at(-1)] = obj;
    } else {
      node[path.at(-1)] = `var(${pathToCSSVar(path)})`;
    }
  }
  return root;
}

// ── Deprecation notes ─────────────────────────────────────────────────────────
/**
 * Token path → the JSDoc text for its `$deprecated` note, with the CSS var it
 * compiles to. serialize and buildCSSVarDts tag those leaves `@deprecated`,
 * so editors strike them through and autocomplete ranks them last.
 */
export function buildDeprecationNotes(tokens) {
  const notes = new Map();
  for (const { path, type, deprecated } of tokens) {
    if (!deprecated) continue;
    const text = String(deprecated).replaceAll('*/', '*\\/');
    notes.set(path.join('.'), {
      cssVar: pathToCSSVar(path),
      composite: ['typography', 'motion', 'transition', 'elevation'].includes(type),
      note: `@deprecated ${text} @removeIn ${removeInOf(deprecated)}`,
      jsdoc: `/** @deprecated ${text} @removeIn ${removeInOf(deprecated)} */`,
    });
  }
  return notes;
}

export function serialize(obj, depth = 1, notes = null, prefix = []) {
  const pad = '  '.repeat(depth);
  const lines = Object.entries(obj).map(([k, v]) => {
    const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    const note = notes?.get([...prefix, k].join('.'));
    const tag = note ? `${pad}${note.jsdoc}\n` : '';
    if (typeof v === 'string') return `${tag}${pad}${key}: ${JSON.stringify(v)}`;
    return `${tag}${pad}${key}: {\n${serialize(v, depth + 1, notes, [...prefix, k])}\n${pad}}`;
  });
  return lines.join(',\n');
}

/** The CSSProperties augmentation body: one optional prop per var, deprecated ones tagged. */
export function buildCSSVarDts(cssVarNames, notes = new Map()) {
  const byVar = new Map([...notes.values()].map((n) => [n.cssVar, n]));
  const composites = [...notes.values()].filter((n) => n.composite);
  return cssVarNames
    .map((v) => {
      // A composite's sub-vars (`-font-size`) share its note; a plain var matches exactly.
      const note = byVar.get(v) ?? composites.find((n) => v.startsWith(`${n.cssVar}-`));
      return `${note ? `    ${note.jsdoc}\n` : ''}    '${v}'?: string | undefined;`;
    })
    .join('\n');
}

// ── Raw values tree ───────────────────────────────────────────────────────────
/**
 * Builds a nested object of raw primitive values suitable for doc-page imports.
 * - fontFamily arrays are kept as arrays so callers can pick [0] for attribution text.
 * - All other types are formatted as their CSS string (same as what ends up in the var).
 * - Alias values ({ref}) are skipped — primitives should have none; if found, they're omitted.
 */
export function buildRawValuesTree(primitiveTokens, root = null) {
  const tree = {};
  for (const { path, type, value } of primitiveTokens) {
    if (type === 'typography' || type === 'transition') continue;
    if (typeof value === 'string' && value.startsWith('{')) continue;
    let node = tree;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (!node[k]) node[k] = {};
      node = node[k];
    }
    const cssVal = type === 'fontFamily' ? value : valueToCSS(value, type, false, root);
    if (cssVal != null) node[path.at(-1)] = cssVal;
  }
  return tree;
}

export function serializeRaw(obj, depth = 1) {
  const pad = '  '.repeat(depth);
  const lines = Object.entries(obj)
    .map(([k, v]) => {
      const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      if (Array.isArray(v)) {
        const items = v.map((i) => JSON.stringify(i)).join(', ');
        return `${pad}${key}: [${items}] as const`;
      }
      if (typeof v === 'string') return `${pad}${key}: ${JSON.stringify(v)}`;
      if (typeof v === 'number') return `${pad}${key}: ${v}`;
      if (typeof v === 'object' && v !== null) {
        return `${pad}${key}: {\n${serializeRaw(v, depth + 1)}\n${pad}}`;
      }
      return null;
    })
    .filter(Boolean);
  return lines.join(',\n');
}

// ── Descriptions map ──────────────────────────────────────────────────────────
/** Flat Record<dotPath, description> for all tokens that have a $description. */
function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lowerWords(value) {
  return cleanText(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function deriveFallbackDescription(path) {
  const normalized = lowerWords(path.join('.'));
  const surface = path[2] ?? path[path.length - 1] ?? 'component';

  if (normalized.startsWith('primitive.color.neutral'))
    return 'Neutral ramp step for surfaces and text.';
  if (normalized.startsWith('primitive.color.blue'))
    return 'Brand blue ramp step for accents and interactive states.';
  if (normalized.startsWith('primitive.color.red'))
    return 'Feedback red ramp step for error states.';
  if (normalized.startsWith('primitive.color.green'))
    return 'Feedback green ramp step for success states.';
  if (normalized.startsWith('primitive.color.amber'))
    return 'Feedback amber ramp step for warning states.';
  if (normalized.startsWith('primitive.color.violet'))
    return 'Feedback violet ramp step for in-progress states.';
  if (normalized.startsWith('primitive.color.lilac'))
    return 'Lilac accent ramp step for the accent-lilac tenant exemplar.';
  if (normalized.startsWith('primitive.space')) return 'Spacing step on the 4px grid.';
  if (normalized.startsWith('primitive.radius'))
    return 'Corner radius step for controls and surfaces.';
  if (normalized.startsWith('primitive.typography.family'))
    return 'Primary font family stack for interface text.';
  if (normalized.startsWith('primitive.typography.size'))
    return 'Type size step for the text scale.';
  if (normalized.startsWith('primitive.typography.weight'))
    return 'Font weight step for the type ramp.';
  if (normalized.startsWith('primitive.typography.lineheight'))
    return 'Line rhythm step for readable text.';
  if (normalized.startsWith('primitive.typography.letterspacing'))
    return 'Tracking step for the type ramp.';

  if (normalized.startsWith('semantic.color.surface'))
    return `Surface color role for the ${surface}.`;
  if (normalized.startsWith('semantic.color.content'))
    return `Content color role for the ${surface}.`;
  if (normalized.startsWith('semantic.color.border'))
    return `Border color role for the ${surface}.`;
  if (normalized.startsWith('semantic.typography')) return `Typography role for the ${surface}.`;
  if (normalized.startsWith('semantic.radius'))
    return `Interactive radius role for the ${surface}.`;

  if (normalized.includes('bghover') || normalized.includes('hover fill'))
    return `Hover-state fill for the ${surface}.`;
  if (normalized.includes('bg') || normalized.includes('fill'))
    return `Default fill for the ${surface}.`;
  if (normalized.includes('text')) return `Text color for the ${surface}.`;
  if (normalized.includes('paddingx') || normalized.includes('horizontal padding'))
    return `Horizontal inset for the ${surface}.`;
  if (normalized.includes('paddingy') || normalized.includes('vertical padding'))
    return `Vertical inset for the ${surface}.`;
  if (normalized.includes('radius')) return `Corner radius for the ${surface}.`;
  if (normalized.includes('fontsize') || normalized.includes('font size'))
    return `Type size for the ${surface}.`;
  if (normalized.includes('fontweight') || normalized.includes('font weight'))
    return `Type weight for the ${surface}.`;
  if (normalized.includes('gap')) return `Spacing between items in the ${surface}.`;
  if (normalized.includes('border')) return `Border / stroke for the ${surface}.`;
  if (normalized.includes('icon')) return `Icon slot for the ${surface}.`;
  if (normalized.includes('label')) return `Label text for the ${surface}.`;
  if (normalized.includes('size')) return `Control size for the ${surface}.`;

  return 'Design token source value.';
}

const themeRelativeDescriptionPattern =
  /\b(darken(?:s|ed)?|lighten(?:s|ed)?|brighten(?:s|ed)?|dim(?:s|med)?|darkens?|lightens?)\b/i;
const themePairPattern = /\blight\b[\s\S]*\bdark\b|\bdark\b[\s\S]*\blight\b/i;
const genericDescriptionPattern =
  /^(No token description available\.?|Primitive source value\.|Semantic role token\.|Design token source value\.|Specific value within the .* range at a defined lightness step\.|Discrete values within the .* range at defined lightness steps\.)$/i;

function normalizeDescription(path, description) {
  const cleaned = cleanText(description ?? '');
  if (!cleaned) return deriveFallbackDescription(path);
  if (genericDescriptionPattern.test(cleaned)) return deriveFallbackDescription(path);
  if (themeRelativeDescriptionPattern.test(cleaned) && !themePairPattern.test(cleaned)) {
    return deriveFallbackDescription(path);
  }
  return cleaned;
}

export function buildDescriptionsMap(tokens) {
  const map = {};
  for (const { path, description } of tokens) {
    if (description) map[path.join('.')] = normalizeDescription(path, description);
  }
  return map;
}

// ── Generated file texts ─────────────────────────────────────────────────────
/** src/app/design-system/generated-tokens.ts */
export function renderTokensTS(allTokens, deprecationNotes) {
  const tsTree = buildTSTree(allTokens);
  const ts = `/**
 * Generated by scripts/build-tokens.mjs — do not edit manually.
 * Source: hirobius.tokens.json (W3C DTCG 2025.10)
 * Regenerate: node scripts/build-tokens.mjs
 */
export const tokens = {
${serialize(tsTree, 1, deprecationNotes)}
} as const;
`;
  return ts;
}

/** src/app/design-system/generated-token-values.ts */
export function renderTokenValuesTS(primitives, raw) {
  const rawTree = buildRawValuesTree(primitives, raw);
  // Groups a slim module needs on its own get their own export, so it does not pull
  // the whole tree: an object literal never tree-shakes, a named export does.
  // motion-tokens reads only primitive.duration (Button graph byte pass,
  // 2026-11-13: 5.79 -> 3.8 kB gzip). Only these groups split, because every split
  // costs the token graphs that keep the whole tree a few bytes.
  const SPLIT = new Set(['duration']);
  const tree = rawTree.primitive ?? rawTree;
  const exportName = (k) => `primitive${k[0].toUpperCase()}${k.slice(1)}`;
  const groupExports = Object.entries(tree)
    .filter(([k]) => SPLIT.has(k))
    .map(([k, v]) => `export const ${exportName(k)} = {\n${serializeRaw(v, 1)}\n} as const;`)
    .join('\n\n');
  const groupRefs = Object.entries(tree)
    .map(([k, v]) => (SPLIT.has(k) ? `    ${k}: ${exportName(k)}` : serializeRaw({ [k]: v }, 2)))
    .join(',\n');
  const tokenValuesTs = `/**
 * Generated by scripts/build-tokens.mjs — do not edit manually.
 * Source: hirobius.tokens.json (W3C DTCG 2025.10)
 * Regenerate: node scripts/build-tokens.mjs
 *
 * Raw primitive values as typed constants.
 * Import in doc pages instead of hardcoding hex strings, font names, or OKLCH values.
 *
 * Usage:
 *   import { tokenValues } from './generated-token-values';
 *   tokenValues.primitive.color.blue['500']        // '#1e2fff'
 *   import { primitiveDuration } from './generated-token-values'; // one group only, tree-shakes
 *   tokenValues.primitive.typography.family.primary[0]   // 'Clash Grotesk'
 *   tokenValues.primitive.color.blue['500']        // 'oklch(0.49 0.2903 266.54)'
 */
${groupExports}

export const tokenValues = {
  primitive: {
${groupRefs}
  },
} as const;
`;
  return tokenValuesTs;
}

/** src/app/design-system/generated-token-descriptions.ts */
export function renderTokenDescriptionsTS(allTokens) {
  const descMap = buildDescriptionsMap(allTokens);
  const descRows = Object.entries(descMap)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n');
  const tokenDescriptionsTs = `/**
 * Generated by scripts/build-tokens.mjs — do not edit manually.
 * Source: hirobius.tokens.json (W3C DTCG 2025.10)
 * Regenerate: node scripts/build-tokens.mjs
 *
 * Token \\$description fields indexed by dot-path.
 * Import in doc pages to avoid duplicating annotation text.
 *
 * Usage:
 *   import { tokenDescriptions } from './generated-token-descriptions';
 *   tokenDescriptions['semantic.accent.rest']  // 'Default fill — primary buttons...'
 */
export const tokenDescriptions: Record<string, string> = {
${descRows},
};
`;
  return tokenDescriptionsTs;
}

/** src/app/design-system/generated-token-vars.d.ts */
export function renderTokenVarsDts(allTokens, deprecationNotes) {
  const cssVarNames = buildCSSVarNames(allTokens);
  const dtsProps = buildCSSVarDts(cssVarNames, deprecationNotes);
  const tokenVarsDts = `/**
 * Generated by scripts/build-tokens.mjs — do not edit manually.
 * Source: hirobius.tokens.json (W3C DTCG 2025.10)
 * Regenerate: node scripts/build-tokens.mjs
 *
 * Augments React.CSSProperties with all HDS CSS custom property names.
 * Provides autocomplete for var() references in inline style objects.
 * Unknown CSS var names will surface as TypeScript suggestions.
 */
import 'react';

declare module 'react' {
  interface CSSProperties {
${dtsProps}
    // Permit any other CSS custom property (third-party libs, local scoping)
    [key: \`--\${string}\`]: string | number | undefined;
  }
}
`;
  return tokenVarsDts;
}

/**
 * The `hds.space` table (hds#1525): one key per primitive space step, named for
 * its pixel value (`px16`), valued as that step's CSS var. The zero step and the
 * 3px step were never in the public table.
 */
const SPACE_TABLE_OMITTED = new Set(['0', 'px3']);

function buildSpaceTable(allTokens) {
  const rows = [];
  for (const { path, value } of allTokens) {
    if (path.length !== 3 || path[0] !== 'primitive' || path[1] !== 'space') continue;
    if (SPACE_TABLE_OMITTED.has(path[2])) continue;
    rows.push([value.value, path[2]]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  return rows.map(([px, step]) => `  px${px}: 'var(--primitive-space-${step})',`).join('\n');
}

/** src/app/design-system/generated-token-refs.ts */
export function renderTokenRefsTS(allTokens, deprecationNotes) {
  const refsTree = buildTokenRefsTree(allTokens);
  const tokenRefsTs = `/**
 * Generated by scripts/build-tokens.mjs — do not edit manually.
 * Source: hirobius.tokens.json (W3C DTCG 2025.10)
 * Regenerate: node scripts/build-tokens.mjs
 *
 * CSS var reference strings for every token, including typography composites.
 * Import in tokens.ts or any component that needs a CSS var string without hardcoding.
 *
 * Usage:
 *   import { tokenRefs } from './generated-token-refs';
 *   tokenRefs.semantic.typography.mono          // { fontFamily: 'var(...)', ... }
 *   tokenRefs.semantic.color.surface.page       // 'var(--semantic-color-surface-page)'
 */
export const tokenRefs = {
${serialize(refsTree, 1, deprecationNotes)}
} as const;

/** \`hds.space\` and component-tokens' \`space\`: the primitive steps by pixel value. */
export const spaceScale = {
${buildSpaceTable(allTokens)}
} as const;
`;
  return tokenRefsTs;
}
