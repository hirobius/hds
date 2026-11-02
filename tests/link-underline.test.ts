import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Text links draw a 2px underline about 0.2em below the baseline (hds#link-underline-weight). The
// weight lives in two semantic tokens so every text link shares it; .hds-link reads them.
const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');
const theme = read('src/styles/theme.css');
const generated = read('src/styles/tokens.generated.css');
const tokens = JSON.parse(read('hirobius.tokens.json'));

describe('link underline weight', () => {
  it('tokens resolve to a 2px thickness and a 0.2em offset', () => {
    expect(tokens.semantic.link.underlineThickness.$value).toBe('{primitive.borderWidth.sm}');
    expect(tokens.primitive.borderWidth.sm.$value).toEqual({ value: 2, unit: 'px' });
    expect(tokens.semantic.link.underlineOffset.$value).toBe('{primitive.underline.offset}');
    expect(tokens.primitive.underline.offset.$value).toEqual({ value: 0.2, unit: 'em' });
    expect(generated).toContain('--primitive-underline-offset: 0.2em;');
    expect(generated).toContain(
      '--semantic-link-underlineThickness: var(--primitive-borderWidth-sm);',
    );
    expect(generated).toContain(
      '--semantic-link-underlineOffset: var(--primitive-underline-offset);',
    );
  });

  const rule = (sel: string) => {
    const at = theme.indexOf(sel + ' {');
    return at < 0 ? '' : theme.slice(at, theme.indexOf('}', at));
  };

  it('.hds-link is a real underline from the tokens, capped at 0.125em, with skip-ink', () => {
    const r = rule('.hds-link');
    expect(r).toContain('text-decoration: underline;');
    expect(r).toContain(
      'text-decoration-thickness: min(var(--semantic-link-underlineThickness), 0.125em);',
    );
    expect(r).toContain('text-underline-offset: var(--semantic-link-underlineOffset);');
    expect(r).toContain('text-decoration-skip-ink: auto;');
  });

  it('rest: text and underline are content.primary; hover: both content.secondary, together', () => {
    const r = rule('.hds-link');
    expect(r).toContain('color: var(--semantic-color-content-primary);');
    expect(r).toContain('text-decoration-color: currentColor;'); // the line follows the text
    expect(r).toContain('transition: color var(--hds-motion-productive);');
    const hover = rule('.hds-link:hover');
    expect(hover).toContain('color: var(--semantic-color-content-secondary);');
    expect(hover).not.toMatch(/thickness|offset|text-decoration-color/);
  });

  it('no animation on the link', () => {
    expect(theme).not.toMatch(/hds-link-swipe|data-link-swipe/);
    expect(rule('.hds-link')).not.toMatch(/animation|background-image/);
  });

  it('a standalone link has a 24px hit area (44px on touch) without moving the layout', () => {
    const r = rule('.hds-link-standalone');
    expect(r).toContain('--hds-link-hit: var(--primitive-size-24);');
    expect(r).toContain('display: inline-block;');
    expect(r).toContain('min-width: var(--primitive-size-24);');
    expect(r).toMatch(/padding-block: var\(--hds-link-pad\)/);
    expect(r).toMatch(/margin-block: calc\(-1 \* var\(--hds-link-pad\)\)/);
    expect(theme).toMatch(
      /@media \(pointer: coarse\)\s*{\s*\.hds-link-standalone\s*{\s*--hds-link-hit: var\(--primitive-size-interactive-min\);/,
    );
  });
});
