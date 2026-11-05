import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

// Owner bug (2026-11-05): with px-0 the base ring-2 + ring-offset-2 hugged a link's glyphs and
// underline. The link variant draws a token-bound outline instead (computed values are pinned in
// tests/visual/button-link-focus.spec.ts); this pins the class contract jsdom can see.
const classesOf = (el: Element) => el.className.split(/\s+/);

describe('Button variant="link" focus ring', () => {
  it('swaps the box-shadow ring for a token-bound outline on focus-visible', () => {
    const { container } = render(<Button variant="link">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toEqual(
      expect.arrayContaining([
        'focus-visible:ring-0',
        'focus-visible:ring-offset-0',
        'focus-visible:outline-solid',
        'focus-visible:outline-[length:var(--hds-borderWidth-thick)]',
        'focus-visible:outline-ring',
        'focus-visible:outline-offset-2',
        'focus-visible:rounded-[var(--semantic-radius-control)]',
      ]),
    );
    // tailwind-merge must drop the base outline-none, or the outline never paints.
    expect(c).not.toContain('focus-visible:outline-none');
    expect(c).not.toContain('focus-visible:ring-2');
  });

  it('leaves the rest box alone: no padding, base radius, nothing outside :focus-visible', () => {
    const { container } = render(<Button variant="link">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toContain('px-0');
    expect(c).toContain('rounded-md');
    const added = c.filter(
      (k) => /outline|ring|rounded-\[/.test(k) && !k.startsWith('focus-visible:'),
    );
    expect(added).toEqual([]);
  });

  it('keeps the base ring on the other variants', () => {
    const { container } = render(<Button variant="tertiary">Go</Button>);
    const c = classesOf(container.firstElementChild!);
    expect(c).toContain('focus-visible:ring-2');
    expect(c).toContain('focus-visible:outline-none');
  });
});
