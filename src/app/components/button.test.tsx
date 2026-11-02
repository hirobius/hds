/**
 * Button dev warning: `iconOnly` renders only `iconLeft`, so an icon-only
 * Button without one is an empty square. The warning fires once per module
 * load, in development only, and never for the IconButton recipe (iconOnly +
 * label + iconLeft Icon, which replaced IconButton in 0.20.0), asChild or loading.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { Search } from 'lucide-react';
import { stubReducedMotion } from '../../../tests/helpers/reduced-motion';
import { Icon } from './icon';

const MESSAGE =
  '[Button] iconOnly renders only iconLeft; pass iconLeft (iconRight is hidden in iconOnly mode).';

// The once flag is module state, so each test loads a fresh copy of the module.
async function load() {
  vi.resetModules();
  const { Button } = await import('./button');
  return { Button };
}

const originalEnv = process.env.NODE_ENV;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  warn.mockRestore();
  if (originalEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv;
});

const messages = () => warn.mock.calls.map((call) => call[0]);

describe('Button iconOnly without an icon', () => {
  it('warns once for <Button iconOnly aria-label="x" />, however often it renders', async () => {
    const { Button } = await load();
    render(<Button iconOnly aria-label="x" />);
    render(<Button iconOnly aria-label="y" />);
    expect(messages().filter((m) => m === MESSAGE)).toHaveLength(1);
  });

  it('warns when only iconRight is passed (it is hidden in iconOnly mode)', async () => {
    const { Button } = await load();
    render(<Button iconOnly aria-label="x" iconRight={<span />} />);
    expect(messages()).toContain(MESSAGE);
  });

  it('stays silent when iconLeft is passed', async () => {
    const { Button } = await load();
    render(<Button iconOnly aria-label="x" iconLeft={<Search />} />);
    expect(messages()).not.toContain(MESSAGE);
  });

  it('stays silent while loading (the spinner takes the icon slot)', async () => {
    const { Button } = await load();
    render(<Button iconOnly loading aria-label="x" />);
    expect(messages()).not.toContain(MESSAGE);
  });

  it('stays silent for the IconButton recipe: iconOnly, label and an Icon in iconLeft', async () => {
    const { Button } = await load();
    render(<Button iconOnly label="Search" iconLeft={<Icon icon={Search} />} />);
    expect(messages()).toEqual([]);
  });

  it('stays silent with asChild', async () => {
    const { Button } = await load();
    render(
      <Button iconOnly asChild>
        <a href="/x" aria-label="x">
          go
        </a>
      </Button>,
    );
    expect(messages()).not.toContain(MESSAGE);
  });

  it('stays silent when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    const { Button } = await load();
    render(<Button iconOnly aria-label="x" />);
    expect(messages()).not.toContain(MESSAGE);
  });

  it('does not warn for a plain labelled Button', async () => {
    const { Button } = await load();
    render(<Button>Save</Button>);
    expect(messages()).not.toContain(MESSAGE);
  });
});

// ── hds#393: iconOnly takes its name from label ──────────────────────────────

describe('Button iconOnly accessible name (hds#393)', () => {
  it('names <Button iconOnly label="Close" iconLeft={x}/> "Close"', async () => {
    const { Button } = await load();
    const { getByRole } = render(<Button iconOnly label="Close" iconLeft={<Search />} />);
    expect(getByRole('button').getAttribute('aria-label')).toBe('Close');
    expect(getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});

const NO_NAME =
  '[Button] iconOnly hides the label text, so the button has no accessible name; pass label (or aria-label / aria-labelledby).';

describe('Button iconOnly without an accessible name (hds#393)', () => {
  it('warns once when an icon-only button has no name', async () => {
    const { Button } = await load();
    render(<Button iconOnly iconLeft={<Search />} />);
    render(<Button iconOnly iconLeft={<Search />} />);
    expect(messages().filter((m) => m === NO_NAME)).toHaveLength(1);
  });

  it.each([
    ['label', { label: 'Search' }],
    ['aria-label', { 'aria-label': 'Search' }],
    ['aria-labelledby', { 'aria-labelledby': 'search-heading' }],
    ['title', { title: 'Search' }],
  ])('stays silent when %s names it', async (_, nameProps) => {
    const { Button } = await load();
    render(<Button iconOnly iconLeft={<Search />} {...nameProps} />);
    expect(messages()).not.toContain(NO_NAME);
  });

  it('stays silent in production', async () => {
    process.env.NODE_ENV = 'production';
    const { Button } = await load();
    render(<Button iconOnly iconLeft={<Search />} />);
    expect(messages()).not.toContain(NO_NAME);
  });

  it('stays silent with asChild (the child carries its own name)', async () => {
    const { Button } = await load();
    render(
      <Button iconOnly asChild>
        <a href="/x" className="hds-focus">
          go
        </a>
      </Button>,
    );
    expect(messages()).not.toContain(NO_NAME);
  });
});

// ── hds#393: toggle button (pressed / defaultPressed / onPressedChange) ──────

describe('Button pressed (hds#393)', () => {
  it('is not a toggle unless pressed, defaultPressed or onPressedChange is set', async () => {
    const { Button } = await load();
    const { getByRole } = render(<Button>Save</Button>);
    expect(getByRole('button').hasAttribute('aria-pressed')).toBe(false);
    expect(getByRole('button').hasAttribute('data-pressed')).toBe(false);
  });

  it('controlled: reports the pressed state and asks for the next one on click', async () => {
    const { Button } = await load();
    const onPressedChange = vi.fn();
    const { getByRole } = render(
      <Button pressed onPressedChange={onPressedChange}>
        Bold
      </Button>,
    );
    const button = getByRole('button', { name: 'Bold' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onPressedChange).toHaveBeenCalledWith(false);
    // Controlled: the prop, not the click, decides the state.
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('uncontrolled: defaultPressed seeds a state the button keeps itself', async () => {
    const { Button } = await load();
    const onPressedChange = vi.fn();
    const { getByRole } = render(
      <Button defaultPressed={false} onPressedChange={onPressedChange}>
        Mute
      </Button>,
    );
    const button = getByRole('button', { name: 'Mute' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('data-pressed')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-pressed')).toBe('true');
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
  });

  it('an onClick that calls preventDefault keeps the state', async () => {
    const { Button } = await load();
    const { getByRole } = render(
      <Button defaultPressed onClick={(e) => e.preventDefault()}>
        Save
      </Button>,
    );
    fireEvent.click(getByRole('button'));
    expect(getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps data-state for loading, separate from data-pressed', async () => {
    const { Button } = await load();
    const { getByRole } = render(
      <Button pressed loading>
        Sync
      </Button>,
    );
    expect(getByRole('button').getAttribute('data-state')).toBe('loading');
    expect(getByRole('button').getAttribute('data-pressed')).toBe('true');
  });
});

describe('Button asChild disabled contract (hds#— bugfix)', () => {
  it('disables a slotted link: aria-disabled, out of tab order, non-interactive + disabled-token text', async () => {
    const { Button } = await load();
    const { container } = render(
      <Button asChild disabled>
        <a href="#x" className="hds-focus">
          Link
        </a>
      </Button>,
    );
    const a = container.querySelector('a')!;
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');
    expect(a.classList.contains('pointer-events-none')).toBe(true);
    expect(a.classList.contains('text-[var(--semantic-color-content-disabled)]')).toBe(true);
  });

  it('leaves an enabled slotted link fully interactive', async () => {
    const { Button } = await load();
    const { container } = render(
      <Button asChild>
        <a href="#x" className="hds-focus">
          Link
        </a>
      </Button>,
    );
    const a = container.querySelector('a')!;
    expect(a.getAttribute('aria-disabled')).toBeNull();
    expect(a.getAttribute('tabindex')).toBeNull();
    expect(a.classList.contains('pointer-events-none')).toBe(false);
  });
});

// ── hds#938: toggle label crossfade ─────────────────────────────────────────

describe('Button toggle label crossfade (hds#938)', () => {
  it('a11y:button.label-crossfade - a label change keeps old and new mounted overlapped; the old label is aria-hidden and the accessible name is the new label', async () => {
    const { Button } = await load();
    const { container, getByRole, rerender } = render(
      <Button pressed={false} onPressedChange={() => {}}>
        Follow
      </Button>,
    );
    rerender(
      <Button pressed onPressedChange={() => {}}>
        Following
      </Button>,
    );
    // Mid-transition: both labels are mounted in the crossfade stack.
    const labels = container.querySelectorAll('[data-crossfade-label]');
    expect(labels.length).toBe(2);
    const live = container.querySelector('[data-crossfade-label="live"]');
    const exiting = container.querySelector('[data-crossfade-label="exiting"]');
    expect(live?.textContent).toBe('Following');
    expect(exiting?.textContent).toBe('Follow');
    expect(exiting?.getAttribute('aria-hidden')).toBe('true');
    // Both labels share one grid cell, so the button holds the wider of the
    // two widths for the whole transition, then releases it.
    expect(live?.parentElement).toBe(exiting?.parentElement);
    expect(live?.classList.contains('col-start-1')).toBe(true);
    expect(exiting?.classList.contains('col-start-1')).toBe(true);
    // The accessible name switched to the new label immediately.
    expect(getByRole('button', { name: 'Following' })).not.toBeNull();
    // Once the fade completes the old label unmounts.
    await waitFor(() =>
      expect(container.querySelectorAll('[data-crossfade-label]').length).toBe(1),
    );
    expect(container.querySelector('[data-crossfade-label="live"]')?.textContent).toBe('Following');
  });

  it('swaps the label instantly with no overlap under prefers-reduced-motion', async () => {
    stubReducedMotion();
    try {
      const { Button } = await load();
      const { container, getByRole, rerender } = render(
        <Button pressed={false} onPressedChange={() => {}}>
          Follow
        </Button>,
      );
      rerender(
        <Button pressed onPressedChange={() => {}}>
          Following
        </Button>,
      );
      expect(container.querySelectorAll('[data-crossfade-label]').length).toBe(0);
      expect(container.querySelector('[data-slot="label-crossfade"]')).toBeNull();
      expect(getByRole('button', { name: 'Following' })).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not crossfade a non-toggle button whose label changes', async () => {
    const { Button } = await load();
    const { container, rerender } = render(<Button>Save</Button>);
    rerender(<Button>Saved</Button>);
    expect(container.querySelectorAll('[data-crossfade-label]').length).toBe(0);
    expect(container.querySelector('[data-slot="label-crossfade"]')).toBeNull();
  });
});
