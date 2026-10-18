/**
 * Build-time data for the visual galleries on the Foundations pages (colour
 * swatches, type specimens, spacing bars, radius boxes, elevation cards, motion
 * demos). Everything is read from hirobius.tokens.json through the same resolver
 * as the token tables, so a token change shows up here with no docs edit.
 */
import { cssVarFor, resolveTokenValue, tokenRow, type TokenRow } from './token-tables';

type Json = unknown;
type Node = Record<string, Json>;

const isNode = (v: Json): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isColor = (value: string) => /^(#|rgb|hsl|oklch)/i.test(value);
const describe = (node: Node) => (typeof node.$description === 'string' ? node.$description : '');

/** `{semantic.shadow.subtle}` -> `semantic.shadow.subtle`; anything else -> null. */
const aliasPath = (ref: Json) => {
  const m = typeof ref === 'string' ? /^\{([^}]+)\}$/.exec(ref) : null;
  return m ? m[1]! : null;
};

function lookup(tokens: Json, path: string): Node | null {
  let cur: Json = tokens;
  for (const seg of path.split('.')) {
    if (!isNode(cur) || !(seg in cur)) return null;
    cur = cur[seg];
  }
  return isNode(cur) ? cur : null;
}

/** Documented children of a group: skips `$` keys and deprecated tokens. */
function children(node: Node): [string, Node][] {
  return Object.entries(node).filter(
    (e): e is [string, Node] => !e[0].startsWith('$') && isNode(e[1]) && !e[1].$deprecated,
  );
}

/** Every leaf token under a group, as table rows (depth-first, source order). */
function leafRows(tokens: Json, path: string): TokenRow[] {
  const node = lookup(tokens, path);
  if (!node) return [];
  if ('$value' in node) {
    const row = tokenRow(tokens, path);
    return row ? [row] : [];
  }
  return children(node).flatMap(([key]) => leafRows(tokens, `${path}.${key}`));
}

export interface SwatchGroup {
  title: string;
  swatches: TokenRow[];
}

/**
 * Colour gallery: primitive ramps (one group per hue), then the semantic and
 * accent tokens (one group per role). Tenant brand ramps (`projectBrand`) are
 * left out: they belong to one client, not the shared system.
 */
export function colorGalleries(
  tokens: Json,
): { title: string; dense: boolean; groups: SwatchGroup[] }[] {
  const groupsUnder = (path: string, skip: string[] = []): SwatchGroup[] => {
    const node = lookup(tokens, path);
    if (!node) return [];
    return children(node)
      .filter(([key]) => !skip.includes(key))
      .map(([key]) => ({
        title: titleCase(key),
        swatches: leafRows(tokens, `${path}.${key}`).filter((r) => isColor(r.value)),
      }))
      .filter((g) => g.swatches.length > 0);
  };
  const accent: SwatchGroup = {
    title: 'Accent',
    swatches: leafRows(tokens, 'semantic.accent').filter((r) => isColor(r.value)),
  };
  return [
    { title: 'Primitives', dense: true, groups: groupsUnder('primitive.color', ['projectBrand']) },
    {
      title: 'Semantic & state',
      dense: false,
      groups: [...groupsUnder('semantic.color'), accent].filter((g) => g.swatches.length),
    },
  ];
}

export interface TypeSpecimen {
  role: string;
  token: string;
  /** The one family the role asks for, without fallbacks. */
  family: string;
  /** CSS font stack, for rendering. */
  fontFamily: string;
  fontWeight: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

/** One specimen per live text style in `semantic.typography`, in ramp order. */
export function typeSpecimens(tokens: Json): TypeSpecimen[] {
  const group = lookup(tokens, 'semantic.typography');
  if (!group) return [];
  return children(group)
    .filter(([, node]) => isNode(node.$value) && 'fontSize' in node.$value)
    .map(([role, node]) => {
      const v = node.$value as Node;
      const field = (k: string) => (k in v ? resolveTokenValue(tokens, v[k]) : '');
      const fontFamily = field('fontFamily');
      return {
        role,
        token: `semantic.typography.${role}`,
        family: fontFamily.split(',')[0]!.trim(),
        fontFamily,
        fontWeight: field('fontWeight'),
        fontSize: field('fontSize'),
        lineHeight: field('lineHeight'),
        letterSpacing: field('letterSpacing') || '0em',
      };
    });
}

export interface DimensionStep {
  name: string;
  token: string;
  cssVar: string;
  /** Resolved value, e.g. `16px`. */
  value: string;
  /** Numeric size in px, for ordering and drawing. */
  px: number;
}

function dimensionSteps(tokens: Json, path: string, sort: boolean): DimensionStep[] {
  const steps = leafRows(tokens, path)
    .map((r) => ({
      name: r.token.slice(path.length + 1),
      token: r.token,
      cssVar: cssVarFor(r.token),
      value: r.value,
      px: Number.parseFloat(r.value),
    }))
    .filter((s) => /px$/.test(s.value) && Number.isFinite(s.px));
  return sort ? steps.sort((a, b) => a.px - b.px) : steps;
}

/** Spacing: the semantic t-shirt scale, the fixed steps between it, then every primitive step by size. */
export const spaceScales = (tokens: Json) => [
  { title: 'Scale', steps: dimensionSteps(tokens, 'semantic.space.scale', false) },
  { title: 'Fixed', steps: dimensionSteps(tokens, 'semantic.space.fixed', false) },
  { title: 'Primitive steps', steps: dimensionSteps(tokens, 'primitive.space', true) },
];

/** Radius: the semantic roles, the fixed scale, then the primitive steps by size. */
export const radiusScales = (tokens: Json) => [
  {
    title: 'Roles',
    steps: dimensionSteps(tokens, 'semantic.radius', false).filter((s) => !s.name.includes('.')),
  },
  { title: 'Scale', steps: dimensionSteps(tokens, 'semantic.radius.scale', false) },
  { title: 'Primitive steps', steps: dimensionSteps(tokens, 'primitive.radius', true) },
];

export interface ElevationLevel {
  name: string;
  token: string;
  description: string;
  /** CSS custom properties (not values), so the card follows the live theme. */
  surface: string | null;
  shadow: string | null;
  border: string | null;
  /** The shadow token it uses, e.g. `semantic.shadow.subtle`, for the caption. */
  shadowToken: string | null;
}

const aliasVar = (ref: Json) => {
  const path = aliasPath(ref);
  return path ? `var(${cssVarFor(path)})` : null;
};

/** Elevation levels from the `semantic.elevation` composites (surface + shadow + border). */
export function elevationLevels(tokens: Json): ElevationLevel[] {
  const group = lookup(tokens, 'semantic.elevation');
  if (!group) return [];
  return children(group).flatMap(([name, node]) => {
    const ext = node.$extensions;
    const value =
      isNode(ext) && isNode(ext['com.hirobius.hds']) ? ext['com.hirobius.hds'].$value : null;
    if (!isNode(value)) return [];
    return [
      {
        name,
        token: `semantic.elevation.${name}`,
        description: describe(node),
        surface: aliasVar(value.surface),
        shadow: aliasVar(value.shadow),
        border: aliasVar(value.border),
        shadowToken: aliasPath(value.shadow),
      },
    ];
  });
}

export interface MotionToken {
  name: string;
  token: string;
  description: string;
  /** Resolved duration, e.g. `150ms`. */
  duration: string;
  /** Duration CSS var: tokens.css zeroes it under prefers-reduced-motion. */
  durationVar: string | null;
  /** CSS timing function built from the curve's control points. */
  easing: string;
  easingName: string;
}

/** Motion presets from `semantic.motion` (duration + curve composites). */
export function motionTokens(tokens: Json): MotionToken[] {
  const group = lookup(tokens, 'semantic.motion');
  if (!group) return [];
  return children(group).flatMap(([name, node]) => {
    const v = node.$value;
    if (!isNode(v) || !('duration' in v)) return [];
    const curve = v.timingFunction ?? v.easing;
    const curvePath = aliasPath(curve);
    const durationPath = aliasPath(v.duration);
    // The curve's control points, not its CSS var: a spring's var is not valid CSS.
    const points = resolveTokenValue(tokens, curve);
    return [
      {
        name,
        token: `semantic.motion.${name}`,
        description: describe(node),
        duration: resolveTokenValue(tokens, v.duration),
        durationVar: durationPath ? cssVarFor(durationPath) : null,
        easing: /^[\d.\-]+(, [\d.\-]+){3}$/.test(points) ? `cubic-bezier(${points})` : points,
        easingName: curvePath ? curvePath.split('.').pop()! : '',
      },
    ];
  });
}
