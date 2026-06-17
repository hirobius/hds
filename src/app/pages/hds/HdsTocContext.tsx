/**
 * HdsTocContext — TOC registration context, active-section tracker, and slug helper.
 *
 * Extracted from HDSLayout.tsx to break the circular-dependency between
 * HdsDocPrimitives (which needs useToc for DocSection) and HDSLayout (which
 * provides TocProvider and renders TocPanel / TocMobileDropdown).
 *
 * No styles, no layout — pure state and behaviour.
 *
 * 12j: MutationObserver (debounced 150 ms) watches the doc content root for
 * late-rendered headings — collapsibles, lazy-loaded sections, etc.
 * Observer mounts in TocProvider.useEffect; disconnects on cleanup.
 */

import React, { useState, useEffect, useRef, useContext, createContext, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TocItem { id: string; title: string; }
interface TocCtx { items: TocItem[]; register: (i: TocItem) => void; unregister: (id: string) => void; }

// ── Context ────────────────────────────────────────────────────────────────

const TocContext = createContext<TocCtx>({ items: [], register: () => {}, unregister: () => {} });

export function useToc() { return useContext(TocContext); }

/** DOM attribute written by DocSection / DocSubsection / HdsFoundationSection. */
export const TOC_TITLE_ATTR = 'data-toc-title';

/** CSS selector for sections that opted into DOM-level TOC tracking. */
const TOC_SECTION_SELECTOR = `section[id][${TOC_TITLE_ATTR}]`;

/** Debounce window for the MutationObserver re-scan (ms).
 *  150 ms is long enough to collapse rapid collapsible-open bursts
 *  while staying imperceptible to the user.                          */
const MUTATION_DEBOUNCE_MS = 150;

/** ID of the doc-shell content root. The observer mounts here so it
 *  can't accidentally fire on nav / sidebar mutations.               */
const CONTENT_ROOT_ID = 'hds-doc-shell-main';

export function TocProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const register   = useCallback((item: TocItem) => {
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [...prev, item]);
  }, []);
  const unregister = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // ── 12j: MutationObserver — late-rendered heading sync ──────────────────
  // Watches the doc content root for subtree childList mutations.
  // On each batch (debounced 150 ms) we reconcile the live DOM against the
  // registered items list:
  //   • Sections present in DOM but absent from items → register them.
  //   • Items absent from DOM → unregister them.
  // This is a safety net for React conditional rendering (collapsibles,
  // lazy-loaded sections) where useLayoutEffect fires but a race with
  // state updates could delay registration, and for any raw-HTML heading
  // content injected outside the component tree.
  useEffect(() => {
    const root = document.getElementById(CONTENT_ROOT_ID) ?? document.body;

    const resync = () => {
      const domSections = Array.from(
        root.querySelectorAll<HTMLElement>(TOC_SECTION_SELECTOR)
      );

      // Register items present in DOM but not yet tracked.
      for (const el of domSections) {
        const id    = el.id;
        const title = el.getAttribute(TOC_TITLE_ATTR) ?? '';
        if (id && title) {
          register({ id, title });
        }
      }

      // Unregister items whose anchor element has been removed from the root.
      // We check all items — both data-toc-title sections (DocSection path)
      // and HeadingAnchor items (h2/h3[id] path). Any item whose element
      // is no longer in the root DOM is pruned.
      // IDs are slugify()-produced (lowercase alphanumeric + hyphens) so they
      // are safe in an attribute selector without additional escaping.
      setItems(prev =>
        prev.filter(item => root.querySelector(`[id="${item.id}"]`) !== null)
      );
    };

    const observer = new MutationObserver(() => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(resync, MUTATION_DEBOUNCE_MS);
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  // register is stable (useCallback []). resync reads items via closure but
  // only writes via setItems(prev => ...) so stale-closure is safe here.
  }, [register]);

  return <TocContext.Provider value={{ items, register, unregister }}>{children}</TocContext.Provider>;
}

// ── Active-section tracker ─────────────────────────────────────────────────

export function useTocActiveId(items: TocItem[]) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (items.length === 0) { setActiveId(''); return; }

    const elements = items
      .map(item => ({ item, el: document.getElementById(item.id) }))
      .filter((entry): entry is { item: TocItem; el: HTMLElement } => Boolean(entry.el));

    if (elements.length === 0) { setActiveId(items[0]?.id ?? ''); return; }

    const activationLine = () => Math.max(128, Math.min(window.innerHeight * 0.35, 280));

    const resolveActiveId = () => {
      const line = activationLine();
      let nextActiveId = items[0]?.id ?? '';
      let foundCurrent = false;
      let foundVisible = false;

      for (const { item, el } of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;

        foundVisible = true;
        if (rect.top <= line) {
          nextActiveId = item.id;
          foundCurrent = true;
        } else if (!foundCurrent) {
          nextActiveId = item.id;
          break;
        }
      }

      if (!foundVisible) return items[0]?.id ?? '';
      return nextActiveId;
    };

    let rafId = 0;
    const updateActiveId = () => {
      rafId = 0;
      const nextActiveId = resolveActiveId();
      setActiveId(current => (current === nextActiveId ? current : nextActiveId));
    };

    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateActiveId);
    };

    updateActiveId();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [items]);

  return activeId;
}

// ── Slug helper ────────────────────────────────────────────────────────────

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
