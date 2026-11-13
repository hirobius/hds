import { describe, expect, it } from 'vitest';
import hds from '../tokens';
import * as lean from '../component-tokens';

// component-tokens.ts repeats these paths so components need not import the whole bridge (hds#1519).
describe('component-tokens parity with hds', () => {
  it('keeps every type role the same keys, values and order', () => {
    for (const [name, style] of Object.entries(lean.typeStyles)) {
      const full = hds.typeStyles[name as keyof typeof hds.typeStyles];
      expect(style).toEqual(full);
      expect(Object.keys(style)).toEqual(Object.keys(full));
    }
  });

  it('keeps the scalar tokens equal', () => {
    expect(lean.space).toEqual(hds.space);
    expect(Object.keys(lean.space)).toEqual(Object.keys(hds.space));
    expect(lean.scale).toEqual(hds.semantic.space.scale);
    expect(lean.subgrid).toEqual(hds.semantic.space.subgrid);
    expect(lean.sidebar).toEqual({
      gap: hds.semantic.space.sidebar.gap,
      sectionGap: hds.semantic.space.sidebar.sectionGap,
    });
    expect(lean.FIXED_2XS).toBe(hds.semantic.space.fixed['2xs']);
    expect(lean.iconSize).toEqual(hds.iconSize);
    expect(lean.FONT_FAMILY).toBe(hds.fontFamily);
    expect(lean.BORDER_WIDTH_DEFAULT).toBe(hds.borderWidth.default);
    expect(lean.RADIUS_FULL).toBe(hds.borderRadius.full);
    expect(lean.RADIUS_2).toBe(hds.borderRadius[2]);
    expect(lean.CONTENT_ON_ACCENT).toBe(hds.color.content.onAccent);
    expect(lean.Z_FOCUS).toBe(hds.zIndex.focus);
    expect(lean.Z_MODAL).toBe(hds.zIndex.modal);
    expect(lean.BREAKPOINT_SM).toBe(hds.breakpoints.sm);
    expect(lean.BREAKPOINT_LG).toBe(hds.breakpoints.lg);
  });

  it('covers every export the module has', () => {
    const covered = [
      'typeStyles',
      'space',
      'scale',
      'subgrid',
      'sidebar',
      'FIXED_2XS',
      'iconSize',
      'FONT_FAMILY',
      'BORDER_WIDTH_DEFAULT',
      'RADIUS_FULL',
      'RADIUS_2',
      'CONTENT_ON_ACCENT',
      'Z_FOCUS',
      'Z_MODAL',
      'BREAKPOINT_SM',
      'BREAKPOINT_LG',
    ];
    expect(Object.keys(lean).sort()).toEqual([...covered].sort());
  });
});
