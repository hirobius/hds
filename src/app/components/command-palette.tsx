// motion-ok: Radix Dialog manages enter/exit motion; results list non-animated by design
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * CommandPalette — Cmd-K / Ctrl-K fuzzy-search over the HDS manifest.
 * @category Overlays
 * @tier utility
 * @doc-exempt: doc-shell scaffolding (9d-2); not part of the public authoring surface
 *
 * Built on Dialog (8s-7 / Radix) with a custom listbox + input. NO new
 * npm deps — search is a hand-rolled subsequence + token-Levenshtein scorer
 * (think micro-fzf). Indexes four corpora from `virtual:hds-manifest`:
 *
 *   1. componentSpecs — non-hidden, non-docExempt entries (primitive / pattern / template)
 *   2. utilities      — non-hidden entries (utility tier)
 *   3. role tokens    — `role.*` entries from manifest.tokens.role
 *   4. section anchors — curated /hds foundation + tokens pages
 *
 * Each row carries a tier chip + brief description. Enter (or click)
 * navigates via React Router; Esc closes. ↑/↓ wraps. Cmd-K / Ctrl-K
 * toggles open from anywhere in the doc shell.
 *
 * Result rows sanitize free-text: HMAC-style tokens (long hex / signed
 * URL fragments that may leak from upstream description fields) are
 * stripped before render.
 */

import * as React from 'react';
import { useNavigate } from 'react-router';
import systemManifestData from 'virtual:hds-manifest';
import { cn } from '../../lib/utils';
import { Dialog } from './dialog';

// ── Types ─────────────────────────────────────────────────────────────────────

type ManifestSpec = {
  category?: string;
  tier?: string;
  hidden?: boolean;
  docExempt?: boolean;
  description?: string;
};

type RoleToken = {
  path?: string;
  cssVar?: string;
  description?: string;
  alias?: string;
};

type SystemManifest = {
  componentSpecs?: Record<string, ManifestSpec>;
  utilities?: Record<string, ManifestSpec>;
  tokens?: { role?: Record<string, RoleToken> | RoleToken[] };
};

const MANIFEST = systemManifestData as SystemManifest;

type ResultKind = 'component' | 'pattern' | 'template' | 'utility' | 'token' | 'section';

interface PaletteResult {
  id: string;
  label: string;
  description: string;
  kind: ResultKind;
  /** Where Enter/click navigates — relative React Router path. */
  to: string;
  /** Source string used for fuzzy matching (lowercased). */
  haystack: string;
}

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

function sanitize(text: string): string {
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

function buildIndex(): PaletteResult[] {
  const out: PaletteResult[] = [];

  // 1. componentSpecs (primitive / pattern / template)
  const specs = MANIFEST.componentSpecs ?? {};
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
  const utils = MANIFEST.utilities ?? {};
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
  const role = MANIFEST.tokens?.role;
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
function fuzzyScore(query: string, haystack: string): number {
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

const KIND_LABEL: Record<ResultKind, string> = {
  component: 'Component',
  pattern: 'Pattern',
  template: 'Template',
  utility: 'Utility',
  token: 'Token',
  section: 'Section',
};

const MAX_RESULTS = 30;

function rank(query: string, items: PaletteResult[]): PaletteResult[] {
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

// ── Component ─────────────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  /** Optional className for the trigger button. */
  className?: string;
}

/**
 * Mountable trigger + dialog. Drop into header slot; component manages its
 * own open state and Cmd-K / Ctrl-K global keybinding.
 */
export const CommandPalette = React.forwardRef<HTMLInputElement, CommandPaletteProps>(
  function CommandPalette({ className }: CommandPaletteProps = {}, ref) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [activeIndex, setActiveIndex] = React.useState(0);
    const navigate = useNavigate();

    const index = React.useMemo(buildIndex, []);
    const results = React.useMemo(() => rank(query, index), [query, index]);

    // Reset selection when results change.
    React.useEffect(() => {
      setActiveIndex(0);
    }, [query]);

    // Global Cmd-K / Ctrl-K toggle.
    React.useEffect(() => {
      function onKeyDown(e: KeyboardEvent) {
        const isModK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
        if (isModK) {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
      }
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // When closed, reset query so re-open is fresh.
    React.useEffect(() => {
      if (!open) {
        setQuery('');
        setActiveIndex(0);
      }
    }, [open]);

    function commit(item: PaletteResult) {
      setOpen(false);
      navigate(item.to);
    }

    function onListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) =>
          results.length === 0 ? 0 : (i - 1 + results.length) % results.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = results[activeIndex];
        if (item) commit(item);
      }
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          type="button"
          aria-label="Search docs"
          className={cn(
            'mx-6 hidden min-w-0 max-w-md flex-1 items-center md:flex',
            'h-8 rounded-md border border-border bg-muted px-3',
            // 9d-10 a11y: visible "Search docs…" label promoted from
            // text-muted-foreground → text-foreground so the trigger meets
            // WCAG AA contrast (4.5:1) against bg-muted at 12px. The kbd
            // glyphs stay muted — they're decorative shortcut hints with
            // their own bordered surface (bg-background) and read as a
            // group, not as primary content.
            'text-xs text-foreground',
            'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <span className="truncate">Search docs…</span>
          {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- 10px is the standard shadcn cmd-palette kbd metadata size */}
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 pl-3 text-[10px]">
            {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- kbd shortcut hint */}
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
              ⌘
            </kbd>
            {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- kbd shortcut hint */}
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
              K
            </kbd>
          </span>
        </Dialog.Trigger>
        <Dialog.Content
          className={cn(
            // tw-ok: Radix/shadcn cmd-palette vertical placement (20% from top)
            'top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0',
          )}
          hideClose
          onKeyDown={onListKeyDown}
        >
          <Dialog.Title className="sr-only">Search docs</Dialog.Title>
          <Dialog.Description className="sr-only">
            Type to search components, utilities, role tokens, and section anchors. Use arrow keys
            to navigate and enter to select.
          </Dialog.Description>
          <div className="flex items-center border-b border-border px-4">
            <input
              ref={ref}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components, tokens, sections…"
              aria-label="Search query"
              aria-controls="hds-cmdk-list"
              aria-activedescendant={
                results[activeIndex] ? `hds-cmdk-row-${results[activeIndex].id}` : undefined
              }
              className={cn(
                'h-12 w-full bg-transparent text-sm text-foreground outline-none',
                'placeholder:text-muted-foreground',
              )}
            />
          </div>
          <div
            id="hds-cmdk-list"
            role="listbox"
            aria-label="Search results"
            // eslint-disable-next-line tailwindcss/no-arbitrary-value -- dialog results scroll cap at 60% viewport height
            className="max-h-[60vh] overflow-y-auto py-1"
          >
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              <ul className="flex flex-col">
                {results.map((item, i) => {
                  const active = i === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        id={`hds-cmdk-row-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => commit(item)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-2 text-left hds-focus',
                          active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            // tw-ok: kind-label badge metadata size
                            'mt-0.5 inline-flex h-5 shrink-0 items-center rounded-sm border px-1.5 text-[10px] uppercase tracking-wide',
                            active
                              ? 'border-accent-foreground/30 text-accent-foreground'
                              : 'border-border text-muted-foreground',
                          )}
                        >
                          {KIND_LABEL[item.kind]}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{item.label}</span>
                          {item.description ? (
                            <span
                              className={cn(
                                'truncate text-xs',
                                active ? 'text-accent-foreground/80' : 'text-muted-foreground',
                              )}
                            >
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- footer hint metadata size */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">
                ↑↓
              </kbd>{' '}
              navigate{' '}
              <kbd className="ml-2 rounded border border-border bg-background px-1 py-0.5 font-mono">
                ↵
              </kbd>{' '}
              select{' '}
              <kbd className="ml-2 rounded border border-border bg-background px-1 py-0.5 font-mono">
                esc
              </kbd>{' '}
              close
            </span>
            <span>
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
          </div>
        </Dialog.Content>
      </Dialog>
    );
  },
);

CommandPalette.displayName = 'CommandPalette';

// Test hooks (named exports kept internal-only — no barrel re-export).
export const __test__ = { fuzzyScore, sanitize, rank, buildIndex };
