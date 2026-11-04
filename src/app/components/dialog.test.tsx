/**
 * Tests for Dialog — closed/open mounting, trigger open, controlled open, title.
 * Plain-DOM assertions (no jest-dom). Radix Dialog needs a couple of jsdom
 * polyfills (pointer capture, scrollIntoView), installed for every suite by
 * tests/setup/jsdom-polyfills.ts.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
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
  DialogBody,
} from './dialog';

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
    expect(Dialog.Body).toBe(DialogBody);
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

describe('Dialog close vs title (bug bash 24 review)', () => {
  // The close button sits in the content's top-right padding; a long title ran under the X at
  // 1280 and 390 (measured in Chromium). The first child (Title or Header) keeps clear of it.
  const reserve = /(^|\s)\[&>:first-child\]:pr-10(\s|$)/;
  it('reserves the close button column beside the first child when the close button shows', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>A long title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).toMatch(reserve);
  });
  it('reserves nothing with hideClose', () => {
    render(
      <Dialog open>
        <Dialog.Content hideClose>
          <Dialog.Title>A long title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).not.toMatch(reserve);
  });
});

describe('Dialog size (hds#863)', () => {
  const content = (props: React.ComponentProps<typeof DialogContent>) => {
    render(
      <Dialog open>
        <Dialog.Content {...props}>
          <Dialog.Title>T</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    return screen.getByRole('dialog');
  };
  it('defaults to the existing max-w-lg width', () => {
    expect(content({}).className).toMatch(/(^|\s)max-w-lg(\s|$)/);
  });
  it.each([
    ['sm', 'max-w-sm'],
    ['md', 'max-w-lg'],
    ['lg', 'max-w-2xl'],
    ['xl', 'max-w-4xl'],
  ] as const)('size=%s caps the width at %s', (size, cls) => {
    const el = content({ size });
    expect(el.className).toContain(cls);
    expect(el.getAttribute('data-size')).toBe(size);
  });
});

describe('Dialog scroll body with pinned header and footer (hds#863)', () => {
  function Scrolling() {
    return (
      <Dialog open>
        <Dialog.Content scrollBody>
          <Dialog.Header>
            <Dialog.Title>Long</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body data-testid="body">lots</Dialog.Body>
          <Dialog.Footer data-testid="footer">actions</Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    );
  }
  it('makes the surface a clipped flex column so only the body scrolls', () => {
    render(<Scrolling />);
    const cls = screen.getByRole('dialog').className;
    expect(cls).toMatch(/(^|\s)flex(\s|$)/);
    expect(cls).toMatch(/(^|\s)flex-col(\s|$)/);
    expect(cls).toMatch(/(^|\s)overflow-hidden(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)overflow-y-auto(\s|$)/);
  });
  it('lets the body shrink and scroll; header and footer never shrink', () => {
    render(<Scrolling />);
    const body = screen.getByTestId('body').className;
    expect(body).toContain('min-h-0');
    expect(body).toContain('flex-1');
    expect(body).toContain('overflow-y-auto');
    expect(screen.getByTestId('footer').className).toContain('shrink-0');
    expect(screen.getByText('Long').closest('div')!.className).toContain('shrink-0');
  });
  it('keeps the default scrolling surface when scrollBody is off', () => {
    renderTitleOnly();
    expect(screen.getByRole('dialog').className).toMatch(/(^|\s)overflow-y-auto(\s|$)/);
  });
});

function renderTitleOnly(placement?: 'top') {
  render(
    <Dialog open>
      <Dialog.Content placement={placement}>
        <Dialog.Title>T</Dialog.Title>
      </Dialog.Content>
    </Dialog>,
  );
}

describe('Dialog top-anchored, keyboard-aware placement (hds#863)', () => {
  afterEach(() => {
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
  });
  it('anchors to the top instead of centring', () => {
    renderTitleOnly('top');
    const el = screen.getByRole('dialog');
    expect(el.getAttribute('data-placement')).toBe('top');
    expect(el.className).toContain('top-[max(');
    expect(el.className).not.toMatch(/(^|\s)top-1\/2(\s|$)/);
    expect(el.className).not.toMatch(/-translate-y-1\/2/);
  });
  it('centres by default', () => {
    renderTitleOnly();
    expect(screen.getByRole('dialog').className).toMatch(/(^|\s)top-1\/2(\s|$)/);
  });
  it('caps its height to the visual viewport so the on-screen keyboard does not cover it', () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 400,
      offsetTop: 0,
      addEventListener: (t: string, fn: () => void) => (listeners[t] = fn),
      removeEventListener: (t: string) => delete listeners[t],
    };
    (window as unknown as { visualViewport: unknown }).visualViewport = vv;
    renderTitleOnly('top');
    const el = screen.getByRole('dialog');
    expect(el.style.getPropertyValue('--hds-dialog-viewport-height')).toBe('400px');
    vv.height = 250;
    act(() => listeners.resize());
    expect(el.style.getPropertyValue('--hds-dialog-viewport-height')).toBe('250px');
  });
});

describe('Dialog title/description gap survives a host CSS reset (hds#863)', () => {
  it('spaces the header with flex gap, not sibling margins a `* { margin: 0 }` reset would zero', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Header data-testid="h">
            <Dialog.Title>T</Dialog.Title>
            <Dialog.Description>D</Dialog.Description>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog>,
    );
    const cls = screen.getByTestId('h').className;
    expect(cls).toMatch(/(^|\s)gap-1\.5(\s|$)/);
    expect(cls).not.toMatch(/space-y-/);
  });
});
