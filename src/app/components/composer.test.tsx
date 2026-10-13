/**
 * Tests for Composer — auto-grow, paste folding, editing a fold, the submit
 * chord, and the pending/disabled lock. Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { Composer } from './composer';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const box = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
const paste = (el: HTMLElement, text: string) =>
  fireEvent.paste(el, { clipboardData: { getData: () => text } });

describe('Composer', () => {
  it('labels the field and shows the placeholder', () => {
    render(<Composer placeholder="Drop a thought" />);
    expect(box().placeholder).toBe('Drop a thought');
  });

  it('grows to its content height as the text changes', () => {
    let scrollHeight = 40;
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(
      () => scrollHeight,
    );
    render(<Composer />);
    scrollHeight = 120;
    fireEvent.change(box(), { target: { value: 'a\nb\nc\nd' } });
    expect(box().style.height).toBe('120px');
  });

  it('keeps a short paste inline', () => {
    render(<Composer pasteFoldThreshold={20} />);
    const notPrevented = paste(box(), 'short text');
    expect(notPrevented).toBe(true);
    expect(screen.queryByRole('button', { name: /pasted text/i })).toBeNull();
  });

  it('folds a paste longer than the threshold into an attachment card', () => {
    render(<Composer pasteFoldThreshold={20} />);
    const notPrevented = paste(box(), 'x'.repeat(21));
    expect(notPrevented).toBe(false);
    expect(box().value).toBe('');
    expect(screen.getByRole('button', { name: /pasted text/i })).toBeTruthy();
  });

  it('does not fold a paste while pending', () => {
    render(<Composer pending pasteFoldThreshold={5} />);
    paste(box(), 'a long pasted text');
    expect(screen.queryByRole('button', { name: /pasted text/i })).toBeNull();
  });

  it('opens a dialog to edit a fold and saves the edit into the submitted attachment', () => {
    const onSubmit = vi.fn();
    render(<Composer pasteFoldThreshold={5} onSubmit={onSubmit} />);
    paste(box(), 'original long paste');
    fireEvent.click(screen.getByRole('button', { name: /pasted text/i }));
    const dialog = screen.getByRole('dialog');
    const editor = within(dialog).getByRole('textbox') as HTMLTextAreaElement;
    expect(editor.value).toBe('original long paste');
    fireEvent.change(editor, { target: { value: 'edited paste' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(box(), { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith({
      text: '',
      attachments: [expect.objectContaining({ text: 'edited paste' })],
    });
  });

  it('returns focus to the fold chip when the edit dialog closes', async () => {
    render(<Composer pasteFoldThreshold={5} />);
    paste(box(), 'original long paste');
    const chip = screen.getByRole('button', { name: /pasted text/i });
    chip.focus();
    fireEvent.click(chip);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /pasted text/i })),
    );
  });

  it('removes a fold from its dialog', () => {
    render(<Composer pasteFoldThreshold={5} />);
    paste(box(), 'original long paste');
    fireEvent.click(screen.getByRole('button', { name: /pasted text/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    expect(screen.queryByRole('button', { name: /pasted text/i })).toBeNull();
  });

  it('shows attachments passed in', () => {
    render(<Composer attachments={[{ id: 'a', label: 'notes.pdf' }]} />);
    expect(screen.getByText('notes.pdf')).toBeTruthy();
  });

  it.each([
    ['metaKey', { metaKey: true }],
    ['ctrlKey', { ctrlKey: true }],
  ])('submits on %s+Enter', (_n, mods) => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    fireEvent.change(box(), { target: { value: 'hello' } });
    fireEvent.keyDown(box(), { key: 'Enter', ...mods });
    expect(onSubmit).toHaveBeenCalledWith({ text: 'hello', attachments: [] });
  });

  it('lets plain Enter insert a newline instead of submitting', () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    fireEvent.change(box(), { target: { value: 'hello' } });
    const notPrevented = fireEvent.keyDown(box(), { key: 'Enter' });
    expect(notPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits from the button and ignores an empty composer', () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    fireEvent.keyDown(box(), { key: 'Enter', metaKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('clears itself after submit when uncontrolled', () => {
    render(<Composer onSubmit={() => {}} />);
    fireEvent.change(box(), { target: { value: 'hi' } });
    fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true });
    expect(box().value).toBe('');
  });

  it('blocks submit while pending and marks the control busy', () => {
    const onSubmit = vi.fn();
    render(<Composer pending defaultValue="hi" onSubmit={onSubmit} />);
    fireEvent.keyDown(box(), { key: 'Enter', metaKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /send/i }).getAttribute('aria-busy')).toBe('true');
  });

  it('blocks submit and input while disabled', () => {
    const onSubmit = vi.fn();
    render(<Composer disabled defaultValue="hi" onSubmit={onSubmit} />);
    fireEvent.keyDown(box(), { key: 'Enter', metaKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box().disabled).toBe(true);
  });
});
