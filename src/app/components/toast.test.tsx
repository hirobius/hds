/**
 * Tests for Toast — imperative enqueue via useToast, render with title/
 * description, and the provider guard. Plain-DOM assertions (no jest-dom).
 *
 * Radix Toast touches APIs jsdom lacks (ResizeObserver, matchMedia) — polyfilled.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ToastProvider, useToast } from './toast';

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const toastCss = theme.slice(theme.indexOf('Toast swipe + exit'));

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

describe('Toast swipe-follow + slide-out exit (hds#938)', () => {
  it('marks the root with the hds-toast hook and the Radix state the theme.css layer keys off', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    const root = screen.getByText('Saved').closest('li') as HTMLElement;
    expect(root.className).toMatch(/(^|\s)hds-toast(\s|$)/);
    // Radix stamps the provider's swipe direction on the root at all times;
    // theme.css picks the exit keyframes from it.
    expect(root.getAttribute('data-swipe-direction')).toBe('right');
    expect(root.getAttribute('data-state')).toBe('open');
  });

  it('follows the pointer during a swipe through the Radix swipe-move vars', () => {
    expect(toastCss).toContain(".hds-toast[data-swipe='move']");
    expect(toastCss).toContain('var(--radix-toast-swipe-move-x, 0)');
    expect(toastCss).toContain('var(--radix-toast-swipe-move-y, 0)');
  });

  it('snaps a cancelled swipe back on the productive motion tokens', () => {
    expect(toastCss).toContain(".hds-toast[data-swipe='cancel']");
    expect(toastCss).toContain('var(--hds-motion-productive-duration)');
  });

  it('slides a dismissed toast out toward the swipe edge on the exit tokens, swipe or not', () => {
    expect(toastCss).toContain('@keyframes hds-toast-out');
    expect(toastCss).toContain('--_a: 1');
    expect(toastCss).toContain('* var(--_t)');
    expect(toastCss).toContain('--_t: calc(100% + var(--semantic-space-fixed-sm))');
    expect(toastCss).toContain("[data-swipe-direction='right']");
    // A button/timer dismiss never swiped: the closed state takes the same exit.
    expect(toastCss).toContain(":is([data-swipe='end'], [data-state='closed'])");
    expect(toastCss).toContain('var(--hds-motion-exit-duration)');
    // From rest — a non-swipe dismiss has no swipe-end vars set. The
    // fallbacks must be 0px, not 0: the exit keyframes add them to a
    // length in calc(), and a unitless 0 makes that value invalid.
    expect(toastCss).toContain('var(--radix-toast-swipe-end-x, 0px)');
    expect(toastCss).toContain('var(--radix-toast-swipe-end-y, 0px)');
  });

  it('drops the follow and the slide under reduced motion', () => {
    const reduced = toastCss.slice(toastCss.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('.hds-toast');
    // The [data-swipe] arm raises specificity so the rule beats the
    // .hds-toast[data-swipe='move'] follow rule in the same layer.
    expect(reduced).toContain('.hds-toast[data-swipe]');
    expect(reduced).toContain('animation: none');
    expect(reduced).toContain('transform: none');
  });
});

describe('Toast dismiss target vs text (bug bash 24 review)', () => {
  it('below sm the toast reserves room for the 44px dismiss target, so the X never sits on the title', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    const close = screen.getByRole('button', { name: 'Dismiss' });
    expect(close.className).toMatch(/hds-touch-target/);
    // right-2 (8px) + the 44px target = 52px; max-sm:pr-16 (64px) keeps the text clear of it.
    const root = close.parentElement as HTMLElement;
    expect(root.className).toMatch(/(^|\s)max-sm:pr-16(\s|$)/);
    // utilities.css's unlayered .p-4 outranks any layered pr-*; the root must not use it.
    expect(root.className).not.toMatch(/(^|\s)p-4(\s|$)/);
  });
});

describe('Toast actions (job-hunt ActionToast stand-in)', () => {
  function ActionTrigger({ onUndo, onOpen }: { onUndo: () => void; onOpen: () => void }) {
    const { toast } = useToast();
    return (
      <button
        className="hds-focus"
        onClick={() =>
          toast({
            title: 'Saved to Pipeline',
            actions: [
              { label: 'Open', onSelect: onOpen },
              { label: 'Undo', onSelect: onUndo, altText: 'Undo from Recently removed' },
            ],
          })
        }
      >
        fire
      </button>
    );
  }

  it('renders each action as a named button in order', () => {
    render(
      <ToastProvider>
        <ActionTrigger onUndo={() => {}} onOpen={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    const names = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter((t) => t === 'Open' || t === 'Undo');
    expect(names).toEqual(['Open', 'Undo']);
  });

  it('runs onSelect and closes the toast', () => {
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <ActionTrigger onUndo={onUndo} onOpen={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saved to Pipeline')).toBeNull();
  });

  it('gives each action the alt text Radix announces, defaulting to its label', () => {
    render(
      <ToastProvider>
        <ActionTrigger onUndo={() => {}} onOpen={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    const open = screen.getByRole('button', { name: 'Open' });
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(
      open
        .closest('[data-radix-toast-announce-alt]')
        ?.getAttribute('data-radix-toast-announce-alt'),
    ).toBe('Open');
    expect(
      undo
        .closest('[data-radix-toast-announce-alt]')
        ?.getAttribute('data-radix-toast-announce-alt'),
    ).toBe('Undo from Recently removed');
  });

  it('a toast without actions renders no extra buttons', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['fire', '']);
  });
});
