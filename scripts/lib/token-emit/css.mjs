/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * CSS emitter: token value → CSS string, composite expansion, and the
 * tokens.generated.css text (hds#645). Pure — no fs at import or call time.
 */

import { removeInOf } from '../token-deprecations.mjs';
import { readModes } from '../token-modes.mjs';
import { buildEdgeCSS } from '../raised-edge.mjs';
import { darkAliasReemissions } from '../dark-alias-reemit.mjs';
import { resolveAlias } from '../token-tree.mjs';

// ── Path → CSS var ───────────────────────────────────────────────────────────
/** ['primitive','color','neutral','white'] → '--primitive-color-neutral-white' */
export const pathToCSSVar = (parts) => '--' + parts.join('-');

/** '{primitive.color.neutral.white}' → 'var(--primitive-color-neutral-white)' */
export const aliasToCSSVar = (alias) =>
  `var(${pathToCSSVar(alias.replace(/^\{|\}$/g, '').split('.'))})`;

// ── Value → CSS string ───────────────────────────────────────────────────────
export function colorToCSS(val) {
  if (typeof val === 'string') return val;
  const { components, alpha } = val;
  const [r, g, b] = components.map((c) => Math.round(c * 255));
  return alpha !== undefined && alpha < 1
    ? `rgb(${r} ${g} ${b} / ${alpha})`
    : `rgb(${r} ${g} ${b})`;
}

export function dimensionToCSS({ value, unit }) {
  return `${value}${unit}`;
}

export function durationToCSS({ value, unit }) {
  return `${value}${unit}`;
}

export function cubicBezierToCSS(val) {
  return `cubic-bezier(${val.join(', ')})`;
}

export function fontFamilyToCSS(val) {
  if (!Array.isArray(val)) return String(val);
  return val.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ');
}

export function shadowPartToCSS(v) {
  const color = colorToCSS(v.color);
  const ox = dimensionToCSS(v.offsetX);
  const oy = dimensionToCSS(v.offsetY);
  const blur = dimensionToCSS(v.blur);
  const spread = dimensionToCSS(v.spread);
  return `${v.inset ? 'inset ' : ''}${ox} ${oy} ${blur} ${spread} ${color}`;
}

export function shadowToCSS(val) {
  // Pre-composed CSS strings (multi-layer shadows, hsl(var(--shadow-color) / α)
  // tints) bypass the structured-shadow expansion and pass through verbatim.
  if (typeof val === 'string') return val;
  return Array.isArray(val) ? val.map(shadowPartToCSS).join(', ') : shadowPartToCSS(val);
}

// Slot order is the contract: Tailwind/component CSS reads
// var(--semantic-elevation-{level}-{slot}). Surface is required; shadow and
// border may be null and fall back to CSS no-ops so the var is always usable.
export const ELEVATION_SLOTS = ['surface', 'shadow', 'border'];
export const ELEVATION_NULL_FALLBACK = {
  surface: 'transparent',
  shadow: 'none',
  border: 'transparent',
};

export function expandElevation(pathParts, val) {
  const base = pathToCSSVar(pathParts);
  return ELEVATION_SLOTS.map((slot) => {
    const slotVal = val?.[slot];
    let cssValue;
    if (slotVal == null) {
      cssValue = ELEVATION_NULL_FALLBACK[slot];
    } else if (typeof slotVal === 'string' && slotVal.startsWith('{')) {
      cssValue = aliasToCSSVar(slotVal);
    } else {
      cssValue = String(slotVal);
    }
    return { cssVar: `${base}-${slot}`, cssValue };
  });
}

/**
 * Convert a token value to a CSS string.
 * preserveAlias = true  → {ref} becomes var(--...)   [semantic / component tier]
 * preserveAlias = false → {ref} is resolved raw       [primitive tier]
 * root is required when preserveAlias = false and the value is an alias.
 */
export function valueToCSS(val, type, preserveAlias, root = null) {
  if (typeof val === 'string' && val.startsWith('{')) {
    return preserveAlias
      ? aliasToCSSVar(val)
      : valueToCSS(resolveAlias(val, root), type, false, root);
  }
  switch (type) {
    case 'color':
      return colorToCSS(val);
    case 'dimension':
      return dimensionToCSS(val);
    case 'duration':
      return durationToCSS(val);
    case 'cubicBezier':
      return cubicBezierToCSS(val);
    case 'motionEasing':
      if (val && typeof val === 'object' && val.type === 'spring') {
        return `spring(${val.stiffness}, ${val.damping}, ${val.mass})`;
      }
      return cubicBezierToCSS(val);
    case 'spring':
      return `spring(${val.stiffness}, ${val.damping}, ${val.mass})`;
    case 'fontFamily':
      return fontFamilyToCSS(val);
    case 'fontWeight':
      return String(val);
    case 'number':
      return String(val);
    case 'shadow':
      return shadowToCSS(val);
    default:
      return String(val);
  }
}

// ── Composite expansion ──────────────────────────────────────────────────────
export const TYPO_PROPS = [
  // CSS var suffixes are kebab-case (more idiomatic in CSS), while the token value
  // keys remain camelCase as defined by the W3C DTCG typography schema.
  ['font-family', 'fontFamily', 'fontFamily'],
  ['font-size', 'fontSize', 'dimension'],
  ['font-weight', 'fontWeight', 'fontWeight'],
  ['letter-spacing', 'letterSpacing', 'dimension'],
  ['line-height', 'lineHeight', 'number'],
  // 10t-5: maxWidth extends the W3C DTCG typography schema with an optional
  // measure constraint (Swiss canon caps body/small/mono at 60ch). Composites
  // that omit maxWidth emit no var line — the suffix is filtered downstream.
  ['max-width', 'maxWidth', 'dimension'],
  // textTransform extends the DTCG schema; optional, composites without it emit
  // no var line. Never `uppercase`: the system is sentence case (check-no-uppercase).
  ['text-transform', 'textTransform', 'string'],
];

// Typography composite keys that are optional. Composites may omit these; the
// emitter skips them silently (no CSS var line, no ref leaf, no var name). All
// other TYPO_PROPS entries are required.
export const TYPO_OPTIONAL_KEYS = new Set(['maxWidth', 'textTransform']);

export const MOTION_PROPS = [
  ['duration', 'duration', 'duration'],
  ['easing', 'easing', 'motionEasing'],
];

export function expandTypography(pathParts, val) {
  const base = pathToCSSVar(pathParts);
  return TYPO_PROPS.filter(([, key]) => !TYPO_OPTIONAL_KEYS.has(key) || val[key] != null).map(
    ([suffix, key, type]) => ({
      cssVar: `${base}-${suffix}`,
      cssValue: valueToCSS(val[key], type, true),
    }),
  );
}

export function expandMotion(pathParts, val) {
  const base = `--hds-motion-${pathParts[2]}`;
  return MOTION_PROPS.map(([suffix, key, type]) => ({
    cssVar: `${base}-${suffix}`,
    cssValue: valueToCSS(val[key], type, true),
  }));
}

export function expandTransition(pathParts, val) {
  const base = pathToCSSVar(pathParts);
  return [
    { cssVar: `${base}-duration`, cssValue: valueToCSS(val.duration, 'duration', true) },
    { cssVar: `${base}-delay`, cssValue: valueToCSS(val.delay, 'duration', true) },
    {
      cssVar: `${base}-timing-function`,
      cssValue: valueToCSS(val.timingFunction, 'cubicBezier', true),
    },
  ];
}

// ── CSS section builder ──────────────────────────────────────────────────────
export function buildCSSSection(tokens, label, root = null) {
  const rootLines = [`\n  /* ── ${label} ${'─'.repeat(Math.max(0, 68 - label.length))} */`];
  const darkLines = [];
  const compactLines = [];

  for (const { path, type, value, extensions, deprecated } of tokens) {
    const compact = readModes(extensions)?.Compact;
    const cssVar = pathToCSSVar(path);
    const preserveAlias = path[0] !== 'primitive';
    if (deprecated) {
      rootLines.push(`  /* @deprecated ${deprecated} (removed in ${removeInOf(deprecated)}) */`);
    }

    if (type === 'typography') {
      rootLines.push(`  /* ${path.join('.')} */`);
      for (const { cssVar: v, cssValue } of expandTypography(path, value)) {
        if (cssValue != null) rootLines.push(`  ${v}: ${cssValue};`);
      }
      // A Compact mode on a composite is partial: it names only the sub-properties
      // that move (today fontSize), and only those are re-declared.
      if (compact) {
        for (const [suffix, key, subType] of TYPO_PROPS) {
          if (compact[key] == null) continue;
          const cv = valueToCSS(compact[key], subType, true);
          if (cv != null) compactLines.push(`  ${pathToCSSVar(path)}-${suffix}: ${cv};`);
        }
      }
    } else if (type === 'motion') {
      rootLines.push(`  /* ${path.join('.')} */`);
      for (const { cssVar: v, cssValue } of expandMotion(path, value)) {
        if (cssValue != null) rootLines.push(`  ${v}: ${cssValue};`);
      }
    } else if (type === 'transition') {
      rootLines.push(`  /* ${path.join('.')} */`);
      for (const { cssVar: v, cssValue } of expandTransition(path, value)) {
        if (cssValue != null) rootLines.push(`  ${v}: ${cssValue};`);
      }
    } else if (type === 'elevation') {
      rootLines.push(`  /* ${path.join('.')} */`);
      for (const { cssVar: v, cssValue } of expandElevation(path, value)) {
        if (cssValue != null) rootLines.push(`  ${v}: ${cssValue};`);
      }
    } else {
      const cssValue = valueToCSS(value, type, preserveAlias, root);
      if (cssValue != null) rootLines.push(`  ${cssVar}: ${cssValue};`);

      const dark = readModes(extensions)?.Dark;
      if (dark) {
        const dv = valueToCSS(dark, type, true, root);
        if (dv) darkLines.push(`  ${cssVar}: ${dv};`);
      }

      if (compact) {
        const cv = valueToCSS(compact, type, true, root);
        if (cv) compactLines.push(`  ${cssVar}: ${cv};`);
      }
    }
  }

  return { rootLines, darkLines, compactLines };
}

// ── CSS var name collector ────────────────────────────────────────────────────
/**
 * Returns every CSS custom property name the build script would emit,
 * including the expanded sub-vars for typography and transition composites.
 */
export function buildCSSVarNames(tokens) {
  const vars = [];
  for (const { path, type, value } of tokens) {
    if (type === 'typography') {
      const base = pathToCSSVar(path);
      for (const [suffix, key] of TYPO_PROPS) {
        if (TYPO_OPTIONAL_KEYS.has(key) && (!value || value[key] == null)) continue;
        vars.push(`${base}-${suffix}`);
      }
    } else if (type === 'motion') {
      const base = `--hds-motion-${path[2]}`;
      for (const [suffix] of MOTION_PROPS) vars.push(`${base}-${suffix}`);
    } else if (type === 'transition') {
      const base = pathToCSSVar(path);
      vars.push(`${base}-duration`, `${base}-delay`, `${base}-timing-function`);
    } else if (type === 'elevation') {
      const base = pathToCSSVar(path);
      for (const slot of ELEVATION_SLOTS) vars.push(`${base}-${slot}`);
    } else {
      vars.push(pathToCSSVar(path));
    }
  }
  return vars;
}

// ── tokens.generated.css ─────────────────────────────────────────────────────
/** The full tokens.generated.css text: :root, dark and compact blocks, raised edges. */
export function buildTokensCSS(allTokens, raw) {
  const tier = (name) => allTokens.filter((t) => t.path[0] === name);
  const prim = buildCSSSection(tier('primitive'), 'Primitives', raw);
  const sem = buildCSSSection(tier('semantic'), 'Semantic (light mode defaults)', raw);
  const comp = buildCSSSection(tier('component'), 'Component', raw);
  const role = buildCSSSection(tier('role'), 'Role aliases (shadcn vocabulary)', raw);

  // Primitives historically had no dark overrides (theme switching happened via
  // semantic aliases), but tokens like primitive.shadow.color carry HSL channel
  // strings whose dark variant cannot be expressed by aliasing another primitive.
  // Including prim.darkLines unlocks per-primitive theme overrides without
  // changing semantics for existing primitives that have no Dark mode set.
  const allRootLines = [...prim.rootLines, ...sem.rootLines, ...comp.rootLines, ...role.rootLines];
  const allDarkLines = [...prim.darkLines, ...sem.darkLines, ...comp.darkLines, ...role.darkLines];

  // #245: a bare `--x: var(--y)` alias is SUBSTITUTED on the element where it is
  // declared, so what inherits down the tree is a finished colour, not a live
  // reference. With `data-theme` on <html> that is harmless — <html> is :root, the
  // dark rule wins on the same element, and the alias computes dark. With
  // `data-theme` on a DESCENDANT (a themed section; the preview stage) the semantic
  // flips there but the alias was already computed upstream, so its LIGHT value
  // lands on a dark surface. Measured in Chromium: 55 variables stuck.
  // Re-declaring each theme-sensitive alias inside the dark block makes it
  // re-compute wherever the attribute lands. Root-level theming is unaffected.
  allDarkLines.push(...darkAliasReemissions(allRootLines, allDarkLines));

  // Compact density (data-density="compact" on any ancestor): the same mode
  // mechanism as Dark, with the same alias re-emission so a nested compact scope
  // re-computes surface.padding, grid.gap and the other scale aliases.
  const allCompactLines = [
    ...prim.compactLines,
    ...sem.compactLines,
    ...comp.compactLines,
    ...role.compactLines,
  ];
  allCompactLines.push(...darkAliasReemissions(allRootLines, allCompactLines));

  return `/**
 * Generated by scripts/build-tokens.mjs — do not edit manually.
 * Source: hirobius.tokens.json (W3C DTCG 2025.10)
 * Regenerate: node scripts/build-tokens.mjs
 *
 * Three-tier architecture: primitive → semantic → component
 * Dark mode via [data-theme="dark"] selector (Figma SDS convention).
 * Compact density via [data-density="compact"] (the tokens' Compact mode).
 * The var() reference chain is preserved so dark-mode overrides cascade
 * automatically — no JavaScript re-renders needed for theme switching.
 */

:root {
${prim.rootLines.join('\n')}
${sem.rootLines.join('\n')}
${comp.rootLines.join('\n')}
${role.rootLines.join('\n')}
}

/* ── Dark mode overrides ────────────────────────────────────────────────────── */
[data-theme="dark"] {
${allDarkLines.join('\n')}
}

/* ── Compact density (apps) ─────────────────────────────────────────────────── */
[data-density="compact"] {
${allCompactLines.join('\n')}
}
${buildEdgeCSS(raw)}`;
}
