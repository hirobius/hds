/**
 * Tests for Pagination — range truncation, current-page marking, boundary
 * disabling, and onPageChange wiring. Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Pagination, paginationRange } from './pagination';

afterEach(cleanup);

describe('paginationRange', () => {
  it('lists every page when the count fits without truncation', () => {
    expect(paginationRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it('truncates the tail near the start', () => {
    expect(paginationRange(2, 20, 1)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
  });

  it('truncates the head near the end', () => {
    expect(paginationRange(19, 20, 1)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });

  it('truncates both sides in the middle', () => {
    expect(paginationRange(10, 20, 1)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} count={1} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('marks the current page with aria-current', () => {
    render(<Pagination page={3} count={10} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page 3' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} count={5} onPageChange={() => {}} />);
    expect(
      (screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    rerender(<Pagination page={5} count={5} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('fires onPageChange with the chosen page', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} count={10} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

describe('Pagination variant="compact"', () => {
  it('renders "n of m" between icon-only Previous and Next buttons', () => {
    render(<Pagination variant="compact" page={1} count={4} onPageChange={() => {}} />);
    expect(screen.getByText('1 of 4')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Page 1' })).toBeNull();
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(
      <Pagination variant="compact" page={1} count={4} onPageChange={() => {}} />,
    );
    expect(
      (screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    rerender(<Pagination variant="compact" page={4} count={4} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('fires onPageChange with the adjacent page', () => {
    const onPageChange = vi.fn();
    render(<Pagination variant="compact" page={2} count={4} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('announces the position politely', () => {
    render(<Pagination variant="compact" page={2} count={4} onPageChange={() => {}} />);
    expect(screen.getByText('2 of 4').getAttribute('aria-live')).toBe('polite');
  });

  it('keeps focus in the nav when the focused button disables', () => {
    const { rerender } = render(
      <Pagination variant="compact" page={2} count={4} onPageChange={() => {}} />,
    );
    const prev = screen.getByRole('button', { name: 'Previous page' });
    prev.focus();
    rerender(<Pagination variant="compact" page={1} count={4} onPageChange={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next page' }));
  });

  it('draws Previous and Next outlined, and a disabled end stays outlined, not grey-filled (hds#886)', () => {
    render(<Pagination variant="compact" page={1} count={4} onPageChange={() => {}} />);
    const prev = screen.getByRole('button', { name: 'Previous page' });
    const next = screen.getByRole('button', { name: 'Next page' });
    for (const button of [prev, next]) {
      expect(button.className).toContain('border-[color:var(--semantic-color-border-default)]');
      // Disabled: transparent, keeping the outline (the icon fades to content-disabled), never
      // the primary's muted fill (the grey tile the compact pager drew before).
      expect(button.className).toContain('disabled:bg-transparent');
      expect(button.className).not.toContain('--component-button-primary-bgDisabled');
      expect(button.className).toContain(
        'disabled:text-[var(--component-button-primary-textDisabled)]',
      );
    }
  });

  it('leaves the default variant unchanged', () => {
    render(<Pagination page={1} count={4} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page 1' })).not.toBeNull();
    expect(screen.queryByText('1 of 4')).toBeNull();
  });
});
