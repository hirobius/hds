/**
 * Render-count guard for CommandPalette (hds#1145): moving the active row with
 * the keyboard or the mouse re-renders only the row that loses it and the row
 * that gets it, not every row in the list. Kbd renders are the probe: each row
 * holds one Kbd shortcut, and the search field holds one more (Esc).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import { CommandPalette, type CommandPaletteItem } from './command-palette';

const probe = vi.hoisted(() => ({ kbd: 0 }));

vi.mock('./kbd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./kbd')>();
  const Kbd = React.forwardRef<HTMLElement, React.ComponentProps<typeof actual.Kbd>>(
    function CountedKbd(props, ref) {
      probe.kbd += 1;
      return <actual.Kbd ref={ref} {...props} />;
    },
  );
  return { ...actual, Kbd };
});

afterEach(cleanup);

const ROWS = 30;
const ITEMS: CommandPaletteItem[] = Array.from({ length: ROWS }, (_, i) => ({
  id: `cmd-${i}`,
  label: `Command ${i}`,
  group: i < ROWS / 2 ? 'First' : 'Second',
  shortcut: ['K'],
}));

function renderOpen() {
  const onOpenChange = vi.fn();
  const onSelect = vi.fn();
  render(<CommandPalette open onOpenChange={onOpenChange} items={ITEMS} onSelect={onSelect} />);
  return { onSelect };
}

const field = () => screen.getByRole('combobox', { name: 'Command palette' });

describe('CommandPalette render count', () => {
  it('ArrowDown re-renders two rows, not the whole list', () => {
    renderOpen();
    probe.kbd = 0;
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    // Old active row + new active row + the Esc hint in the header.
    expect(probe.kbd).toBeLessThanOrEqual(3);
    expect(field().getAttribute('aria-activedescendant')).toMatch(/-opt-1$/);
  });

  it('hovering a row re-renders two rows, not the whole list', () => {
    renderOpen();
    probe.kbd = 0;
    const options = screen.getAllByRole('option');
    fireEvent.mouseMove(options[5]);
    expect(probe.kbd).toBeLessThanOrEqual(3);
    expect(options[5].getAttribute('aria-selected')).toBe('true');
  });

  it('a memoized row still runs the latest onSelect', () => {
    const { onSelect } = renderOpen();
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.click(screen.getAllByRole('option')[3]);
    expect(onSelect).toHaveBeenCalledWith(ITEMS[3]);
  });
});
