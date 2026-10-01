/**
 * Button dev warning: `iconOnly` renders only `iconLeft`, so an icon-only
 * Button without one is an empty square. The warning fires once per module
 * load, in development only, and never for the IconButton recipe (iconOnly +
 * label + iconLeft Icon, which replaced IconButton in 0.20.0), asChild or loading.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Search } from 'lucide-react';
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
