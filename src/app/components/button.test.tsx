/**
 * Button dev warning: `iconOnly` renders only `iconLeft`, so an icon-only
 * Button without one is an empty square. The warning fires once per module
 * load, in development only, and never for IconButton, asChild or loading.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Search } from 'lucide-react';

const MESSAGE =
  '[Button] iconOnly renders only iconLeft; pass iconLeft (iconRight is hidden in iconOnly mode).';

// The once flag is module state, so each test loads a fresh copy of the module.
async function load() {
  vi.resetModules();
  const { Button } = await import('./button');
  const { IconButton } = await import('./icon-button');
  return { Button, IconButton };
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

  it('stays silent for IconButton, which always passes iconLeft', async () => {
    const { IconButton } = await load();
    render(<IconButton icon={Search} label="Search" />);
    expect(messages()).not.toContain(MESSAGE);
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
