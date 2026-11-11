import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { Dock } from './dock';

function Screen({ hideOnInput }: { hideOnInput?: boolean }) {
  return (
    <>
      <label>
        Note
        <input type="text" />
      </label>
      <label>
        Remote
        <input type="checkbox" />
      </label>
      <textarea aria-label="Cover letter" />
      <Dock hideOnInput={hideOnInput}>
        <Button variant="primary">Apply</Button>
      </Dock>
    </>
  );
}

const flush = () => act(() => vi.runAllTimers());

describe('Dock (hds#1432)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('a11y:dock.region - is a named region with the hds-dock class', () => {
    render(<Screen />);
    const dock = screen.getByRole('region', { name: 'Actions' });
    expect(dock.classList.contains('hds-dock')).toBe(true);
    expect(dock.getAttribute('data-hds-component')).toBe('Dock');
    expect(dock.hasAttribute('data-hidden')).toBe(false);
  });

  it('takes a custom accessible name and className', () => {
    render(
      <Dock aria-label="Job actions" className="mt-scale-sm">
        <Button>Save</Button>
      </Dock>,
    );
    expect(screen.getByRole('region', { name: 'Job actions' }).className).toBe(
      'hds-dock mt-scale-sm',
    );
  });

  it('a11y:dock.hide-on-input - hides while a text field has focus and shows again when focus leaves it', () => {
    vi.useFakeTimers();
    render(<Screen />);
    const dock = screen.getByRole('region', { name: 'Actions' });
    act(() => screen.getByRole('textbox', { name: 'Note' }).focus());
    expect(dock.hasAttribute('data-hidden')).toBe(true);
    act(() => screen.getByRole('textbox', { name: 'Cover letter' }).focus());
    flush();
    expect(dock.hasAttribute('data-hidden')).toBe(true);
    act(() => screen.getByRole('button', { name: 'Apply' }).focus());
    flush();
    expect(dock.hasAttribute('data-hidden')).toBe(false);
  });

  it('stays shown for a field that opens no keyboard (checkbox)', () => {
    render(<Screen />);
    act(() => screen.getByRole('checkbox', { name: 'Remote' }).focus());
    expect(screen.getByRole('region', { name: 'Actions' }).hasAttribute('data-hidden')).toBe(false);
  });

  it('hides for a contenteditable', () => {
    render(
      <>
        <div
          contentEditable
          suppressContentEditableWarning
          data-testid="ed"
          role="textbox"
          tabIndex={0}
        />
        <Dock>
          <Button>Send</Button>
        </Dock>
      </>,
    );
    const ed = screen.getByTestId('ed');
    // jsdom does not implement isContentEditable.
    Object.defineProperty(ed, 'isContentEditable', { value: true });
    act(() => ed.focus());
    expect(screen.getByRole('region').hasAttribute('data-hidden')).toBe(true);
  });

  it('never hides with hideOnInput={false}', () => {
    render(<Screen hideOnInput={false} />);
    act(() => screen.getByRole('textbox', { name: 'Note' }).focus());
    expect(screen.getByRole('region', { name: 'Actions' }).hasAttribute('data-hidden')).toBe(false);
  });

  it('hides while the visual viewport shows an on-screen keyboard, ignoring pinch-zoom', () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: window.innerHeight,
      offsetTop: 0,
      scale: 1,
      addEventListener: (t: string, f: () => void) => (listeners[t] = f),
      removeEventListener: () => {},
    };
    vi.stubGlobal('visualViewport', vv);
    render(
      <Dock>
        <Button>Apply</Button>
      </Dock>,
    );
    const dock = screen.getByRole('region');
    expect(dock.hasAttribute('data-hidden')).toBe(false);
    vv.height = window.innerHeight - 300;
    act(() => listeners.resize());
    expect(dock.hasAttribute('data-hidden')).toBe(true);
    vv.scale = 2;
    act(() => listeners.resize());
    expect(dock.hasAttribute('data-hidden')).toBe(false);
  });

  it('leaves the actions reachable by keyboard', () => {
    render(<Screen />);
    const apply = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(apply);
    act(() => apply.focus());
    expect(document.activeElement).toBe(apply);
  });

  it('a11y:dock.reduced-motion - under reduced motion it only fades, with no slide', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8');
    const block = css.slice(
      css.indexOf('/* --- Dock (hds#1432)'),
      css.indexOf('/* --- Sheet (hds#690)'),
    );
    const reduced = block.slice(block.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.hds-dock\s*\{\s*transition:\s*opacity/);
    expect(reduced).toMatch(/\.hds-dock\[data-hidden\]\s*\{\s*transform:\s*none/);
  });
});
