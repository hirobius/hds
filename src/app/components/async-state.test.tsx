import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { stubReducedMotion } from '../../../tests/helpers/reduced-motion';
import { AsyncState } from './async-state';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AsyncState', () => {
  it('a11y:async-state.busy-region - loading is a labelled region whose skeleton block is aria-busy', () => {
    const { container } = render(<AsyncState status="loading" label="Openings" rows={4} />);
    const region = screen.getByRole('region', { name: 'Openings' });
    expect(region.getAttribute('aria-busy')).toBeNull();
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('[data-slot="row"]').length).toBe(4);
    expect(container.querySelectorAll('[data-variant]').length).toBeGreaterThan(0);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('the polite status note has no aria-busy ancestor', () => {
    render(<AsyncState status="loading" label="Openings" />);
    const status = screen.getByRole('status');
    expect(status.closest('[aria-busy="true"]')).toBeNull();
  });

  it('a11y:async-state.retry-keyboard - focus moves to the region when Retry unmounts', () => {
    function Harness() {
      const [status, setStatus] = React.useState<'error' | 'loading'>('error');
      return <AsyncState status={status} label="Openings" onRetry={() => setStatus('loading')} />;
    }
    render(<Harness />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    retry.focus();
    fireEvent.click(retry);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Openings' }));
  });

  it('does not pull focus from elsewhere after Retry', () => {
    function Harness() {
      const [status, setStatus] = React.useState<'error' | 'loading'>('error');
      return (
        <>
          <input aria-label="Search" />
          <AsyncState status={status} onRetry={() => setStatus('loading')} />
        </>
      );
    }
    render(<Harness />);
    const search = screen.getByRole('textbox', { name: 'Search' });
    search.focus();
    // A pointer click that leaves focus where it was must not have it pulled away.
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(document.activeElement).toBe(search);
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

  it('renders the empty node when empty and children when ready', async () => {
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
    // The swap is a crossfade (hds#938): the empty node stays mounted while
    // it fades out, then unmounts once the fade completes.
    await waitFor(() => expect(screen.queryByText('Nothing here')).toBeNull());
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBeNull();
  });

  it('a11y:async-state.crossfade-exit-hidden - mid-crossfade both blocks stay mounted; the exiting block is aria-hidden, inert and carries no aria-busy', async () => {
    const { container, rerender } = render(
      <AsyncState status="loading" label="Openings" rows={2}>
        <p>Rows</p>
      </AsyncState>,
    );
    rerender(
      <AsyncState status="ready" label="Openings" rows={2}>
        <p>Rows</p>
      </AsyncState>,
    );
    // Mid-transition: the old and new blocks overlap in the crossfade stack.
    const blocks = container.querySelectorAll('[data-crossfade-view]');
    expect(blocks.length).toBe(2);
    const exiting = container.querySelector('[data-crossfade-view="loading"]');
    const live = container.querySelector('[data-crossfade-view="ready"]');
    expect(exiting?.getAttribute('aria-hidden')).toBe('true');
    expect(exiting?.getAttribute('data-exiting')).toBe('true');
    expect((exiting as HTMLElement & { inert?: boolean })?.inert).toBe(true);
    expect(exiting?.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(live?.getAttribute('aria-hidden')).toBeNull();
    // Assistive technology sees only the new state: the skeleton and its
    // polite status line sit inside the aria-hidden exiting block.
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Rows')).not.toBeNull();
    // Once the fade completes the old block unmounts.
    await waitFor(() => expect(container.querySelectorAll('[data-crossfade-view]').length).toBe(1));
  });

  it('swaps instantly with no overlap under prefers-reduced-motion', () => {
    stubReducedMotion();
    try {
      const { container, rerender } = render(
        <AsyncState status="loading" label="Openings">
          <p>Rows</p>
        </AsyncState>,
      );
      rerender(
        <AsyncState status="ready" label="Openings">
          <p>Rows</p>
        </AsyncState>,
      );
      // No crossfade stack at all: only the new block renders.
      expect(container.querySelectorAll('[data-crossfade-view]').length).toBe(0);
      expect(screen.getByText('Rows')).not.toBeNull();
      expect(container.querySelectorAll('[data-slot="row"]').length).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
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
