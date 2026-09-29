/**
 * Storybook preview: toolbar globals must reach <html> so portalled overlays
 * (Dialog, Menu) follow the Theme/Density/Brand toolbar, and must win over the
 * ThemeProvider, which pins <html data-theme="light"> on mount (#307).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../src/app/context/ThemeContext';
import { GlobalsSync } from '../.storybook/globals-sync';

const root = document.documentElement;

afterEach(() => {
  cleanup();
  for (const a of ['data-theme', 'data-density', 'data-brand']) root.removeAttribute(a);
  root.classList.remove('dark');
});

describe('GlobalsSync', () => {
  it('mirrors theme/density/brand onto <html>, winning over ThemeProvider', () => {
    render(
      <>
        <ThemeProvider>
          <div />
        </ThemeProvider>
        <GlobalsSync theme="dark" density="compact" brand="accent-lilac" />
      </>,
    );
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.getAttribute('data-density')).toBe('compact');
    expect(root.getAttribute('data-brand')).toBe('accent-lilac');
  });

  it('updates on change and drops empty brand', () => {
    const { rerender } = render(<GlobalsSync theme="dark" brand="accent-lilac" />);
    rerender(<GlobalsSync theme="light" brand="" />);
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.hasAttribute('data-brand')).toBe(false);
  });

  it('cleans up brand on unmount', () => {
    const { unmount } = render(<GlobalsSync theme="dark" brand="accent-lilac" />);
    unmount();
    expect(root.hasAttribute('data-brand')).toBe(false);
  });
});
