/**
 * Button `hoverEffect="wipe"` (the default since hds#888; `none` opts out): the variant's own hover fill wipes in
 * from the edge the pointer enters and out the edge it leaves. CSS draws it
 * (theme.css `.hds-btn-wipe`); one shared document listener only stamps
 * `data-wipe` / `data-wipe-edge`, so a hover never re-renders a Button.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';
import { nearestEdge } from './button-wipe';

afterEach(cleanup);

// A 100x40 box (named, not literal, so the spacing audit does not read it as CSS).
const W = 100;
const H = 40;
const rect = { left: 0, top: 0, right: W, bottom: H, width: W, height: H } as DOMRect;
const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');

function mount(props: React.ComponentProps<typeof Button> = {}) {
  render(
    <Button hoverEffect="wipe" {...props}>
      Go
    </Button>,
  );
  const el = screen.getByRole('button');
  el.getBoundingClientRect = () => rect;
  return el;
}

describe('nearestEdge', () => {
  it('picks the closest edge of the box', () => {
    expect(nearestEdge(rect, 1, 20)).toBe('left');
    expect(nearestEdge(rect, 99, 20)).toBe('right');
    expect(nearestEdge(rect, 50, 1)).toBe('top');
    expect(nearestEdge(rect, 50, 39)).toBe('bottom');
  });
});

describe('Button hoverEffect', () => {
  it('is on by default (hds#888), including the default secondary variant', () => {
    render(<Button>Go</Button>);
    const el = screen.getByRole('button');
    expect(el.className).toContain('hds-btn-wipe');
    expect(el.getAttribute('data-hover-effect')).toBe('wipe');
    expect(el.style.getPropertyValue('--hds-wipe-fill')).toBe(
      'var(--component-button-secondary-bg-hover)',
    );
  });

  it('hoverEffect="none" opts out: no wipe class or data attributes, the instant hover fill', () => {
    render(<Button hoverEffect="none">Go</Button>);
    const el = screen.getByRole('button');
    expect(el.className).not.toContain('hds-btn-wipe');
    expect(el.hasAttribute('data-hover-effect')).toBe(false);
    expect(el.className).toContain('hover:bg-[color:var(--component-button-secondary-bg-hover)]');
  });

  it('wipe adds the layer class and holds the rest fill on hover', () => {
    const el = mount({ variant: 'primary' });
    expect(el.className).toContain('hds-btn-wipe');
    expect(el.getAttribute('data-hover-effect')).toBe('wipe');
    // the instant hover fill is replaced; theme.css paints bgHover on the layer
    expect(el.className).not.toContain('hover:bg-[color:var(--component-button-bgHover)]');
    expect(el.className).toContain('hover:bg-primary');
  });

  it.each([
    ['secondary', 'hover:bg-[color:var(--component-button-secondary-bg-rest)]'],
    ['tertiary', 'hover:bg-transparent'],
  ] as const)('%s holds its rest fill on hover', (variant, cls) => {
    expect(mount({ variant }).className).toContain(cls);
  });

  it('tertiary keeps a pressed fill (the layer hides on :active)', () => {
    expect(mount({ variant: 'tertiary' }).className).toContain(
      'active:bg-[color:var(--component-button-tertiary-bg-pressed)]',
    );
  });

  it.each([
    ['primary', 'var(--component-button-bgHover)'],
    ['secondary', 'var(--component-button-secondary-bg-hover)'],
    ['tertiary', 'var(--component-button-tertiary-bg-hover)'],
  ] as const)('%s wipes in its own hover fill', (variant, fill) => {
    const el = mount({ variant });
    expect(el.style.getPropertyValue('--hds-wipe-fill')).toBe(fill);
    expect(el.style.getPropertyValue('--hds-wipe-f')).toBe('');
  });

  const tones = [
    ['danger', 'error'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['info', 'info'],
  ] as const;
  it.each(
    (['primary', 'secondary', 'tertiary'] as const).flatMap((variant) =>
      tones.map(([tone, token]) => [variant, tone, token] as const),
    ),
  )('%s + tone %s wipes in the tone hover colour', (variant, tone, token) => {
    const el = mount({ variant, tone });
    // the button holds the tone fill (no variant hover leak) ...
    expect(el.className).toContain('hover:bg-feedback-bg-' + tone);
    expect(el.className).not.toMatch(
      /hover:bg-(background|primary|transparent)\b|secondary-bg-rest/,
    );
    // ... and the layer paints the same fill through the tone's hover brightness
    expect(el.style.getPropertyValue('--hds-wipe-fill')).toBe(
      'var(--semantic-color-feedback-bg-' + token + ')',
    );
    expect(el.style.getPropertyValue('--hds-wipe-f')).toBe('brightness(var(--hds-wipe-b, 0.95))');
    expect(el.style.filter).toBe('none');
  });

  it('a consumer style still wins over the wipe fill', () => {
    const el = mount({ style: { '--hds-wipe-fill': 'red', color: 'blue' } as React.CSSProperties });
    expect(el.style.getPropertyValue('--hds-wipe-fill')).toBe('red');
    expect(el.style.color).toBe('blue');
  });

  it('stamps the entry edge, then the exit edge, without re-rendering', () => {
    const el = mount();
    fireEvent.pointerOver(el, { clientX: 1, clientY: 20, pointerType: 'mouse' });
    expect(el.getAttribute('data-wipe-edge')).toBe('left');
    expect(el.getAttribute('data-wipe')).toBe('in');
    expect(el.style.getPropertyValue('--hds-wipe-o')).toBe('left');
    expect(el.style.getPropertyValue('--hds-wipe-s')).toBe('1');
    expect(el.style.getPropertyValue('--hds-wipe-t')).toBe('');
    fireEvent.pointerOut(el, {
      clientX: 99,
      clientY: 20,
      pointerType: 'mouse',
      relatedTarget: document.body,
    });
    expect(el.getAttribute('data-wipe-edge')).toBe('right');
    expect(el.getAttribute('data-wipe')).toBe('out');
    expect(el.style.getPropertyValue('--hds-wipe-o')).toBe('right');
    expect(el.style.getPropertyValue('--hds-wipe-s')).toBe('0 1');
  });

  it('a top or bottom edge collapses the layer vertically', () => {
    const el = mount();
    fireEvent.pointerOver(el, { clientX: 50, clientY: 1, pointerType: 'mouse' });
    fireEvent.pointerOut(el, {
      clientX: 50,
      clientY: 39,
      pointerType: 'mouse',
      relatedTarget: document.body,
    });
    expect(el.style.getPropertyValue('--hds-wipe-o')).toBe('bottom');
    expect(el.style.getPropertyValue('--hds-wipe-s')).toBe('1 0');
  });

  it('ignores touch pointers (no stuck hover)', () => {
    const el = mount();
    fireEvent.pointerOver(el, { clientX: 1, clientY: 20, pointerType: 'touch' });
    expect(el.hasAttribute('data-wipe')).toBe(false);
  });

  it('keyboard focus fills from the left', () => {
    const el = mount();
    el.matches = ((q: string) => q === ':focus-visible') as typeof el.matches;
    fireEvent.focusIn(el);
    expect(el.getAttribute('data-wipe-edge')).toBe('left');
    expect(el.getAttribute('data-wipe')).toBe('in');
    fireEvent.focusOut(el, { relatedTarget: document.body });
    expect(el.getAttribute('data-wipe-edge')).toBe('right');
    expect(el.getAttribute('data-wipe')).toBe('out');
  });

  it('respects disabled', () => {
    const el = mount({ disabled: true });
    fireEvent.pointerOver(el, { clientX: 1, clientY: 20, pointerType: 'mouse' });
    expect(el.hasAttribute('data-wipe')).toBe(false);
  });
});

describe('wipe CSS contract (theme.css)', () => {
  const block = theme.slice(
    theme.indexOf('.hds-btn-wipe::before'),
    theme.indexOf('/* Inline text links'),
  );
  const rule = (selector: string) => {
    const i = block.indexOf(selector + ' {');
    return i < 0 ? '' : block.slice(i, block.indexOf('}', i));
  };
  it('only paints under hover-capable pointers', () => {
    const at = theme.lastIndexOf('(hover: hover)', theme.indexOf('.hds-btn-wipe::before'));
    expect(theme.slice(at, theme.indexOf('.hds-btn-wipe::before')).trim()).toBe('(hover: hover) {');
  });
  it('is instant under reduced motion: it animates on the motion token theme.css zeroes', () => {
    expect(rule('.hds-btn-wipe::before')).toContain('var(--hds-motion-productive)');
    expect(theme).toMatch(
      /prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*--hds-motion-productive-duration: 0s/,
    );
  });
  it('is hard-edged: a scaled layer, no gradient or feather', () => {
    expect(rule('.hds-btn-wipe::before')).toContain('scale: var(--hds-wipe-s, 0)');
    expect(block).not.toMatch(/gradient|blur\(/);
  });
  it('paints the inline fill and tone filter', () => {
    expect(rule('.hds-btn-wipe::before')).toContain('background: var(--hds-wipe-fill)');
    expect(rule('.hds-btn-wipe::before')).toContain('filter: var(--hds-wipe-f)');
  });
  it('lightens a tone in dark, as dark:hover:brightness-110 does', () => {
    const dark = theme.slice(theme.indexOf("[data-theme='dark'],\n.dark {"));
    expect(dark.slice(0, dark.indexOf('\n}'))).toContain('--hds-wipe-b: 1.1;');
  });
  it('hides the layer on :active (and disabled) so the pressed fill and wash show', () => {
    expect(rule('.hds-btn-wipe:is(:active, :disabled)::before')).toContain('display: none');
  });
});
