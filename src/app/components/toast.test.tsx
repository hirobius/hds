/**
 * Tests for Toast — imperative enqueue via useToast, render with title/
 * description, and the provider guard. Plain-DOM assertions (no jest-dom).
 *
 * Radix Toast touches APIs jsdom lacks (ResizeObserver, matchMedia) — polyfilled.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ToastProvider, useToast } from './toast';

beforeAll(() => {
  // @ts-expect-error — minimal jsdom polyfills for Radix Toast.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!window.matchMedia) {
    // @ts-expect-error — partial matchMedia stub.
    window.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
});

afterEach(cleanup);

function Trigger() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ title: 'Saved', description: 'All good', tone: 'success' })}>
      fire
    </button>
  );
}

describe('Toast', () => {
  it('shows a toast with title + description when enqueued', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(screen.queryByText('Saved')).toBeNull();
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByText('Saved')).not.toBeNull();
    expect(screen.getByText('All good')).not.toBeNull();
  });

  it('throws if useToast is used outside a provider', () => {
    function Orphan() {
      useToast();
      return null;
    }
    // Suppress the expected React error boundary console noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
