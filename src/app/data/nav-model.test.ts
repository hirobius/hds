/**
 * Guards the generated nav model (ADR-017, Phase 1):
 *  1. drift — the committed nav-model.json equals a fresh generation, so a
 *     registry edit without `pnpm nav:generate` fails CI.
 *  2. behavior-preservation — the model encodes exactly what the live
 *     `HDS_NAV_SECTIONS` renders today (same sections, items, and the
 *     getExact/getIndent predicates flattened to exact/indent flags), so the
 *     later swap of consumers onto the model is provably a no-op.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs generator without type declarations; runtime import is fine.
import { buildNavModel } from '../../../scripts/generate-nav-model.mjs';
import { navModel, type NavLink } from './nav-model';
import { HDS_NAV_SECTIONS } from './hds-nav-data';

describe('nav-model.json', () => {
  it('is up to date with the generator (run `pnpm nav:generate` if this fails)', () => {
    const fresh = buildNavModel(process.cwd());
    expect(navModel).toEqual(fresh);
  });

  it('encodes exactly what HDS_NAV_SECTIONS renders today', () => {
    const expected = HDS_NAV_SECTIONS.map((section) => ({
      label: section.label,
      items: section.items.map((item) => {
        const link: NavLink = { path: item.path, label: item.label };
        if (section.getExact?.(item)) link.exact = true;
        if (section.getIndent?.(item)) link.indent = true;
        return link;
      }),
    }));
    expect(navModel.sections).toEqual(expected);
  });
});
