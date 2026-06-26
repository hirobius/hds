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
import {
  buildIndex,
  rank,
  KIND_LABEL,
  type PaletteResult,
  type SystemManifest,
} from '../lib/hds-search';
import { Dialog } from './dialog';

const MANIFEST = systemManifestData as SystemManifest;

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

    const index = React.useMemo(() => buildIndex(MANIFEST), []);
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
