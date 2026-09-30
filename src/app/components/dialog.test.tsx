/**
 * Tests for Dialog — closed/open mounting, trigger open, controlled open, title.
 * Plain-DOM assertions (no jest-dom). Radix Dialog needs a couple of jsdom
 * polyfills (pointer capture, scrollIntoView).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function Example() {
  return (
    <Dialog>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Confirm</Dialog.Title>
        <Dialog.Description>Are you sure?</Dialog.Description>
      </Dialog.Content>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('renders no dialog while closed', () => {
    render(<Example />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the dialog from the trigger with an accessible name', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(screen.getByText('Confirm')).not.toBeNull();
  });

  it('renders open when controlled', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).not.toBeNull();
  });
});

describe('Dialog compound assembly (hds#363)', () => {
  it('does not write the parts onto the Radix Root export', () => {
    // The old assembly was `Dialog = DialogPrimitive.Root; Dialog.Overlay = …`,
    // which mutated a third-party export and kept every part alive in any
    // webpack/esbuild bundle that reached the shared chunk.
    expect(Dialog).not.toBe(DialogPrimitive.Root);
    const root = DialogPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of [
      'Trigger',
      'Portal',
      'Overlay',
      'Content',
      'Header',
      'Footer',
      'Title',
      'Description',
      'Close',
    ]) {
      expect(root[part], `Radix Root.${part}`).toBeUndefined();
    }
  });

  it('keeps every static part and the display name', () => {
    expect(Dialog.displayName).toBe('Dialog');
    expect(Dialog.Trigger).toBe(DialogTrigger);
    expect(Dialog.Portal).toBe(DialogPortal);
    expect(Dialog.Overlay).toBe(DialogOverlay);
    expect(Dialog.Content).toBe(DialogContent);
    expect(Dialog.Header).toBe(DialogHeader);
    expect(Dialog.Footer).toBe(DialogFooter);
    expect(Dialog.Title).toBe(DialogTitle);
    expect(Dialog.Description).toBe(DialogDescription);
    expect(Dialog.Close).toBe(DialogClose);
  });

  it('still forwards root props to Radix (uncontrolled defaultOpen)', () => {
    render(
      <Dialog defaultOpen>
        <Dialog.Content>
          <Dialog.Title>Default open</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Default open' })).toBeTruthy();
  });
});
