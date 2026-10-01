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

// The rail injects its CSS as an HTML string (hds#284), annotated
// `security-ok` on the grounds that the string is module-scope CSS no prop can
// reach. This pins that ground: if card data ever flows into the injected HTML,
// the annotation is wrong and this fails.
describe('StackedCardRail injected <style>', () => {
  it('injects the same CSS whatever the cards are, so no card data reaches the HTML string', () => {
    const hostile = [
      {
        id: '</style><script>alert(1)</script>',
        title: '</style><script>alert(1)</script>',
        category: '<img src=x onerror=alert(1)>',
        href: 'javascript:alert(1)',
        coverImage: '"><svg onload=alert(1)>',
      },
    ];
    const styleOf = (rail: React.ReactElement) => {
      const { container, unmount } = render(rail);
      const css = container.querySelector('style')?.innerHTML ?? '';
      unmount();
      return css;
    };
    const benign = styleOf(<StackedCardRail cards={cards} />);
    const injected = styleOf(<StackedCardRail cards={hostile} />);
    expect(benign).toContain('.hds-scr-outer');
    expect(injected).toBe(benign);
    expect(injected).not.toMatch(/<\/?(?:script|style|img|svg)\b|javascript:|onerror|onload/i);
  });
});
