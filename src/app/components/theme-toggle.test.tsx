/**
 * Tests for ThemeToggle — reads and sets the theme through ThemeContext (or the
 * isDark / onToggle props), follows the OS until the user picks, remembers the pick.
 */
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
});
