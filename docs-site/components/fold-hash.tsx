'use client';

import { useEffect } from 'react';

/** "Design tokens" -> "design-tokens": the hash a folded section answers to. */
export const foldSlug = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Keeps deep links into folded sections working (hds#1395). On load and on every hash change,
 * the target (an element with that id, or a `details.hds-fold` whose summary slugs to the
 * hash, such as #accessibility) is opened, with every closed fold around it, then scrolled to.
 */
export function openFoldForHash(doc: Document = document): HTMLElement | null {
  const id = decodeURIComponent(doc.location.hash.slice(1));
  if (!id) return null;
  let target: HTMLElement | null = doc.getElementById(id);
  if (!target) {
    target =
      Array.from(doc.querySelectorAll<HTMLDetailsElement>('details.hds-fold')).find(
        (d) => foldSlug(d.querySelector('summary')?.textContent ?? '') === id,
      ) ?? null;
  }
  if (!target) return null;
  for (let el: HTMLElement | null = target; el; el = el.parentElement) {
    if (el instanceof HTMLDetailsElement) el.open = true;
  }
  target.scrollIntoView?.({ block: 'start' });
  return target;
}

export function FoldHash() {
  useEffect(() => {
    const run = () => openFoldForHash();
    run();
    window.addEventListener('hashchange', run);
    return () => window.removeEventListener('hashchange', run);
  }, []);
  return null;
}
