/**
 * box-sx.ts — pure resolver + CSS injector for Box's `sx` prop.
 *
 * Deliberately React-free (its one import is the dev-only `warnOnce`) so the
 * resolver is unit testable in isolation from the component tree. Its
 * consumers: `box.tsx` re-exports the types below as part of the public `Box`
 * API; `stack.tsx` resolves its `gap` through `resolveSpacingValue`, the one
 * spacing resolver (hds#206); and the layout components (Grid, Sidebar,
 * Switcher, Card) resolve theirs through it against `LAYOUT_GAP`, the one copy
 * of the layout-gap names (hds#404).
 *
 * @internal — the resolver internals (`resolveSx`, `sxClassName`, `injectSx`)
 * are exported for testing, and `resolveSpacingValue`, `SpacingVocabulary`,
 * `SPACE_SCALE`, `LAYOUT_GAP_NAMES` and `LAYOUT_GAP` for the components. The
 * supported public surface is `Box` + the `Sx*` types, both re-exported from
 * `box.tsx`.
 */

import { warnOnce } from '../../lib/deprecation';

// ── Breakpoints ──────────────────────────────────────────────────────────────
// Mirrors `hds.breakpoints` in `src/app/design-system/tokens.ts` (itself
// sourced from the `primitive.breakpoint.*` DTCG tokens): xs 375 / sm 640 /
// md 768 / lg 1024 / xl 1280. Duplicated here — rather than importing
// tokens.ts, which pulls in a `React` import — to keep this module a pure,
// zero-React resolver that can be unit tested without a DOM/React harness.
// breakpoint-ok: mirrors hds.breakpoints (tokens.ts is the source of truth); duplicated for zero-dependency test isolation, not a fresh invention of the scale.
export const BOX_BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BOX_BREAKPOINTS;

const BREAKPOINT_KEYS: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

// ── Public sx value types ────────────────────────────────────────────────────

export type SxValue = string | number;

export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

/**
 * The `sx` object shape. Keys are either:
 *  - a CSS-property-ish key (camelCase, e.g. `p`, `color`, `marginTop`) whose
 *    value is a plain `SxValue` or a `{ xs, sm, md, lg, xl }` responsive map, or
 *  - a `&`-prefixed nested-selector key (`'&:hover'`, `'& > *'`,
 *    `'&[data-state=open]'`) whose value is itself a nested `SxObject`.
 */
export interface SxObject {
  [key: string]: ResponsiveValue<SxValue> | SxObject | undefined;
}

// ── Unitless numeric props (no implicit `px`) ────────────────────────────────

const UNITLESS = new Set([
  'opacity',
  'zIndex',
  'fontWeight',
  'lineHeight',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'zoom',
  'tabSize',
  'aspectRatio',
]);

// ── Spacing shorthands → HDS scale ───────────────────────────────────────────

// The `--primitive-space-<n>` tokens that actually exist (4px base scale;
// see hirobius.tokens.json primitive.space.*). Any other integer falls back
// tier-ok: prose reference inside a comment, not a live token usage, hds#186
// to `calc(var(--primitive-space-1) * n)` so the value still resolves off the
// 4px unit rather than a raw px literal.
const EXISTING_SPACE_SCALE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 32]);

// hds#206 item 4: Box `sx` and Stack `gap` resolve spacing through
// `resolveSpacingValue` below. Each passes its own vocabulary: the names it
// accepts and what a number means. The vocabularies are frozen at what each
// rendered before hds#206, so no consumer's spacing moves before the 1.0
// alias removal (scripts/__tests__/spacing-computed-lock.test.mjs).

/** The canonical t-shirt scale, `semantic.space.scale.{xs,sm,md,lg,xl}` (hds#206). */
export const SPACE_SCALE = {
  xs: 'var(--semantic-space-scale-xs)',
  sm: 'var(--semantic-space-scale-sm)',
  md: 'var(--semantic-space-scale-md)',
  lg: 'var(--semantic-space-scale-lg)',
  xl: 'var(--semantic-space-scale-xl)',
} as const;

/**
 * The names a spacing prop accepts, and what any other value means there.
 *
 * An open vocabulary passes any other string through ('auto', '1rem', a
 * `var()`) and reads a number by `numbers`: `'units'` is a count of 4px
 * units (Box `sx`), `'raw'` returns the number as-is for React's inline
 * style to read as px (Stack and Card `gap`).
 *
 * A closed vocabulary resolves its own names and nothing else: any other
 * value, a number included, resolves to `undefined`, so the prop sets no
 * style. That is what the layout components rendered before hds#404, when
 * each looked a value up in a private map.
 */
export type SpacingVocabulary =
  | { readonly names: Readonly<Record<string, string>>; readonly numbers: 'units' | 'raw' }
  | { readonly names: Readonly<Record<string, string>>; readonly closed: true };

type OpenSpacingVocabulary = Extract<SpacingVocabulary, { readonly numbers: unknown }>;
type ClosedSpacingVocabulary = Extract<SpacingVocabulary, { readonly closed: true }>;

/**
 * The layout-gap names (hds#404): the only copy of the four names the layout
 * components take for a gap, a gutter or a bleed, with the same values as
 * Stack's `gap`:
 *
 *   tight    → var(--semantic-space-scale-sm)
 *   normal   → var(--semantic-space-scale-md)
 *   inset    → var(--semantic-space-scale-lg)
 *   spacious → var(--semantic-space-scale-xl)
 *
 * They read the scale steps, so compact density tightens them. Box `sx`'s
 * deprecated names of the same spelling read the fixed layout vars instead
 * (BOX_SX_SPACING below). scripts/check-layout-gap-vocabulary.mjs fails a
 * second copy anywhere else in src/.
 */
export const LAYOUT_GAP_NAMES = {
  tight: SPACE_SCALE.sm,
  normal: SPACE_SCALE.md,
  inset: SPACE_SCALE.lg,
  spacious: SPACE_SCALE.xl,
} as const;

/**
 * Grid, Sidebar and Switcher `gap` (Cluster, Cover, Bleed and Center, which
 * read it too, went in 0.20.0, hds#394): the four layout-gap names, plus
 * `medium` (hds#393), and nothing else. Closed, so an untyped value sets no style, as it did before
 * hds#404 (scripts/__tests__/spacing-computed-lock.test.mjs).
 *
 * `medium` is the 12px default gap of TileGrid (removed in 0.20.0, hds#395),
 * `semantic.space.component.medium`, the step Stack's `medium` reads. Unlike
 * the four names it is fixed: compact density does not remap it, as it did not
 * remap TileGrid's 12px. Only
 * Grid's `gap` type takes it so far. It stays out of LAYOUT_GAP_NAMES, so
 * Card and Stack, which spread those names, do not change.
 */
export const LAYOUT_GAP = {
  names: { ...LAYOUT_GAP_NAMES, medium: 'var(--semantic-space-component-medium)' },
  closed: true,
} satisfies SpacingVocabulary;

/**
 * Box `sx`: the t-shirt scale, plus the deprecated 'tight' | 'normal' |
 * 'inset' | 'spacious' at the vars they read before hds#206. Those are
 * `semantic.space.layout.*`, fixed pixels that compact density does not
 * remap, unlike the scale steps (and unlike Stack's same four names), so
 * they keep their layout var until they are removed in 1.0. The internal
 * spacing codemod skips this file, so it cannot rewrite them to scale steps
 * and change compact pixels. Each warns once in dev (ADR-014 step 1).
 */
const BOX_SX_SPACING = {
  names: {
    ...SPACE_SCALE,
    tight: 'var(--semantic-space-layout-tight)',
    normal: 'var(--semantic-space-layout-normal)',
    inset: 'var(--semantic-space-layout-inset)',
    spacious: 'var(--semantic-space-layout-spacious)',
  },
  numbers: 'units',
} satisfies SpacingVocabulary;

const own = (table: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

/** Box sx's deprecated names and the step replacing each (MIGRATIONS.md, hds#206). */
const BOX_SX_DEPRECATED: Readonly<Record<string, string>> = {
  tight: 'sm',
  normal: 'md',
  inset: 'lg',
  spacious: 'xl',
};

const SPACING_PROP_MAP: Record<string, string[]> = {
  m: ['margin'],
  mt: ['margin-top'],
  mr: ['margin-right'],
  mb: ['margin-bottom'],
  ml: ['margin-left'],
  mx: ['margin-left', 'margin-right'],
  my: ['margin-top', 'margin-bottom'],
  p: ['padding'],
  pt: ['padding-top'],
  pr: ['padding-right'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
  px: ['padding-left', 'padding-right'],
  py: ['padding-top', 'padding-bottom'],
  gap: ['gap'],
  rowGap: ['row-gap'],
  columnGap: ['column-gap'],
};

/**
 * The one spacing resolver for Box `sx`, Stack `gap` and the layout
 * components. A name is looked up in the caller's vocabulary (own keys only,
 * so 'constructor' is not a name). Anything else ('auto', '1rem', a `var()`)
 * passes through an open vocabulary and resolves to `undefined` in a closed
 * one. The return type says which: an open vocabulary never yields
 * `undefined`, so Box cannot emit `margin:undefined`, and a closed one never
 * yields a number.
 */
export function resolveSpacingValue(
  value: SxValue,
  vocabulary: OpenSpacingVocabulary,
): string | number;
export function resolveSpacingValue(
  value: SxValue,
  vocabulary: ClosedSpacingVocabulary,
): string | undefined;
export function resolveSpacingValue(
  value: SxValue,
  vocabulary: SpacingVocabulary,
): string | number | undefined;
export function resolveSpacingValue(
  value: SxValue,
  vocabulary: SpacingVocabulary,
): string | number | undefined {
  if ('closed' in vocabulary) {
    return typeof value === 'string' ? own(vocabulary.names, value) : undefined;
  }
  if (typeof value === 'number') {
    if (vocabulary.numbers === 'raw') return value;
    // This IS the primitive-tier bridge for Box's numeric spacing shorthand
    // (`p`, `m`, `gap`, ...) — same pipeline role as the allowlisted
    // src/app/design-system/tokens.ts, just resolving a scale index to a
    // var() reference dynamically instead of statically. Not a component
    // bypassing the tier; it IS the tier.
    return EXISTING_SPACE_SCALE.has(value)
      ? `var(--primitive-space-${value})` // tier-ok: primitive-tier bridge, hds#186
      : `calc(var(--primitive-space-1) * ${value})`; // tier-ok: primitive-tier bridge, hds#186
  }
  return own(vocabulary.names, value) ?? value;
}

// ── Token colors ──────────────────────────────────────────────────────────────

const COLOR_PROP_MAP: Record<string, string> = {
  color: 'color',
  bgcolor: 'background-color',
  borderColor: 'border-color',
  fill: 'fill',
  stroke: 'stroke',
};

const CONTENT_KEYS = new Set(['primary', 'secondary', 'disabled', 'inverse', 'accent']);
const SURFACE_KEYS = new Set(['page', 'raised', 'overlay', 'accent']);
const BORDER_KEYS = new Set(['default', 'subtle', 'subdued', 'strong', 'accent']);
const FEEDBACK_KEYS = new Set(['success', 'warning', 'error', 'info']);
const ACCENT_KEYS = new Set(['hover', 'pressed', 'subtle', 'content']);

/** Resolves a dotted token key (`'content.primary'`, `'accent'`, `'accent.hover'`) to a CSS var. Returns `undefined` (raw pass-through) for anything unrecognized. */
function resolveColorToken(value: string): string | undefined {
  if (value === 'accent') return 'var(--semantic-accent-rest)';

  const dot = value.indexOf('.');
  if (dot === -1) return undefined;
  const ns = value.slice(0, dot);
  const key = value.slice(dot + 1);

  if (ns === 'content' && CONTENT_KEYS.has(key)) return `var(--semantic-color-content-${key})`;
  if (ns === 'surface' && SURFACE_KEYS.has(key)) return `var(--semantic-color-surface-${key})`;
  if (ns === 'border' && BORDER_KEYS.has(key)) return `var(--semantic-color-border-${key})`;
  if (ns === 'feedback' && FEEDBACK_KEYS.has(key)) return `var(--semantic-color-feedback-${key})`;
  if (ns === 'accent' && ACCENT_KEYS.has(key)) return `var(--semantic-accent-${key})`;
  return undefined;
}

// ── Generic CSS property fallback ────────────────────────────────────────────

function camelToKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Builds one or more `"prop:value"` declaration strings for a single sx key/value pair. */
function buildDeclarations(key: string, value: SxValue): string[] {
  const spacingProps = SPACING_PROP_MAP[key];
  if (spacingProps) {
    const step = typeof value === 'string' ? own(BOX_SX_DEPRECATED, value) : undefined;
    if (step) {
      warnOnce(
        `box-sx-spacing-${value}`,
        `Box sx spacing name '${value}' is deprecated (hds#206) and is removed in 1.0.0. Use '${step}': same pixels at the default density, tighter under compact (MIGRATIONS.md).`,
      );
    }
    // Typed so a closed vocabulary here, which can resolve to undefined, fails typecheck.
    const resolved: string | number = resolveSpacingValue(value, BOX_SX_SPACING);
    return spacingProps.map((prop) => `${prop}:${resolved}`);
  }

  const colorProp = COLOR_PROP_MAP[key];
  if (colorProp) {
    const resolved =
      typeof value === 'string' ? (resolveColorToken(value) ?? value) : String(value);
    return [`${colorProp}:${resolved}`];
  }

  const cssProp = camelToKebab(key);
  const resolved =
    typeof value === 'number' ? (UNITLESS.has(key) ? String(value) : `${value}px`) : value;
  return [`${cssProp}:${resolved}`];
}

function isResponsiveObject(value: unknown): value is Partial<Record<Breakpoint, SxValue>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.keys(value).every((k) => BREAKPOINT_KEYS.includes(k as Breakpoint));
}

// ── Resolver ──────────────────────────────────────────────────────────────────

/**
 * Resolves an `SxObject` into an ordered array of standalone, top-level CSS
 * rule strings ready for individual `CSSStyleSheet.insertRule()` calls.
 *
 * Pure apart from a dev-only deprecation warning; no DOM access. Order: base
 * (non-responsive) rules for every selector encountered (outer class first,
 * then each `&`-selector in declaration order), followed by
 * `@media (min-width: …)` blocks in ascending breakpoint order. Each media
 * block is ONE rule string containing its inner selector rules concatenated
 * as plain text — that concatenation is safe (and required) because a single
 * `insertRule()` call for an `@media {...}` block is one rule; only top-level
 * rule concatenation breaks `insertRule()` (see `injectSx` below).
 */
export function resolveSx(sx: SxObject, className: string): string[] {
  const baseBuckets = new Map<string, string[]>();
  const mediaBuckets = new Map<number, Map<string, string[]>>();

  const addBase = (selectorSuffix: string, decls: string[]) => {
    const arr = baseBuckets.get(selectorSuffix) ?? [];
    arr.push(...decls);
    baseBuckets.set(selectorSuffix, arr);
  };

  const addMedia = (minWidthPx: number, selectorSuffix: string, decls: string[]) => {
    let bucket = mediaBuckets.get(minWidthPx);
    if (!bucket) {
      bucket = new Map();
      mediaBuckets.set(minWidthPx, bucket);
    }
    const arr = bucket.get(selectorSuffix) ?? [];
    arr.push(...decls);
    bucket.set(selectorSuffix, arr);
  };

  const walk = (obj: SxObject, selectorSuffix: string) => {
    for (const [key, raw] of Object.entries(obj)) {
      if (raw === undefined || raw === null) continue;

      if (key.startsWith('&')) {
        walk(raw as SxObject, selectorSuffix + key.slice(1));
        continue;
      }

      if (isResponsiveObject(raw)) {
        for (const bp of BREAKPOINT_KEYS) {
          const v = raw[bp];
          if (v === undefined) continue;
          addMedia(BOX_BREAKPOINTS[bp], selectorSuffix, buildDeclarations(key, v));
        }
        continue;
      }

      addBase(selectorSuffix, buildDeclarations(key, raw as SxValue));
    }
  };

  walk(sx, '');

  const rules: string[] = [];

  for (const [selectorSuffix, decls] of baseBuckets) {
    if (decls.length === 0) continue;
    rules.push(`.${className}${selectorSuffix}{${decls.join(';')}}`);
  }

  const sortedBreakpoints = [...mediaBuckets.entries()].sort((a, b) => a[0] - b[0]);
  for (const [minWidthPx, selectorMap] of sortedBreakpoints) {
    let inner = '';
    for (const [selectorSuffix, decls] of selectorMap) {
      if (decls.length === 0) continue;
      inner += `.${className}${selectorSuffix}{${decls.join(';')}}`;
    }
    if (inner) rules.push(`@media (min-width:${minWidthPx}px){${inner}}`);
  }

  return rules;
}

// ── Deterministic hash → stable class name ───────────────────────────────────

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(',')}}`;
}

/** djb2 — fast, deterministic, non-cryptographic. Sufficient for a CSS class-name discriminator. */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/** Deterministic class name for an sx object — identical objects (by value) share one class/hash. */
export function sxClassName(sx: SxObject): string {
  return `hds-sx-${hashString(stableStringify(sx))}`;
}

// ── Injection (SSR-safe) ──────────────────────────────────────────────────────

const injectedClassNames = new Set<string>();
let managedStyleElement: HTMLStyleElement | null = null;

function getManagedStyleElement(): HTMLStyleElement | null {
  if (typeof document === 'undefined') return null; // SSR / non-DOM environments: no-op.
  if (managedStyleElement && managedStyleElement.isConnected) return managedStyleElement;

  let existing = document.querySelector<HTMLStyleElement>('style[data-hds-sx]');
  if (!existing) {
    existing = document.createElement('style');
    existing.setAttribute('data-hds-sx', '');
    document.head.appendChild(existing);
  }
  managedStyleElement = existing;
  return managedStyleElement;
}

/**
 * Resolves `sx` to its class name and (in a DOM environment) injects its CSS
 * rules into a single managed `<style data-hds-sx>` element, once per unique
 * hash — identical `sx` objects across renders/components share one rule set.
 *
 * SSR-safe: `document` is guarded, so this is a no-op on the server beyond
 * computing the deterministic class name, which is all hydration needs to
 * match markup — the client-side injection then fills in the actual rules.
 *
 * ⚠ CSSStyleSheet.insertRule() bug this fixes: it accepts exactly ONE rule
 * per call. Naively concatenating an sx's base declarations with a
 * `&`-selector (or responsive) rule into one string and calling
 * `insertRule()` once throws a SyntaxError — and if that throw is swallowed
 * (as it was previously), ALL rules are silently dropped, including the base
 * ones: the element gets its class but renders completely unstyled. The fix
 * is `resolveSx()` returning already-split, individually-insertable rule
 * strings, each inserted in its own try/catch here so one bad/unsupported
 * rule can never take the others down with it.
 */
export function injectSx(sx: SxObject): string {
  const className = sxClassName(sx);
  if (injectedClassNames.has(className)) return className;

  const styleElement = getManagedStyleElement();
  if (!styleElement) return className; // SSR: deterministic class name is enough; no sheet to inject into.

  const sheet = styleElement.sheet;
  if (!sheet) return className;

  injectedClassNames.add(className);

  for (const rule of resolveSx(sx, className)) {
    try {
      sheet.insertRule(rule, sheet.cssRules.length);
    } catch {
      // Do not let one malformed/unsupported rule drop the others.
    }
  }

  return className;
}

/** @internal test-only — clears the injection cache and managed stylesheet between test runs. */
export function __resetBoxSxForTests(): void {
  injectedClassNames.clear();
  if (managedStyleElement?.parentNode) {
    managedStyleElement.parentNode.removeChild(managedStyleElement);
  }
  managedStyleElement = null;
}
