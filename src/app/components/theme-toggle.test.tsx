/**
 * Tests for ThemeToggle — reads and sets the theme through ThemeContext (or the
 * isDark / onToggle props), follows the OS until the user picks, remembers the pick.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { ThemeToggle } from './theme-toggle';

function mockOs(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? dark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
});
afterEach(cleanup);

describe('ThemeToggle', () => {
  it('follows the OS until the user picks: a dark OS shows the switch-to-light name', () => {
    mockOs(true);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('a click sets data-theme on <html> and remembers the choice', () => {
    mockOs(false);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('hds-theme-mode')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeTruthy();
  });

  it('restores a remembered choice over the OS preference', () => {
    mockOs(true);
    localStorage.setItem('hds-theme-mode', 'light');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('exposes the sun/moon morph state on the button and an aria-hidden svg', () => {
    mockOs(false);
    const { rerender } = render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('data-theme-state')).toBe('light');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    rerender(<ThemeToggle isDark onToggle={() => {}} />);
    expect(button.getAttribute('data-theme-state')).toBe('dark');
  });

  it('is controllable: isDark and onToggle override the context', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle isDark onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('merges a consumer className and forwards its ref', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<ThemeToggle ref={ref} isDark={false} onToggle={() => {}} className="hds-extra" />);
    expect(ref.current).toBe(screen.getByRole('button'));
    expect(ref.current?.className).toContain('hds-extra');
  });

  it('warns in dev when clicked with no provider and no props, and stays quiet otherwise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { unmount } = render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/ThemeToggle.*ThemeProvider.*isDark.*onToggle/);
    unmount();

    warn.mockClear();
    const controlled = render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    controlled.unmount();
    mockOs(false);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// hds#1407: the moon leans instead of standing upright. The icon's dark rotation places the
// mask cut (centre (17,8), vector (5,-4) from the glyph centre) about 20-30deg above level.
describe('moon tilt (hds#1407)', () => {
  it('rotates the dark icon so the crescent tilts 20-30deg', () => {
    const css = readFileSync('src/styles/theme.css', 'utf8');
    const deg = Number(
      /\[data-theme-state='dark'\] \.hds-theme-toggle__icon \{\s*transform: rotate\((-?[\d.]+)deg\)/.exec(
        css,
      )?.[1],
    );
    const cut = (Math.atan2(4, 5) * 180) / Math.PI; // degrees above level before rotation
    const tilt = cut - deg;
    expect(tilt).toBeGreaterThanOrEqual(20);
    expect(tilt).toBeLessThanOrEqual(30);
  });
});
