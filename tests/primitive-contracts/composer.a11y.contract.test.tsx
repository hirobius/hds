/**
 * Contract test: Composer accessibility rules (hds#520). Composer owns operable
 * behaviour of its own on top of Textarea, Button, Tag and Dialog: a submit chord,
 * a paste that folds into a chip, and an edit dialog that must hand focus back to
 * the chip. Each `it` title carries the `a11y:<id>` the Composer `@a11y component`
 * tags point at. Keyboard cases drive a real keyboard (user-event).
 *
 * @primitive Composer
 */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { Composer } from '@/app/components/composer';
import { user } from './overlay-fixtures';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

const paste = (el: HTMLElement, text: string) =>
  fireEvent.paste(el, { clipboardData: { getData: () => text } });

const LONG = 'a long pasted block of text';

describe('Composer accessibility contract', () => {
  it('a11y:composer.field-label - the textarea has an accessible name: "Message" by default, the label prop when set', () => {
    const { rerender } = render(<Composer />);
    expect(screen.getByRole('textbox', { name: 'Message' }).tagName).toBe('TEXTAREA');
    rerender(<Composer label="Reply" />);
    expect(screen.getByRole('textbox', { name: 'Reply' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
  });

  it('a11y:composer.keyboard - Tab reaches the field and Send; Cmd or Ctrl+Enter submits and plain Enter only adds a newline', async () => {
    const u = user();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    await u.tab();
    const field = screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(field);
    await u.keyboard('hi{Enter}there');
    expect(field.value).toBe('hi\nthere');
    expect(onSubmit).not.toHaveBeenCalled();
    await u.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ text: 'hi\nthere', attachments: [] });
    // Uncontrolled: it cleared itself, so Send is disabled again; refill and reach Send by Tab.
    await u.keyboard('x');
    await u.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send' }));
    await u.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('a11y:composer.chip-name - a fold chip is a button named by its label plus "edit" that announces it opens a dialog', () => {
    render(<Composer pasteFoldThreshold={5} />);
    paste(screen.getByRole('textbox', { name: 'Message' }), LONG);
    const list = screen.getByRole('list', { name: 'Attachments' });
    const chip = within(list).getByRole('button', {
      name: `Pasted text · ${LONG.length} chars, edit`,
    });
    expect(chip.getAttribute('aria-haspopup')).toBe('dialog');
    expect(chip.hasAttribute('aria-pressed')).toBe(false);
  });

  it('a11y:composer.chip-keyboard - Enter on a focused fold chip opens its edit dialog', async () => {
    const u = user();
    render(<Composer pasteFoldThreshold={5} />);
    paste(screen.getByRole('textbox', { name: 'Message' }), LONG);
    const chip = screen.getByRole('button', { name: /pasted text/i });
    chip.focus();
    await u.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('a11y:composer.dialog-labelled - the edit dialog is named by its title, described by the fold label, and its field is labelled', async () => {
    render(<Composer pasteFoldThreshold={5} />);
    paste(screen.getByRole('textbox', { name: 'Message' }), LONG);
    fireEvent.click(screen.getByRole('button', { name: /pasted text/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit pasted text' });
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') as string)?.textContent,
    ).toBe(`Pasted text · ${LONG.length} chars`);
    expect(within(dialog).getByRole('textbox', { name: 'Pasted text' })).toBeTruthy();
  });

  it('a11y:composer.dialog-focus-trapped - Tab and Shift+Tab stay inside the edit dialog', async () => {
    const u = user();
    render(<Composer pasteFoldThreshold={5} />);
    paste(screen.getByRole('textbox', { name: 'Message' }), LONG);
    fireEvent.click(screen.getByRole('button', { name: /pasted text/i }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 6; i++) {
      await u.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 6; i++) {
      await u.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('a11y:composer.chip-focus-return - closing the edit dialog by Escape or Save returns focus to the fold chip', async () => {
    const u = user();
    render(<Composer pasteFoldThreshold={5} />);
    paste(screen.getByRole('textbox', { name: 'Message' }), LONG);
    const open = async () => {
      const chip = screen.getByRole('button', { name: /pasted text/i });
      chip.focus();
      await u.keyboard('{Enter}');
      return screen.findByRole('dialog');
    };
    await open();
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /pasted text/i })),
    );
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /pasted text/i })),
    );
  });
});
