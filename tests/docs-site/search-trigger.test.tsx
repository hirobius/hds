/**
 * The docs sidebar search trigger draws its shortcut with the HDS Kbd, not Fumadocs' own
 * plain <kbd> boxes (hds#903). It still opens Fumadocs' search and keeps its accessible name.
 * Fumadocs' search context is mocked: the docs-site has its own React copy, and the hotkeys
 * (Ctrl/⌘ + K) live on Fumadocs' SearchProvider, which the trigger does not touch.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const setOpenSearch = vi.fn();
vi.mock('../../docs-site/node_modules/fumadocs-ui/dist/contexts/search.js', () => ({
  useSearchContext: () => ({
    enabled: true,
    open: false,
    setOpenSearch,
    hotKey: [
      { key: () => true, display: 'Ctrl' },
      { key: 'k', display: 'K' },
    ],
  }),
}));

const { SearchTriggerFull, SearchTriggerSmall } =
  await import('../../docs-site/components/search-trigger');

describe('docs search trigger (hds#903)', () => {
  afterEach(() => {
    cleanup();
    setOpenSearch.mockClear();
  });

  it('large trigger shows the shortcut as HDS Kbd, not Fumadocs kbd styling', () => {
    const { container } = render(<SearchTriggerFull />);
    const keys = container.querySelectorAll('button kbd');
    expect(Array.from(keys).map((k) => k.textContent)).toEqual(['Ctrl', 'K']);
    keys.forEach((k) => {
      expect(k.classList.contains('hds-kbd')).toBe(true);
      expect(k.className).not.toMatch(/fd-/);
    });
  });

  it('keeps an accessible name and opens search on click', () => {
    render(<SearchTriggerFull />);
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(setOpenSearch).toHaveBeenCalledWith(true);
  });

  it('small trigger is a named button that opens search', () => {
    render(<SearchTriggerSmall />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(setOpenSearch).toHaveBeenCalledWith(true);
  });
});
