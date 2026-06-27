/** @internal — search engine behind the CommandPalette; not part of the public API. */
/**
 * hds-search — the manifest search engine extracted from CommandPalette.
 *
 * A dependency-free subsequence + position scorer (think micro-fzf) over four
 * corpora drawn from `virtual:hds-manifest`: component specs, utilities, role
 * tokens, and curated foundation sections. Pure and side-effect-free — the
 * manifest is passed in, never read from a module global — so it is unit-tested
 * directly (see scripts/../tests/hds-search.test.ts) rather than through a
 * component test hook.
 *
 * Lifted from command-palette.tsx per ADR-011's review (deep module behind a
 * narrow interface): the UI shell now imports { buildIndex, rank } and owns no
 * search logic.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

// Import canonical types for local use, and re-export them so that consumers
// that already import from this module (e.g. command-palette.tsx) keep working
// unchanged.
import type { ManifestSpec, RoleToken, SystemManifest } from '../data/manifest-types';

export type { ManifestSpec, RoleToken, SystemManifest };

export type ResultKind = 'component' | 'pattern' | 'template' | 'utility' | 'token' | 'section';

export interface PaletteResult {
  id: string;
  label: string;
  description: string;
  kind: ResultKind;
  /** Where Enter/click navigates — relative React Router path. */
  to: string;
  /** Source string used for fuzzy matching (lowercased). */
  haystack: string;
}

export const KIND_LABEL: Record<ResultKind, string> = {
  component: 'Component',
  pattern: 'Pattern',
  template: 'Template',
  utility: 'Utility',
  token: 'Token',
  section: 'Section',
};

export const MAX_RESULTS = 30;

// ── Sanitization ──────────────────────────────────────────────────────────────

// HMAC-style noise: long hex sequences (32+ chars), `sig=…`, base64-ish blobs,
// and `Bearer `/`token=` prefixes occasionally surface in upstream descriptions
// or alias fields. Strip them before they reach the result row.
const HMAC_NOISE = [
  /\b[a-f0-9]{32,}\b/gi,
  /\bsig=[A-Za-z0-9+/=_-]{8,}/gi,
  /\bsignature=[A-Za-z0-9+/=_-]{8,}/gi,
  /\bBearer\s+[A-Za-z0-9._-]{8,}/gi,
  /\btoken=[A-Za-z0-9._-]{8,}/gi,
  /\bX-Amz-[A-Za-z-]+=[^&\s]+/gi,
];

export function sanitize(text: string): string {
  let out = text;
  for (const re of HMAC_NOISE) out = out.replace(re, '');
  return out.replace(/\s+/g, ' ').trim();
}

// ── Index build ───────────────────────────────────────────────────────────────

const FOUNDATION_SECTIONS: Array<{ label: string; to: string; description: string }> = [
  { label: 'Overview', to: '/color', description: 'HDS landing page' },
  { label: 'Color', to: '/color', description: 'Color tokens and roles' },
  { label: 'Typography', to: '/typography', description: 'Type ramp and pairings' },
  { label: 'Spacing', to: '/spacing', description: 'Spacing scale' },
  { label: 'Shape', to: '/shape', description: 'Radius and shape tokens' },
  { label: 'Elevation', to: '/elevation', description: 'Shadow and z-index' },
  { label: 'Motion', to: '/motion', description: 'Easing and duration' },
  { label: 'Breakpoints', to: '/breakpoints', description: 'Responsive breakpoints' },
  { label: 'Token Reference', to: '/tokens', description: 'Full token catalog' },
];

const COMPONENT_CATEGORY_TO_ROUTE: Record<string, string> = {
  Actions: 'actions',
  Inputs: 'inputs',
  Display: 'display',
  Feedback: 'feedback',
  Navigation: 'navigation',
  Layout: 'layout',
  Overlays: 'display',
  Branding: 'display',
  Utilities: 'doc-utilities',
};

function specToRoute(name: string, spec: ManifestSpec): string | null {
  if (spec.tier === 'pattern') return `/patterns/${name}`;
  if (spec.tier === 'template') return `/templates/${name}`;
  if (spec.tier === 'primitive') {
    const seg = COMPONENT_CATEGORY_TO_ROUTE[spec.category ?? 'Uncategorized'] ?? 'doc-utilities';
    return `/components/${seg}#${name}`;
  }
  return null;
}

/** Build the searchable index from a manifest. Pure — pass the manifest in. */
export function buildIndex(manifest: SystemManifest): PaletteResult[] {
  const out: PaletteResult[] = [];

  // 1. componentSpecs (primitive / pattern / template)
  const specs = manifest.componentSpecs ?? {};
  for (const [name, spec] of Object.entries(specs)) {
    if (!spec || spec.hidden || spec.docExempt) continue;
    const route = specToRoute(name, spec);
    if (!route) continue;
    const kind: ResultKind =
      spec.tier === 'pattern' ? 'pattern' : spec.tier === 'template' ? 'template' : 'component';
    const description = sanitize(spec.description ?? spec.category ?? '');
    out.push({
      id: `spec:${name}`,
      label: name,
      description,
      kind,
      to: route,
      haystack: `${name} ${spec.category ?? ''} ${description}`.toLowerCase(),
    });
  }

  // 2. utilities
  const utils = manifest.utilities ?? {};
  for (const [name, spec] of Object.entries(utils)) {
    if (!spec || spec.hidden) continue;
    const description = sanitize(spec.description ?? '');
    out.push({
      id: `util:${name}`,
      label: name,
      description,
      kind: 'utility',
      // Utilities don't have dedicated doc pages; route to the utilities aggregator.
      to: `/components/doc-utilities#${name}`,
      haystack: `${name} ${description}`.toLowerCase(),
    });
  }

  // 3. role tokens (manifest.tokens.role can be array-like or object)
  const role = manifest.tokens?.role;
  if (role) {
    const entries: RoleToken[] = Array.isArray(role) ? role : Object.values(role);
    for (const tok of entries) {
      if (!tok?.path) continue;
      const description = sanitize(tok.description ?? tok.alias ?? '');
      out.push({
        id: `token:${tok.path}`,
        label: tok.path,
        description,
        kind: 'token',
        to: `/tokens#${encodeURIComponent(tok.path)}`,
        haystack: `${tok.path} ${tok.cssVar ?? ''} ${description}`.toLowerCase(),
      });
    }
  }

  // 4. section anchors (foundations + tokens)
  for (const section of FOUNDATION_SECTIONS) {
    out.push({
      id: `section:${section.to}`,
      label: section.label,
      description: section.description,
      kind: 'section',
      to: section.to,
      haystack: `${section.label} ${section.description}`.toLowerCase(),
    });
  }

  return out;
}

// ── Fuzzy matcher ─────────────────────────────────────────────────────────────

/**
 * Subsequence + position scorer:
 *   - Every char in `query` must appear in order inside `haystack`.
 *   - Earlier matches score higher (heavy weight on first hit).
 *   - Adjacent-char streaks score higher (clustered matches).
 *   - Word-start hits get a bonus.
 *
 * Returns -Infinity if `query` is not a subsequence of `haystack`.
 */
export function fuzzyScore(query: string, haystack: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const h = haystack; // expected pre-lowercased
  let score = 0;
  let qi = 0;
  let lastMatch = -2;
  let streak = 0;

  for (let hi = 0; hi < h.length && qi < q.length; hi++) {
    if (h[hi] === q[qi]) {
      // Word-start bonus: previous char is a separator or this is index 0.
      const prev = hi === 0 ? ' ' : h[hi - 1];
      const isWordStart = /[\s\-_./]/.test(prev);
      score += 10;
      if (isWordStart) score += 8;
      if (hi === lastMatch + 1) {
        streak += 1;
        score += 6 * streak; // adjacency reward
      } else {
        streak = 0;
      }
      // Earlier matches > later matches.
      score -= hi * 0.1;
      lastMatch = hi;
      qi += 1;
    }
  }

  if (qi < q.length) return -Infinity;
  // Shorter matches preferred when scores tie.
  score -= h.length * 0.01;
  return score;
}

/** Rank items against a query. Empty query → a stable starter set. */
export function rank(query: string, items: PaletteResult[]): PaletteResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    // Empty query: surface a stable starter set (sections first, then specs alphabetically).
    return items
      .slice()
      .sort((a, b) => {
        if (a.kind === b.kind) return a.label.localeCompare(b.label);
        if (a.kind === 'section') return -1;
        if (b.kind === 'section') return 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, MAX_RESULTS);
  }
  const scored: Array<{ item: PaletteResult; score: number }> = [];
  for (const item of items) {
    const s = fuzzyScore(trimmed, item.haystack);
    if (s !== -Infinity) scored.push({ item, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RESULTS).map((s) => s.item);
}
