import { describe, it, expect } from 'vitest';
import { brandOverlayVars, brandOverlayStyle, brandOverlayCss, type BrandPalette } from './overlay';

const PALETTE: BrandPalette = {
  primary: '#2f6f3e',
  onPrimary: '#ffffff',
  bg: '#f7f8f3',
  fg: '#1f2a1c',
  muted: '#e7ecdd',
};

describe('brandOverlayVars', () => {
  it('maps the six core palette colours onto HDS semantic vars', () => {
    const v = brandOverlayVars(PALETTE);
    expect(v['--semantic-accent-rest']).toBe('#2f6f3e');
    expect(v['--semantic-color-surface-accent']).toBe('#2f6f3e');
    expect(v['--semantic-color-border-accent']).toBe('#2f6f3e');
    expect(v['--semantic-color-content-onAccent']).toBe('#ffffff');
    expect(v['--semantic-color-surface-page']).toBe('#f7f8f3');
    expect(v['--semantic-color-content-primary']).toBe('#1f2a1c');
    expect(v['--semantic-color-surface-raised']).toBe('#e7ecdd');
  });

  it('derives interactive accent states from the primary via color-mix', () => {
    const v = brandOverlayVars(PALETTE);
    expect(v['--semantic-accent-hover']).toBe('color-mix(in srgb, #2f6f3e 88%, #000)');
    expect(v['--semantic-accent-pressed']).toBe('color-mix(in srgb, #2f6f3e 76%, #000)');
    expect(v['--semantic-accent-subtle']).toBe('color-mix(in srgb, #2f6f3e 12%, #fff)');
    expect(v['--semantic-color-surface-accentSubtle']).toBe(
      'color-mix(in srgb, #2f6f3e 12%, #fff)',
    );
  });

  it('derives secondary content from fg blended toward bg', () => {
    const v = brandOverlayVars(PALETTE);
    expect(v['--semantic-color-content-secondary']).toBe(
      'color-mix(in srgb, #1f2a1c 66%, #f7f8f3)',
    );
  });

  it('omits optional vars when the palette does not provide them', () => {
    const v = brandOverlayVars(PALETTE);
    expect(v['--brand-accent']).toBeUndefined();
    expect(v['--semantic-radius-action']).toBeUndefined();
    expect(v['--primitive-typography-family-display']).toBeUndefined();
    expect(v['--primitive-typography-family-primary']).toBeUndefined();
  });

  it('keeps a secondary accent brand-level (no HDS surface expansion)', () => {
    const v = brandOverlayVars({ ...PALETTE, accent: '#a7c957' });
    expect(v['--brand-accent']).toBe('#a7c957');
    // The accent must NOT leak into the HDS accent ramp.
    expect(v['--semantic-accent-rest']).toBe('#2f6f3e');
  });

  it('emits both semantic and pass-through radius when provided', () => {
    const v = brandOverlayVars({ ...PALETTE, radius: '14px' });
    expect(v['--semantic-radius-action']).toBe('14px');
    expect(v['--brand-radius']).toBe('14px');
  });

  it('maps font stacks onto the display/primary family primitives', () => {
    const v = brandOverlayVars({
      ...PALETTE,
      fontHeading: '"Work Sans", sans-serif',
      fontBody: 'Inter, sans-serif',
    });
    expect(v['--primitive-typography-family-display']).toBe('"Work Sans", sans-serif');
    expect(v['--primitive-typography-family-primary']).toBe('Inter, sans-serif');
  });
});

describe('brandOverlayStyle', () => {
  it('serializes to an inline style string of k:v pairs', () => {
    const s = brandOverlayStyle(PALETTE);
    expect(s).toContain('--semantic-accent-rest:#2f6f3e');
    expect(s).toContain(';--semantic-color-surface-page:#f7f8f3');
    // No trailing/leading separators.
    expect(s.startsWith(';')).toBe(false);
    expect(s.endsWith(';')).toBe(false);
  });
});

describe('brandOverlayCss', () => {
  it('wraps the vars in the given selector as a CSS rule block', () => {
    const css = brandOverlayCss('[data-brand="acme"]', PALETTE);
    expect(css.startsWith('[data-brand="acme"] {\n')).toBe(true);
    expect(css).toContain('  --semantic-accent-rest: #2f6f3e;');
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });
});
