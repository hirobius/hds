import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

// hds#1167: with px-0 the base ring-2 + ring-offset-2 hugged a link's glyphs and underline. The
// link variant paints a token-bound outline on an ::after box 4px past the label (computed values
// are pinned in tests/visual/button-link-focus.spec.ts); this pins the class contract jsdom sees.
const classesOf = (el: Element) => el.className.split(/\s+/);

describe('Button variant="link" focus ring', () => {
  it('swaps the box-shadow ring for a token-bound outline on a padded ::after box', () => {
    const { container } = render(<Button variant="link">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toEqual(
      expect.arrayContaining([
        'focus-visible:ring-0',
        'focus-visible:ring-offset-0',
        'after:-inset-x-scale-2xs',
        'after:rounded-[var(--semantic-radius-control)]',
        'focus-visible:after:outline-solid',
        'focus-visible:after:outline-[length:var(--hds-borderWidth-thick)]',
        'focus-visible:after:outline-ring',
        'focus-visible:after:outline-offset-2',
      ]),
    );
    expect(c).not.toContain('focus-visible:ring-2');
  });

  it('leaves the rest box alone: no padding, base radius, the ::after is out of flow', () => {
    const { container } = render(<Button variant="link">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toContain('px-0');
    expect(c).toContain('rounded-md');
    expect(c).toContain('after:absolute');
    expect(c).toContain('after:pointer-events-none');
    // Nothing paints an outline or ring outside :focus-visible, and no negative margin.
    const painted = c.filter((k) => /outline-|ring-/.test(k) && !k.startsWith('focus-visible:'));
    expect(painted).toEqual([]);
    expect(c.some((k) => /(^|:)-m[xytrbl]?-/.test(k))).toBe(false);
  });

  it('keeps the base ring on the other variants', () => {
    const { container } = render(<Button variant="tertiary">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toContain('focus-visible:ring-2');
    expect(c).not.toContain('after:-inset-x-scale-2xs');
  });
});
