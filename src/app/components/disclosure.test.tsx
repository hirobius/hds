/**
 * Tests for Disclosure: the expand/collapse contract a keyboard or screen-reader
 * user relies on (hds#520). Each `it` title carries the `a11y:<id>` the
 * Disclosure `@a11y component` tags point at.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Disclosure } from './disclosure';

afterEach(cleanup);

const tokens = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as { primitive: { size: { interactive: { minCompact: { $value: { value: number } } } } } };

describe('Disclosure accessibility contract', () => {
  it('a11y:disclosure.expanded-state - the trigger is a button whose aria-expanded follows the panel and whose aria-controls names it', async () => {
    const user = userEvent.setup();
    render(<Disclosure label="Details">Body text</Disclosure>);
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)?.textContent).toBe('Body text');
  });

  it('a11y:disclosure.keyboard - Enter and Space toggle it', async () => {
    const user = userEvent.setup();
    render(<Disclosure label="Details">Body text</Disclosure>);
    const trigger = screen.getByRole('button', { name: 'Details' });
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    await user.keyboard('{Enter}');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard(' ');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('a11y:disclosure.hidden-collapsed - a collapsed panel is removed from the document, not only hidden by style', async () => {
    const user = userEvent.setup();
    render(<Disclosure label="Details">Body text</Disclosure>);
    expect(screen.queryByText('Body text')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Details' });
    await user.click(trigger);
    expect(screen.queryByText('Body text')).not.toBeNull();
    await user.click(trigger);
    await waitFor(() => expect(screen.queryByText('Body text')).toBeNull());
  });

  it('a11y:disclosure.focus-return - collapsing while focus is inside the panel returns focus to the trigger', async () => {
    const user = userEvent.setup();
    function Controlled() {
      return (
        <Disclosure label="Details" defaultOpen>
          <button type="button">Inside</button>
        </Disclosure>
      );
    }
    render(<Controlled />);
    const inside = screen.getByRole('button', { name: 'Inside' });
    inside.focus();
    expect(document.activeElement).toBe(inside);
    await user.click(screen.getByRole('button', { name: 'Details' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Inside' })).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Details' }));
  });

  it('a11y:disclosure.focus-ring - the trigger carries the shared focus ring class', () => {
    render(<Disclosure label="Details">Body</Disclosure>);
    expect(screen.getByRole('button', { name: 'Details' }).className).toContain('hds-focus');
  });

  it('a11y:disclosure.target-size - the trigger is at least 24px tall in every variant (WCAG 2.5.8)', () => {
    const minimum = tokens.primitive.size.interactive.minCompact.$value.value;
    expect(minimum).toBeGreaterThanOrEqual(24);
    for (const variant of ['panel', 'nav', 'card'] as const) {
      const { unmount } = render(
        <Disclosure label="Details" variant={variant}>
          Body
        </Disclosure>,
      );
      const cls = screen.getByRole('button', { name: 'Details' }).className;
      expect(cls, `${variant} trigger`).toContain(
        'min-h-[var(--primitive-size-interactive-minCompact)]',
      );
      unmount();
    }
  });

  it('a11y:disclosure.chevron-hidden - the chevron is decorative', () => {
    render(<Disclosure label="Details">Body</Disclosure>);
    const chevron = screen
      .getByRole('button', { name: 'Details' })
      .querySelector('[aria-hidden="true"]');
    expect(chevron?.querySelector('svg')).not.toBeNull();
  });
});
