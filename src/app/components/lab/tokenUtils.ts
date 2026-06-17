/**
 * tokenUtils — flatten hirobius.tokens.json into a searchable list
 * and trace alias chains through the three-tier hierarchy.
 */

import rawTokens from '../../../../hirobius.tokens.json';

export type Tier = 'primitive' | 'semantic' | 'component';

export interface FlatToken {
  path: string;        // "semantic.color.surface.page"
  cssVar: string;      // "--semantic-color-surface-page"
  tier: Tier;
  type: string;
  category: string;    // second segment: "color", "space", "font", etc.
  rawValue: unknown;
  isAlias: boolean;
  description?: string; // "$description" from token JSON
  lightAlias?: string | number; // "{primitive.color.neutral.50}" or numeric mode value
  darkAlias?: string | number;  // "{primitive.color.neutral.950}" or numeric mode value
  composite?: Record<string, unknown>;  // object-valued authored token children
}

const DTCG_KEYS = new Set(['$type', '$value', '$description', '$extensions', '$schema']);
const SKIP_TYPES = new Set(['shadow', 'transition']);

function splitReadableSegment(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function humanizeTokenSegment(segment: string) {
  const words = splitReadableSegment(segment);
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatCategoryLabel(category: string) {
  return humanizeTokenSegment(category);
}

/** Normalizes a token reference to dot notation when possible. */
function normalizeTokenRef(ref: string) {
  const trimmed = ref.trim();
  if (trimmed.startsWith('var(')) return trimmed;
  const unwrapped = trimmed.startsWith('{') && trimmed.endsWith('}')
    ? trimmed.slice(1, -1)
    : trimmed;
  return unwrapped.includes('/') ? unwrapped.split('/').filter(Boolean).join('.') : unwrapped;
}

function fallbackDescription(path: string[], tier: Tier, type: string, rawValue: unknown, isAlias: boolean): string {
  const category = path[1] ?? tier;
  const name = path[path.length - 1] ?? '';

  if (tier === 'primitive') {
    if (category === 'color') {
      const family = path[2] ?? '';
      if (family === 'neutral') {
        if (name === 'white') return 'Pure white neutral source.';
        if (name === 'black') return 'Pure black neutral source.';
        return 'Neutral ramp step for surfaces and text.';
      }
      if (family === 'blue') return 'Brand blue ramp step for accent and interactive states.';
      if (family === 'red') return 'Feedback red ramp step for error states.';
      if (family === 'green') return 'Feedback green ramp step for success states.';
      if (family === 'amber') return 'Feedback amber ramp step for warning states.';
      return 'Primitive color source value.';
    }

    if (category === 'space') return 'Spacing step on the 4px grid.';
    if (category === 'radius') return 'Corner radius step for surfaces and controls.';
    if (category === 'typography') {
      const family = path[2] ?? '';
      if (family === 'family') return 'Font family stack for the system typeface.';
      if (family === 'size') return 'Type size step for semantic text roles.';
      if (family === 'weight') return 'Font weight step for the type ramp.';
      if (family === 'lineHeight') return 'Line-height step for readable text rhythm.';
      if (family === 'letterSpacing') return 'Tracking step for the type ramp.';
      return 'Typography primitive source value.';
    }
    if (category === 'duration') return 'Motion duration step.';
    if (category === 'easing') return 'Motion easing curve.';
    if (category === 'layout') {
      if (name.startsWith('bp-')) return 'Breakpoint used for responsive layout switches.';
      if (name.includes('max-width')) return 'Maximum width used by the layout shell.';
      return 'Layout primitive source value.';
    }
    if (category === 'opacity') return 'Opacity step for interactive states.';
    if (category === 'borderWidth') return 'Border width step for UI rules.';
    return 'Primitive source value.';
  }

  if (tier === 'semantic') {
    if (category === 'color') {
      const role = path[2] ?? '';
      if (role === 'surface') return `Surface role for ${humanizeTokenSegment(name)}.`;
      if (role === 'content') return `Content color role for ${humanizeTokenSegment(name)}.`;
      if (role === 'border') return `Border color role for ${humanizeTokenSegment(name)}.`;
      if (role === 'feedback') return `Feedback color role for ${humanizeTokenSegment(name)}.`;
      if (role === 'brand') return `Brand surface role for ${humanizeTokenSegment(name)}.`;
      if (role === 'icon') return `Icon color role for ${humanizeTokenSegment(name)}.`;
      return 'Semantic color role.';
    }
    if (category === 'typography') return `Semantic type role for ${humanizeTokenSegment(name)}.`;
    if (category === 'accent') return 'Interactive accent role for states and emphasis.';
    if (category === 'radius') return 'Semantic radius role for interactive surfaces.';
    if (category === 'opacity') return 'Semantic opacity role for disabled states.';
    if (category === 'layout') return 'Semantic layout role for page composition.';
    if (category === 'borderWidth') return 'Semantic border role for UI rules.';
    return 'Semantic role token.';
  }

  if (tier === 'component') {
    const component = path[2] ?? '';
    if (component === 'button') return 'Component-scoped token for button surfaces and state.';
    if (component === 'card') return 'Component-scoped token for card surfaces and structure.';
    if (component === 'tag') return 'Component-scoped token for compact tag pills.';
    if (component === 'nav') return 'Component-scoped token for the navigation rail.';
    if (component === 'input') return 'Component-scoped token for form fields and controls.';
    if (component === 'container') return 'Component-scoped token for layout surfaces and shells.';
    if (component === 'grid') return 'Component-scoped token for grid surfaces and spacing.';
    if (component === 'badge') return 'Component-scoped token for status labels and badges.';
    return 'Component-scoped token.';
  }

  void type;
  void rawValue;
  void isAlias;
  return 'Design token source value.';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatAuthoredDimensionValue(rawValue: unknown): string | null {
  if (!isPlainObject(rawValue)) return null;
  const record = rawValue as { value?: unknown; unit?: unknown };

  if (typeof record.unit !== 'string') return null;

  if (typeof record.value === 'number') {
    return `${record.value}${record.unit}`;
  }

  if (typeof record.value === 'string') {
    return record.value.endsWith(record.unit) ? record.value : `${record.value}${record.unit}`;
  }

  return null;
}

function formatSpringValue(rawValue: unknown): string | null {
  if (!isPlainObject(rawValue)) return null;
  const record = rawValue as {
    type?: unknown;
    stiffness?: unknown;
    damping?: unknown;
    mass?: unknown;
  };

  if (record.type !== 'spring') return null;

  const stiffness = typeof record.stiffness === 'number' ? record.stiffness : null;
  const damping = typeof record.damping === 'number' ? record.damping : null;
  const mass = typeof record.mass === 'number' ? record.mass : null;

  if (stiffness == null || damping == null || mass == null) {
    return 'spring';
  }

  return `spring(${stiffness}, ${damping}, ${mass})`;
}

function formatInlineValue(rawValue: unknown): string {
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return normalizeTokenRef(trimmed) ?? trimmed;
    }
    return trimmed;
  }

  if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
    return String(rawValue);
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => formatInlineValue(value)).join(', ');
  }

  if (isPlainObject(rawValue)) {
    return JSON.stringify(rawValue);
  }

  return String(rawValue ?? '');
}

function formatStructuredLiteralValue(rawValue: unknown): string | null {
  return formatAuthoredDimensionValue(rawValue)
    ?? formatSpringValue(rawValue)
    ?? formatTypographyStyleValue(rawValue);
}

function formatTypographyStyleValue(rawValue: unknown): string | null {
  if (!isPlainObject(rawValue)) return null;

  const keys = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'];
  if (!keys.some((key) => key in rawValue)) return null;

  const record = rawValue as {
    fontFamily?: unknown;
    fontSize?: unknown;
    fontWeight?: unknown;
    letterSpacing?: unknown;
    lineHeight?: unknown;
  };
  const parts: string[] = [];

  const family = record.fontFamily;
  if (family !== undefined) {
    parts.push(`family: ${formatInlineValue(family)}`);
  }

  const size = record.fontSize;
  if (size !== undefined) {
    parts.push(`size: ${formatInlineValue(size)}`);
  }

  const weight = record.fontWeight;
  if (weight !== undefined) {
    parts.push(`weight: ${formatInlineValue(weight)}`);
  }

  const spacing = record.letterSpacing;
  if (spacing !== undefined) {
    parts.push(`tracking: ${formatInlineValue(spacing)}`);
  }

  const lineHeight = record.lineHeight;
  if (lineHeight !== undefined) {
    parts.push(`line: ${formatInlineValue(lineHeight)}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'typography style';
}

function shouldTreatAsLiteralObject(rawValue: unknown): boolean {
  return formatStructuredLiteralValue(rawValue) !== null;
}

function getFigmaModes(node: TokenTreeNode): Record<string, string | number> | undefined {
  const extensions = node.$extensions;
  if (!isPlainObject(extensions)) return undefined;

  const variables = extensions['com.figma.variables'];
  if (!isPlainObject(variables)) return undefined;

  const modes = variables['modes'];
  if (!isPlainObject(modes)) return undefined;

  const normalizedModes: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(modes)) {
    if (typeof value === 'string' || typeof value === 'number') {
      normalizedModes[key] = value;
    }
  }

  return Object.keys(normalizedModes).length > 0 ? normalizedModes : undefined;
}

function* walkRaw(node: unknown, path: string[] = [], inherited: string | null = null): Generator<FlatToken> {
  if (!isPlainObject(node)) return;

  const tokenNode = node as TokenTreeNode;
  const type = typeof tokenNode.$type === 'string' ? tokenNode.$type : inherited ?? '';

  if ('$value' in tokenNode) {
    if (!type || SKIP_TYPES.has(type)) return;
    const tier = path[0] as Tier;
    const modes = getFigmaModes(tokenNode);
    const value = tokenNode.$value;

    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !shouldTreatAsLiteralObject(value)) {
      const description = typeof tokenNode.$description === 'string'
        ? tokenNode.$description
        : fallbackDescription(path, tier, type, value, false);
      yield {
        path: path.join('.'),
        cssVar: '--' + path.join('-'),
        tier,
        type,
        category: path[1] ?? tier,
        rawValue: value,
        isAlias: false,
        description,
        composite: value as Record<string, unknown>,
      };
      return;
    }

    const isAlias = typeof value === 'string' && (value as string).startsWith('{');
    const description = typeof tokenNode.$description === 'string'
      ? tokenNode.$description
      : fallbackDescription(path, tier, type, value, isAlias);
    yield {
      path: path.join('.'),
      cssVar: '--' + path.join('-'),
      tier,
      type,
      category: path[1] ?? tier,
      rawValue: value,
      isAlias,
      description,
      lightAlias: modes?.['Light'] ?? (isAlias ? (value as string) : undefined),
      darkAlias: modes?.['Dark'] ?? (isAlias ? (value as string) : undefined),
    };
    return;
  }

  for (const key of Object.keys(tokenNode)) {
    if (DTCG_KEYS.has(key)) continue;
    yield* walkRaw(tokenNode[key], [...path, key], type);
  }
}

const raw = rawTokens as TokenTreeNode;

export const allTokens: FlatToken[] = [...walkRaw(raw)];

export function getTokensByTier(tier: Tier): FlatToken[] {
  return allTokens.filter(t => t.tier === tier);
}

export function getTierCategories(tier: Tier): string[] {
  return [...new Set(getTokensByTier(tier).map(t => t.category))].sort();
}

export function formatTokenValue(rawValue: unknown): string {
  const structuredLiteral = formatStructuredLiteralValue(rawValue);
  if (structuredLiteral) return structuredLiteral;
  if (typeof rawValue === 'string') return rawValue;
  if (typeof rawValue === 'number' || typeof rawValue === 'boolean') return String(rawValue);
  if (rawValue == null) return '—';
  return JSON.stringify(rawValue, null, 2);
}

/** Follow a token reference string to its FlatToken. Returns null if not found. */
export function resolveAlias(ref: unknown): FlatToken | null {
  if (typeof ref !== 'string') return null;
  const normalized = normalizeTokenRef(ref);
  if (!normalized || normalized.startsWith('var(')) {
    return null;
  }
  const result = allTokens.find(t => t.path === normalized) ?? null;
  return result;
}

/**
 * Resolves a token reference to a CSS variable string.
 * Returns the original string when no token is found so callers can fail safely.
 */
export function resolveAliasCssVar(ref: unknown): string {
  if (typeof ref !== 'string') return '';
  if (ref.startsWith('var(')) return ref;

  const token = resolveAlias(ref);
  if (token) return `var(${token.cssVar})`;

  const looksLikeTokenRef = /^[a-z][a-z0-9-]*(?:[./][a-z0-9-]+)+$/i.test(ref.trim());
  if (looksLikeTokenRef || ref.startsWith('{')) {
    console.warn(`[tokenUtils] Unresolved token reference: ${ref}`);
  }

  return ref;
}

/**
 * Resolves a token reference to its concrete authored value.
 * Useful for contrast math and other places that need literal colors,
 * while the UI may still consume CSS vars end-to-end.
 */
export function resolveTokenLiteralValue(ref: unknown, mode: 'light' | 'dark' = 'light', depth = 0): string | null {
  if (typeof ref !== 'string' || depth > 20) return null;

  const trimmed = ref.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('var(') && trimmed.endsWith(')')) {
    const cssRef = trimmed.slice(4, -1).trim();
    if (cssRef.startsWith('--')) {
      const tokenPath = cssRef.slice(2).split('-').filter(Boolean).join('.');
      return tokenPath ? resolveTokenLiteralValue(tokenPath, mode, depth + 1) : null;
    }
    return null;
  }

  if (/^(#|rgb\(|rgba\(|oklch\()/i.test(trimmed)) {
    return trimmed;
  }

  const normalized = normalizeTokenRef(trimmed);
  if (!normalized) return trimmed;

  const token = allTokens.find(t => t.path === normalized);
  if (!token) return trimmed;

  const alias = mode === 'light' ? token.lightAlias : token.darkAlias;
  if (typeof alias === 'number') {
    return token.category === 'opacity' ? alias.toFixed(2) : String(alias);
  }

  if (typeof alias === 'string') {
    const resolvedAlias = resolveTokenLiteralValue(alias, mode, depth + 1);
    if (resolvedAlias) return resolvedAlias;
  }

  if (typeof token.rawValue === 'string') return token.rawValue;
  if (typeof token.rawValue === 'number' || typeof token.rawValue === 'boolean') return String(token.rawValue);
  const structuredLiteral = formatStructuredLiteralValue(token.rawValue);
  if (structuredLiteral) return structuredLiteral;
  return formatTokenValue(token.rawValue);
}

/** Group a flat token list by category (second segment). */
export function groupByCategory(tokens: FlatToken[]): Record<string, FlatToken[]> {
  return tokens.reduce<Record<string, FlatToken[]>>((acc, tok) => {
    (acc[tok.category] ??= []).push(tok);
    return acc;
  }, {});
}
type TokenTreeNode = {
  $description?: unknown;
  $extensions?: Record<string, unknown>;
  $schema?: unknown;
  $type?: unknown;
  $value?: unknown;
} & Record<string, unknown>;
