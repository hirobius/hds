import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StackedCardRail } from './stacked-card-rail';

afterEach(cleanup);

const cards = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
] as unknown as React.ComponentProps<typeof StackedCardRail>['cards'];

describe('StackedCardRail scroll regions a11y', () => {
  it('makes every scrollable container focusable, with a role and a name', () => {
    const { container } = render(<StackedCardRail cards={cards} />);
    for (const sel of ['.hds-scr-yscroll', '.hds-scr-strip']) {
      const el = container.querySelector(sel) as HTMLElement;
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('role')).toBe('region');
      expect((el.getAttribute('aria-label') ?? '').length).toBeGreaterThan(0);
    }
  });
});
