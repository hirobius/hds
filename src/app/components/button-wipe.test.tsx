/**
 * Button `hoverEffect="wipe"` (opt-in): the variant's own hover fill wipes in
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

const rect = { left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 } as DOMRect;
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
  it('is off by default: no wipe class or data attributes', () => {
    render(<Button>Go</Button>);
    const el = screen.getByRole('button');
    expect(el.className).not.toContain('hds-btn-wipe');
    expect(el.hasAttribute('data-hover-effect')).toBe(false);
  });

  it('wipe adds the layer class and neutralises the variant hover fill', () => {
    const el = mount({ variant: 'primary' });
    expect(el.className).toContain('hds-btn-wipe');
    expect(el.getAttribute('data-hover-effect')).toBe('wipe');
    // the instant hover fill is replaced, the variant hover token moves to the layer
    expect(el.className).not.toContain('hover:bg-[color:var(--component-button-bgHover)]');
    expect(el.className).toContain('--hds-wipe-fill:var(--component-button-bgHover)');
  });

  it.each(['primary', 'secondary', 'tertiary'] as const)('%s declares a wipe fill', (variant) => {
    const el = mount({ variant });
    expect(el.className).toMatch(/--hds-wipe-fill:/);
  });

  it.each(['danger', 'success', 'warning', 'info'] as const)(
    'tone %s declares a wipe fill',
    (tone) => {
      const el = mount({ tone });
      expect(el.className).toContain(
        '--hds-wipe-fill:var(--semantic-color-feedback-bg-' + tone + ')',
      );
      expect(el.className).not.toContain('hover:brightness-95');
    },
  );

  it('stamps the entry edge, then the exit edge, without re-rendering', () => {
    const el = mount();
    fireEvent.pointerOver(el, { clientX: 1, clientY: 20, pointerType: 'mouse' });
    expect(el.getAttribute('data-wipe-edge')).toBe('left');
    expect(el.getAttribute('data-wipe')).toBe('in');
    fireEvent.pointerOut(el, {
      clientX: 99,
      clientY: 20,
      pointerType: 'mouse',
      relatedTarget: document.body,
    });
    expect(el.getAttribute('data-wipe-edge')).toBe('right');
    expect(el.getAttribute('data-wipe')).toBe('out');
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
  const block = theme.slice(theme.indexOf('.hds-btn-wipe'));
  it('only paints under hover-capable pointers', () => {
    expect(block).toMatch(/@media \(hover: hover\)/);
  });
  it('is instant under reduced motion', () => {
    expect(block).toMatch(/prefers-reduced-motion: reduce/);
  });
  it('is hard-edged: a scaled layer, no gradient or feather', () => {
    expect(block).toMatch(/transform: scale/);
    expect(block).not.toMatch(/gradient|blur\(/);
  });
});
