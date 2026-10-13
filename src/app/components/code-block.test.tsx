/**
 * Tests for CodeBlock accessibility (hds#520). Each `it` title carries the
 * `a11y:<id>` the CodeBlock `@a11y component` tags point at.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from './code-block';

afterEach(cleanup);

const css = (file: string) => readFileSync(resolve(__dirname, '../../styles', file), 'utf8');
const tokenPx = (name: string) =>
  Number(css('tokens.css').match(new RegExp(`${name}:\\s*(\\d+)px`))?.[1]);

describe('CodeBlock accessibility contract', () => {
  it('a11y:code-block.scroll-region - the code is a named, focusable region so keyboard users can scroll it', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code="const a = 1;" language="ts" />);
    const region = screen.getByRole('region', { name: 'Code sample' });
    expect(region.getAttribute('tabindex')).toBe('0');
    await user.tab();
    expect(document.activeElement).toBe(region);
  });

  it('a11y:code-block.copy-name - the copy button is a named button that is not a submit button, and is renamed after copying', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <CodeBlock code="npm i" />
      </form>,
    );
    const copy = screen.getByRole('button', { name: 'Copy code' });
    expect(copy.getAttribute('type')).toBe('button');
    await user.click(copy);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).not.toBeNull());
    expect(await navigator.clipboard.readText()).toBe('npm i');
  });

  it.each(['block', 'inline'] as const)(
    'a11y:code-block.copy-status - copying is announced from a status region that exists before the change (%s)',
    async (variant) => {
      const user = userEvent.setup();
      render(<CodeBlock code="npm i" variant={variant} />);
      const status = screen.getByRole('status');
      expect(status.textContent).toBe('');
      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      await waitFor(() => expect(within(status).queryByText(/copied/i)).not.toBeNull());
    },
  );

  it('a11y:code-block.expand-state - the toggle reports aria-expanded and aria-controls, works with Enter and Space, and removes the closed panel', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code="x" collapsible />);
    const toggle = screen.getByRole('button', { name: /show code/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Code sample' })).toBeNull();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls') as string);
    expect(panel?.querySelector('pre')).not.toBeNull();
    await user.keyboard(' ');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Code sample' })).toBeNull();
  });

  it('a11y:code-block.focus-return - collapsing while focus is inside the panel returns focus to the toggle', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code="x" collapsible defaultExpanded />);
    const region = screen.getByRole('region', { name: 'Code sample' });
    region.focus();
    expect(document.activeElement).toBe(region);
    const toggle = screen.getByRole('button', { name: /hide code/i });
    await user.click(toggle);
    expect(document.activeElement).toBe(toggle);
  });

  it('a11y:code-block.focus-ring - the copy button and the toggle carry the shared focus ring class', () => {
    render(<CodeBlock code="x" collapsible defaultExpanded />);
    for (const button of screen.getAllByRole('button')) {
      expect(
        button.className,
        button.textContent || button.getAttribute('aria-label') || '',
      ).toContain('hds-focus');
    }
  });

  it.each(['block', 'inline'] as const)(
    'a11y:code-block.target-size - the copy button is 24px or more and lifts to the touch target on coarse pointers (%s)',
    (variant) => {
      render(<CodeBlock code="x" variant={variant} />);
      const copy = screen.getByRole('button', { name: 'Copy code' });
      expect(copy.className).toContain('hds-touch-target');
      // 16px icon + 2 x the subgrid-gap padding (primitive space-1)
      expect(16 + 2 * tokenPx('--primitive-space-1')).toBeGreaterThanOrEqual(24);
      expect(copy.className).toContain('py-[var(--semantic-space-subgrid-gap)]');
      expect(css('theme.css')).toMatch(
        /\.hds-touch-target\s*\{[^}]*min-height:\s*var\(--primitive-size-interactive-min\)/,
      );
    },
  );
});
