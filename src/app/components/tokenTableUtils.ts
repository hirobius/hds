/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
import hirobiusTokens from '../../../hirobius.tokens.json';
import { resolveTokenLiteralValue } from './lab/tokenUtils';

type TokenNode = {
  $type?: string;
  $value?: unknown;
  $description?: string;
  [key: string]: unknown;
};

type TokenTree = Record<string, unknown>;

type FlatTokenEntry = {
  path: string;
  value: unknown;
  type?: string;
};

type DescribedTokenEntry = {
  $description?: string;
  [key: string]: unknown;
};

type ReflectiveTokenRow = {
  key: string;
  role: string;
  tokenPath: string;
  value: string;
  whereLabel: string;
  whereDetail?: string;
  description: string;
  raw?: string;
  runtimeOnly?: boolean;
};

const TOKEN_ROOT = hirobiusTokens as TokenTree;
const TOKEN_DESCRIPTIONS = new Map<string, string>();

function isTokenNode(value: unknown): value is TokenNode {
  return Boolean(value) && typeof value === 'object' && ('$value' in (value as Record<string, unknown>) || '$description' in (value as Record<string, unknown>) || '$type' in (value as Record<string, unknown>));
}

function flattenTokens(node: TokenTree, prefix: string[] = [], out = new Map<string, FlatTokenEntry>()): Map<string, FlatTokenEntry> {
  Object.entries(node).forEach(([key, value]) => {
    if (key.startsWith('$')) return;

    const path = [...prefix, key].join('.');
    if (isTokenNode(value)) {
      out.set(path, {
        path,
        value: value.$value,
        type: typeof value.$type === 'string' ? value.$type : undefined,
      });
    }

    if (value && typeof value === 'object') {
      flattenTokens(value as TokenTree, [...prefix, key], out);
    }
  });

  return out;
}

function collectTokenDescriptions(node: TokenTree, prefix: string[] = []): void {
  Object.entries(node).forEach(([key, value]) => {
    if (key.startsWith('$')) return;
    if (!value || typeof value !== 'object') return;

    const path = [...prefix, key].join('.');
    const describedValue = value as DescribedTokenEntry;
    if (typeof describedValue.$description === 'string') {
      TOKEN_DESCRIPTIONS.set(path, describedValue.$description);
    }

    collectTokenDescriptions(value as TokenTree, [...prefix, key]);
  });
}

const FLAT_TOKENS = flattenTokens(TOKEN_ROOT);
collectTokenDescriptions(TOKEN_ROOT);

function lowerWords(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function cleanText(value: string) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function deriveFallbackAnatomy(tokenPath: string) {
  const normalized = lowerWords(tokenPath);

  if (normalized.includes('size')) return 'control size';
  if (normalized.includes('padding') || normalized.includes('space')) return 'spacing';
  if (normalized.includes('radius')) return 'corner radius';
  if (normalized.includes('font') || normalized.includes('type')) return 'type setting';
  if (normalized.includes('opacity')) return 'opacity';
  if (normalized.includes('shadow')) return 'shadow depth';
  if (normalized.includes('motion') || normalized.includes('duration') || normalized.includes('easing')) return 'motion timing';
  if (normalized.includes('border')) return 'border / stroke';
  if (normalized.includes('icon')) return 'icon slot';
  if (normalized.includes('gap')) return 'inter-item gap';
  return 'component detail';
}

function deriveFallbackDescription(tokenPath: string, componentName?: string, category?: string) {
  const normalizedPath = lowerWords(tokenPath);
  const surface = deriveSurfaceLabel(componentName, category).replace(/\bshell\b/g, 'surface');

  if (normalizedPath.startsWith('primitive color neutral')) {
    return 'Neutral ramp step for surfaces and text.';
  }
  if (normalizedPath.startsWith('primitive color blue')) {
    return 'Brand blue ramp step for accents and interactive states.';
  }
  if (normalizedPath.startsWith('primitive color red')) {
    return 'Feedback red ramp step for error states.';
  }
  if (normalizedPath.startsWith('primitive color green')) {
    return 'Feedback green ramp step for success states.';
  }
  if (normalizedPath.startsWith('primitive color amber')) {
    return 'Feedback amber ramp step for warning states.';
  }
  if (normalizedPath.startsWith('primitive space')) {
    return 'Spacing step on the 4px grid.';
  }
  if (normalizedPath.startsWith('primitive radius')) {
    return 'Corner radius step for controls and surfaces.';
  }
  if (normalizedPath.startsWith('primitive typography family')) {
    return 'Primary font family stack for interface text.';
  }
  if (normalizedPath.startsWith('primitive typography size')) {
    return 'Type size step for the text scale.';
  }
  if (normalizedPath.startsWith('primitive typography weight')) {
    return 'Font weight step for the type ramp.';
  }
  if (normalizedPath.startsWith('primitive typography lineheight')) {
    return 'Line rhythm step for readable text.';
  }
  if (normalizedPath.startsWith('primitive typography letterspacing')) {
    return 'Tracking step for the type ramp.';
  }

  if (normalizedPath.startsWith('semantic color surface')) {
    return `Surface color role for the ${surface}.`;
  }
  if (normalizedPath.startsWith('semantic color content')) {
    return `Content color role for the ${surface}.`;
  }
  if (normalizedPath.startsWith('semantic color border')) {
    return `Border color role for the ${surface}.`;
  }
  if (normalizedPath.startsWith('semantic typography')) {
    return `Typography role for the ${surface}.`;
  }
  if (normalizedPath.startsWith('semantic radius')) {
    return `Interactive radius role for the ${surface}.`;
  }

  if (normalizedPath.includes('bghover') || normalizedPath.includes('hover fill')) {
    return `Hover-state fill for the ${surface}.`;
  }
  if (normalizedPath.includes('bg') || normalizedPath.includes('fill')) {
    return `Default fill for the ${surface}.`;
  }
  if (normalizedPath.includes('text')) {
    return `Text color for the ${surface}.`;
  }
  if (normalizedPath.includes('paddingx') || normalizedPath.includes('horizontal padding')) {
    return `Horizontal inset for the ${surface}.`;
  }
  if (normalizedPath.includes('paddingy') || normalizedPath.includes('vertical padding')) {
    return `Vertical inset for the ${surface}.`;
  }
  if (normalizedPath.includes('radius')) {
    return `Corner radius for the ${surface}.`;
  }
  if (normalizedPath.includes('fontsize') || normalizedPath.includes('font size')) {
    return `Type size for the ${surface}.`;
  }
  if (normalizedPath.includes('fontweight') || normalizedPath.includes('font weight')) {
    return `Type weight for the ${surface}.`;
  }
  if (normalizedPath.includes('gap')) {
    return `Spacing between items in the ${surface}.`;
  }
  if (normalizedPath.includes('border')) {
    return `Border / stroke for the ${surface}.`;
  }
  if (normalizedPath.includes('icon')) {
    return `Icon slot for the ${surface}.`;
  }
  if (normalizedPath.includes('label')) {
    return `Label text for the ${surface}.`;
  }
  if (normalizedPath.includes('size')) {
    return `Control size for the ${surface}.`;
  }

  return `${surface.charAt(0).toUpperCase()}${surface.slice(1)} detail.`;
}

const themeRelativeDescriptionPattern = /\b(darken(?:s|ed)?|lighten(?:s|ed)?|brighten(?:s|ed)?|dim(?:s|med)?|darkens?|lightens?)\b/i;
const themePairPattern = /\blight\b[\s\S]*\bdark\b|\bdark\b[\s\S]*\blight\b/i;
const genericDescriptionPattern = /^(No token description available\.?|Primitive source value\.|Semantic role token\.|Design token source value\.|Specific value within the .* range at a defined lightness step\.|Discrete values within the .* range at defined lightness steps\.)$/i;

function normalizeTokenDescription(
  tokenPath: string,
  description: string | null | undefined,
  componentName?: string,
  category?: string,
  _role?: string,
  _sourceSnippet?: string,
) {
  const cleaned = cleanText(description ?? '');
  if (!cleaned) return deriveFallbackDescription(tokenPath, componentName, category);
  if (genericDescriptionPattern.test(cleaned)) return deriveFallbackDescription(tokenPath, componentName, category);
  if (themeRelativeDescriptionPattern.test(cleaned) && !themePairPattern.test(cleaned)) {
    return deriveFallbackDescription(tokenPath, componentName, category);
  }
  return cleaned;
}

function deriveSurfaceLabel(componentName?: string, category?: string) {
  const normalizedName = lowerWords(componentName ?? '');
  const normalizedCategory = lowerWords(category ?? '');

  if (normalizedName.includes('button')) return 'button shell';
  if (normalizedName.includes('input') || normalizedName.includes('select') || normalizedName.includes('radio') || normalizedName.includes('toggle') || normalizedName.includes('slider') || normalizedName.includes('segmented control')) return 'control shell';
  if (normalizedName.includes('nav') || normalizedName.includes('side nav') || normalizedName.includes('doc link card')) return 'navigation surface';
  if (normalizedName.includes('alert') || normalizedName.includes('badge')) return 'feedback surface';
  if (normalizedName.includes('code block') || normalizedName.includes('inline code')) return 'code surface';
  if (normalizedName.includes('asset img') || normalizedName.includes('image')) return 'media frame';
  if (normalizedName.includes('preview frame') || normalizedName.includes('component preview')) return 'preview frame';
  if (normalizedName.includes('table')) return 'table surface';
  if (normalizedName.includes('token')) return 'token surface';
  if (normalizedName.includes('stack')) return 'layout stack';
  if (normalizedCategory.includes('navigation')) return 'navigation surface';
  if (normalizedCategory.includes('actions')) return 'action surface';
  if (normalizedCategory.includes('inputs')) return 'control shell';
  if (normalizedCategory.includes('feedback')) return 'feedback surface';
  if (normalizedCategory.includes('display')) return 'display surface';
  if (normalizedCategory.includes('utilities')) return 'utility surface';
  return 'component surface';
}

function deriveWhereFromRole(role: string, tokenPath: string, componentName?: string, category?: string) {
  const surface = deriveSurfaceLabel(componentName, category);
  const normalized = lowerWords(role);

  if (normalized.includes('horizontal padding')) return { whereLabel: surface, whereDetail: 'inner padding / inline axis' };
  if (normalized.includes('vertical padding')) return { whereLabel: surface, whereDetail: 'inner padding / block axis' };
  if (normalized.includes('padding')) return { whereLabel: surface, whereDetail: 'inner padding' };
  if (normalized.includes('fill hover')) return { whereLabel: surface, whereDetail: 'hover fill' };
  if (normalized.includes('fill')) return { whereLabel: surface, whereDetail: 'surface fill' };
  if (normalized.includes('label')) return { whereLabel: surface, whereDetail: 'label text' };
  if (normalized.includes('corner radius') || normalized.includes('radius')) return { whereLabel: surface, whereDetail: 'corner radius' };
  if (normalized.includes('font size')) return { whereLabel: surface, whereDetail: 'type size' };
  if (normalized.includes('font weight')) return { whereLabel: surface, whereDetail: 'type weight' };
  if (normalized.includes('size')) return { whereLabel: surface, whereDetail: deriveFallbackAnatomy(tokenPath) };
  if (normalized.includes('gap')) return { whereLabel: surface, whereDetail: 'inter-item gap' };
  if (normalized.includes('border')) return { whereLabel: surface, whereDetail: 'border / stroke' };
  if (normalized.includes('height')) return { whereLabel: surface, whereDetail: 'control height' };
  if (normalized.includes('width')) return { whereLabel: surface, whereDetail: 'control width' };
  if (normalized.includes('icon')) return { whereLabel: surface, whereDetail: 'icon slot' };

  return { whereLabel: surface, whereDetail: deriveFallbackAnatomy(tokenPath) };
}

function deriveWhereFromSnippet(sourceSnippet: string | undefined, tokenPath: string, componentName?: string, category?: string) {
  const surface = deriveSurfaceLabel(componentName, category);
  const snippet = lowerWords(sourceSnippet ?? '');
  const path = lowerWords(tokenPath);

  if (snippet.includes('padding left') || snippet.includes('padding right') || snippet.includes('padding x') || snippet.includes('paddingleft') || snippet.includes('paddingright')) {
    return { whereLabel: surface, whereDetail: 'inner padding / inline axis' };
  }
  if (snippet.includes('padding top') || snippet.includes('padding bottom') || snippet.includes('padding y') || snippet.includes('paddingtop') || snippet.includes('paddingbottom')) {
    return { whereLabel: surface, whereDetail: 'inner padding / block axis' };
  }
  if (snippet.includes('min height') || snippet.includes('height:') || snippet.includes('height =') || snippet.includes('height=')) {
    if (surface === 'table surface') return { whereLabel: surface, whereDetail: 'row height' };
    if (surface === 'button shell' || surface === 'control shell' || surface === 'navigation surface' || surface === 'feedback surface') {
      return { whereLabel: surface, whereDetail: 'control height' };
    }
    return { whereLabel: surface, whereDetail: 'box height' };
  }
  if (snippet.includes('min width') || snippet.includes('width:') || snippet.includes('width =') || snippet.includes('width=')) {
    if (path.includes('size.32') || snippet.includes('square')) return { whereLabel: surface, whereDetail: 'square size' };
    return { whereLabel: surface, whereDetail: 'control width' };
  }
  if (snippet.includes('gap:')) return { whereLabel: surface, whereDetail: 'inter-item gap' };
  if (snippet.includes('border radius') || snippet.includes('borderradius')) return { whereLabel: surface, whereDetail: 'corner radius' };
  if (snippet.includes('font size') || snippet.includes('fontsize')) return { whereLabel: surface, whereDetail: 'type size' };
  if (snippet.includes('font weight') || snippet.includes('fontweight')) return { whereLabel: surface, whereDetail: 'type weight' };
  if (snippet.includes('line height') || snippet.includes('lineheight')) return { whereLabel: surface, whereDetail: 'line rhythm' };
  if (snippet.includes('icon')) return { whereLabel: surface, whereDetail: 'icon slot' };
  if (snippet.includes('text') || snippet.includes('label')) return { whereLabel: surface, whereDetail: 'label text' };

  return { whereLabel: surface, whereDetail: deriveFallbackAnatomy(tokenPath) };
}

function resolveTokenDescription(path: string): string | null {
  const visited = new Set<string>();
  let currentPath: string | null = path;

  while (currentPath && !visited.has(currentPath)) {
    visited.add(currentPath);

    const description = TOKEN_DESCRIPTIONS.get(currentPath);
    if (description) {
      return description;
    }

    const entry = FLAT_TOKENS.get(currentPath);
    if (!entry || typeof entry.value !== 'string' || !/^\{.+\}$/.test(entry.value)) {
      currentPath = null;
      break;
    }

    currentPath = entry.value.slice(1, -1);
  }

  return null;
}

export function buildReflectiveTokenRows(tokenMapping: Record<string, string>, componentName?: string, category?: string): ReflectiveTokenRow[] {
  return Object.entries(tokenMapping).map(([role, tokenPath]) => ({
    key: role,
    role,
    tokenPath,
    value: resolveTokenLiteralValue(tokenPath) ?? '—',
    ...deriveWhereFromRole(role, tokenPath, componentName, category),
    description: normalizeTokenDescription(tokenPath, resolveTokenDescription(tokenPath), componentName, category, role),
  }));
}

export function buildObservedTokenRows(
  observedTokens: Array<{ raw: string; tokenPath?: string; sourceLine?: number; sourceSnippet?: string }>,
  existingTokenPaths: Set<string> = new Set(),
  componentName?: string,
  category?: string,
): ReflectiveTokenRow[] {
  return observedTokens
    .filter((entry) => entry.tokenPath && !existingTokenPaths.has(entry.tokenPath))
    .map((entry) => ({
      key: entry.raw,
      role: entry.raw,
      raw: entry.raw,
      tokenPath: entry.tokenPath!,
      value: resolveTokenLiteralValue(entry.tokenPath!) ?? '—',
      ...deriveWhereFromSnippet(entry.sourceSnippet, entry.tokenPath!, componentName, category),
      description: normalizeTokenDescription(
        entry.tokenPath!,
        resolveTokenDescription(entry.tokenPath!),
        componentName,
        category,
        undefined,
        entry.sourceSnippet,
      ),
      runtimeOnly: true,
    }));
}
