/**
 * Guards the generated nav model (ADR-017):
 *  1. drift — the committed nav-model.json equals a fresh generation, so a page
 *     `meta` edit without `pnpm nav:generate` fails CI.
 *  2. rehydration — the sidebar's `HDS_NAV_SECTIONS` (Phase 3: now derived FROM
 *     the model) faithfully reflects the model: same sections/items, and the
 *     getExact/getIndent predicates fire exactly where the model's exact/indent
 *     flags are set.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs generator without type declarations; runtime import is fine.
import { buildNavModel } from '../../../scripts/generate-nav-model.mjs';
import { navModel } from './nav-model';
import { HDS_NAV_SECTIONS } from './hds-nav-data';

describe('nav-model.json', () => {
  it('is up to date with the generator (run `pnpm nav:generate` if this fails)', () => {
    const fresh = buildNavModel(process.cwd());
    expect(navModel).toEqual(fresh);
  });
});

describe('HDS_NAV_SECTIONS', () => {
  it('rehydrates the model: same labels, items, and exact/indent predicates', () => {
    const rendered = HDS_NAV_SECTIONS.map((section) => ({
      label: section.label,
      items: section.items.map((item) => {
        const link: { path: string; label: string; exact?: boolean; indent?: boolean } = {
          path: item.path,
          label: item.label,
        };
        if (section.getExact?.(item)) link.exact = true;
        if (section.getIndent?.(item)) link.indent = true;
        return link;
      }),
    }));
    // Compare the sidebar-relevant fields only — the model also carries
    // `description` (a search-corpus field the sidebar ignores).
    const expected = navModel.sections.map((section) => ({
      label: section.label,
      items: section.items.map(({ path, label, exact, indent }) => {
        const link: { path: string; label: string; exact?: boolean; indent?: boolean } = {
          path,
          label,
        };
        if (exact) link.exact = true;
        if (indent) link.indent = true;
        return link;
      }),
    }));
    expect(rendered).toEqual(expected);
  });
});
