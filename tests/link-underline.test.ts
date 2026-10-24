import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Text links draw a 2px underline about 0.2em below the baseline (hds#link-underline-weight). The
// weight lives in two semantic tokens so every text link shares it; .hds-link reads them.
// Since C2 the line is a background layer, so it can swipe on pointer enter and leave.
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

  it('.hds-link draws the line itself from the tokens (C2: animatable, not text-decoration)', () => {
    const r = rule('.hds-link');
    expect(r).toContain('text-decoration: none;');
    expect(r).toContain('--hds-link-t: min(var(--semantic-link-underlineThickness), 0.125em);');
    expect(r).toContain('var(--semantic-link-underlineOffset)');
    expect(r).toContain('background-image: linear-gradient(currentColor, currentColor);');
    expect(r).toContain('background-size: 100% var(--hds-link-t);');
  });

  it('text and line are content.primary, with no colour change on hover', () => {
    expect(rule('.hds-link')).toContain('color: var(--semantic-color-content-primary);');
    expect(theme).not.toMatch(/\.hds-link:hover\s*{/);
    expect(theme).not.toMatch(/\.hds-link:hover[^{]*{[^}]*color/);
  });

  it('the swipe: out to the right, back in from the left, 0.35s on the emphasized curve', () => {
    const kf = theme.match(/@keyframes hds-link-swipe\s*{([\s\S]*?)\n}/)?.[1] ?? '';
    expect(kf).toMatch(/0%\s*{[^}]*background-size: 100% [^}]*background-position-x: 100%/);
    expect(kf).toMatch(/50%\s*{[^}]*background-size: 0% [^}]*background-position-x: 100%/);
    expect(kf).toMatch(/100%\s*{[^}]*background-size: 100% [^}]*background-position-x: 0%/);
    expect(rule('.hds-link[data-link-swipe]')).toContain(
      'animation: hds-link-swipe 350ms var(--primitive-easing-emphasized);',
    );
    // Moving left is the mirror image: out to the left, back in from the right.
    expect(rule(".hds-link[data-link-swipe='left']")).toContain(
      'animation-name: hds-link-swipe-left;',
    );
    const left = theme.match(/@keyframes hds-link-swipe-left\s*{([\s\S]*?)\n}/)?.[1] ?? '';
    expect(left).toMatch(/0%\s*{[^}]*background-size: 100% [^}]*background-position-x: 0%/);
    expect(left).toMatch(/50%\s*{[^}]*background-size: 0% [^}]*background-position-x: 0%/);
    expect(left).toMatch(/100%\s*{[^}]*background-size: 100% [^}]*background-position-x: 100%/);
    expect(generated).toContain('--primitive-easing-emphasized: cubic-bezier(0.4, 0, 0.2, 1);');
  });

  it('the line is drawn in the content box, so padding never moves it off the text', () => {
    expect(rule('.hds-link')).toContain('background-origin: content-box;');
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

  it('reduced motion: no swipe', () => {
    expect(theme).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*{\s*\.hds-link\[data-link-swipe\]\s*{\s*animation: none;/,
    );
  });
});
