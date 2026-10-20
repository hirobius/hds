import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AsyncState } from './async-state';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AsyncState', () => {
  it('a11y:async-state.busy-region - loading is a labelled region marked aria-busy, with skeleton rows', () => {
    const { container } = render(<AsyncState status="loading" label="Openings" rows={4} />);
    const region = screen.getByRole('region', { name: 'Openings' });
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('[data-slot="row"]').length).toBe(4);
    expect(container.querySelectorAll('[data-variant]').length).toBeGreaterThan(0);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('defaults to three skeleton rows', () => {
    const { container } = render(<AsyncState status="loading" />);
    expect(container.querySelectorAll('[data-slot="row"]').length).toBe(3);
  });

  it('a11y:async-state.slow-note - adds a polite "Still trying…" note once loading runs long', () => {
    vi.useFakeTimers();
    render(<AsyncState status="loading" slowAfterMs={5000} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).not.toContain('Still trying');
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(status.textContent).not.toContain('Still trying');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(status.textContent).toContain('Still trying…');
  });

  it('uses a 10 second slow threshold by default', () => {
    vi.useFakeTimers();
    render(<AsyncState status="loading" />);
    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(screen.getByRole('status').textContent).not.toContain('Still trying');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('status').textContent).toContain('Still trying…');
  });

  it('a11y:async-state.error-announced - error is a danger alert with the message and a Retry that calls back', () => {
    const onRetry = vi.fn();
    render(<AsyncState status="error" error="The server did not answer." onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('The server did not answer.');
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('a11y:async-state.retry-keyboard - Retry is a native button, reachable by keyboard', () => {
    render(<AsyncState status="error" onRetry={() => {}} />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry.tagName).toBe('BUTTON');
    expect(retry.getAttribute('tabindex')).not.toBe('-1');
    retry.focus();
    expect(document.activeElement).toBe(retry);
  });

  it('omits Retry when no onRetry is given', () => {
    render(<AsyncState status="error" error="Nope." />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('uses offline wording when the browser is offline, and still offers Retry', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const onRetry = vi.fn();
    render(<AsyncState status="error" error="The server did not answer." onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('You’re offline');
    expect(alert.textContent).not.toContain('The server did not answer.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty node when empty and children when ready', () => {
    const { rerender } = render(
      <AsyncState status="empty" empty={<p>Nothing here</p>}>
        <p>Rows</p>
      </AsyncState>,
    );
    expect(screen.getByText('Nothing here')).not.toBeNull();
    expect(screen.queryByText('Rows')).toBeNull();
    rerender(
      <AsyncState status="ready" empty={<p>Nothing here</p>}>
        <p>Rows</p>
      </AsyncState>,
    );
    expect(screen.getByText('Rows')).not.toBeNull();
    expect(screen.queryByText('Nothing here')).toBeNull();
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBeNull();
  });

  it('restarts the slow timer when a new load begins', () => {
    vi.useFakeTimers();
    const { rerender } = render(<AsyncState status="loading" slowAfterMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status').textContent).toContain('Still trying');
    rerender(<AsyncState status="ready">x</AsyncState>);
    rerender(<AsyncState status="loading" slowAfterMs={1000} />);
    expect(screen.getByRole('status').textContent).not.toContain('Still trying');
  });
});
