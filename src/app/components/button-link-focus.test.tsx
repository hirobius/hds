import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

// hds#1167: with px-0 a ring on the button hugged a link's glyphs and underline. The link variant
// moves the shared ring (.hds-focus-after, semantic.focus.*) to an ::after box 4px past the label
// (computed values: tests/visual/button-link-focus.spec.ts and
// scripts/__tests__/focus-ring-computed.test.mjs); this pins the class contract jsdom sees.
const classesOf = (el: Element) => el.className.split(/\s+/);

describe('Button variant="link" focus ring', () => {
  it('moves the shared ring to a padded ::after box', () => {
    const { container } = render(<Button variant="link">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toEqual(
      expect.arrayContaining([
        'hds-focus',
        'hds-focus-after',
        'relative',
        'after:-inset-x-scale-2xs',
        'after:rounded-[var(--semantic-radius-control)]',
      ]),
    );
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

  it('keeps the ring on the button for the other variants', () => {
    const { container } = render(<Button variant="tertiary">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toContain('hds-focus');
    expect(c).not.toContain('hds-focus-after');
    expect(c).not.toContain('after:-inset-x-scale-2xs');
  });
});
