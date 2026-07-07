/**
 * Guards the generated nav model (ADR-017):
 *  - rehydration — the sidebar's `HDS_NAV_SECTIONS` (Phase 3: now derived FROM
 *    the model) faithfully reflects the model: same sections/items, and the
 *    getExact/getIndent predicates fire exactly where the model's exact/indent
 *    flags are set.
 *
 * The generator drift check (comparing the committed `nav-model.json` against
 * a fresh `buildNavModel()` run) was removed with the docs SPA teardown (#51):
 * `scripts/generate-nav-model.mjs` walks `src/app/pages/hds/**`, which no
 * longer exists now that Storybook is the docs surface. `nav-model.json`
 * itself is retained as a frozen data artifact — it still feeds the
 * library-exported `CommandPalette` search corpus via `hds-search.ts` — and
 * regenerating/pruning it is deferred to the guardrail-script follow-up PR.
 */
import { describe, it, expect } from 'vitest';
import { navModel } from './nav-model';
import { HDS_NAV_SECTIONS } from './hds-nav-data';

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
