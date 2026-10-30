/**
 * The shared token-sheet resolver (hds#961): what the shipped
 * src/styles/tokens.generated.css resolves to per theme.
 */
import { describe, it, expect } from 'vitest';
import { THEMES, block, color, resolveVar } from './token-sheet';

describe('token-sheet', () => {
  it('reads every block a selector opens, spaced or minified', () => {
    const root = block(':root');
    expect(root['--primitive-space-6']).toBe('24px');
    // The raised-edge block is minified at the end of the sheet (hds#897).
    expect(root['--hds-edge-primary']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('dark is light with the dark block over it', () => {
    expect(THEMES.dark['--primitive-space-6']).toBe('24px');
    expect(THEMES.dark['--hds-edge-primary']).not.toBe(THEMES.light['--hds-edge-primary']);
  });

  it('follows var() chains to the final value', () => {
    expect(resolveVar('--component-tag-minHeight', 'light')).toBe('24px');
  });

  it('resolves a colour to a hex, and refuses one that does not', () => {
    expect(color('--primitive-color-neutral-white', 'light')).toBe('#ffffff');
    expect(() => color('--primitive-space-6', 'light')).toThrow(/hex/);
    expect(() => resolveVar('--no-such-token', 'light')).toThrow(/--no-such-token/);
  });
});
