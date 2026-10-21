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

describe('Disclosure row variant', () => {
  const row = (extra = {}) => (
    <Disclosure
      variant="row"
      label="Row title"
      preview="First line of the content"
      actions={<button type="button">Archive</button>}
      {...extra}
    >
      Full content
    </Disclosure>
  );

  it('a11y:disclosure.row-preview - the preview shows collapsed and is removed when open', async () => {
    const user = userEvent.setup();
    render(row());
    expect(screen.getByText('First line of the content')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: /Row title/ }));
    expect(screen.queryByText('First line of the content')).toBeNull();
    expect(screen.getByText('Full content')).not.toBeNull();
  });

  it('a11y:disclosure.row-preview - the preview is clamped to one line', () => {
    render(row());
    expect(screen.getByText('First line of the content').className).toContain('truncate');
  });

  it('a11y:disclosure.row-actions - actions sit beside the trigger, never inside it', () => {
    render(row());
    const trigger = screen.getByRole('button', { name: /Row title/ });
    const action = screen.getByRole('button', { name: 'Archive' });
    expect(trigger.contains(action)).toBe(false);
    expect(trigger.querySelector('button, a, [role="button"]')).toBeNull();
    expect(trigger.parentElement?.contains(action)).toBe(true);
  });

  it('a11y:disclosure.row-actions - actions stay available when the row is open', async () => {
    const user = userEvent.setup();
    render(row());
    await user.click(screen.getByRole('button', { name: /Row title/ }));
    expect(screen.getByRole('button', { name: 'Archive' })).not.toBeNull();
  });

  it('a11y:disclosure.row-expanded-state - aria-expanded follows the row and aria-controls names the panel', async () => {
    const user = userEvent.setup();
    render(row());
    const trigger = screen.getByRole('button', { name: /Row title/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(trigger.getAttribute('aria-controls') as string);
    expect(panel?.textContent).toBe('Full content');
  });

  it('a11y:disclosure.row-target-size - the row trigger keeps the 24px minimum height', () => {
    render(row());
    expect(screen.getByRole('button', { name: /Row title/ }).className).toContain(
      'min-h-[var(--primitive-size-interactive-minCompact)]',
    );
  });

  it('a11y:disclosure.row-keyboard - Enter toggles the row and Tab reaches the action next', async () => {
    const user = userEvent.setup();
    render(row());
    const trigger = screen.getByRole('button', { name: /Row title/ });
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    await user.keyboard('{Enter}');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Archive' }));
  });
});
