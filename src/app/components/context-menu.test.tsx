/**
 * Tests for ContextMenu. Plain-DOM assertions. Radix ContextMenu needs the
 * pointer-capture jsdom polyfill and is opened via a contextmenu event.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { ContextMenu } from './context-menu';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function Example() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>Right-click me</ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item>Cut</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item disabled>Paste</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

describe('ContextMenu', () => {
  it('renders only the trigger while closed', () => {
    render(<Example />);
    expect(screen.getByText('Right-click me')).not.toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('opens the menu on a contextmenu event', () => {
    render(<Example />);
    fireEvent.contextMenu(screen.getByText('Right-click me'));
    expect(screen.getByRole('menu')).not.toBeNull();
    expect(screen.getByText('Cut')).not.toBeNull();
  });
});

describe('ContextMenu compound assembly (hds#365)', () => {
  const PARTS = [
    'Trigger',
    'Content',
    'Item',
    'CheckboxItem',
    'RadioGroup',
    'RadioItem',
    'Label',
    'Separator',
    'Group',
    'Sub',
    'SubTrigger',
    'SubContent',
  ] as const;

  it('does not write the parts onto the Radix Root export', () => {
    expect(ContextMenu).not.toBe(ContextMenuPrimitive.Root);
    const root = ContextMenuPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of PARTS) expect(root[part], `Radix Root.${part}`).toBeUndefined();
  });

  it('keeps every static part and the display name', () => {
    expect(ContextMenu.displayName).toBe('ContextMenu');
    for (const part of PARTS) expect(ContextMenu[part], part).toBeDefined();
    expect(ContextMenu.Trigger).toBe(ContextMenuPrimitive.Trigger);
    expect(ContextMenu.Group).toBe(ContextMenuPrimitive.Group);
    expect(ContextMenu.RadioGroup).toBe(ContextMenuPrimitive.RadioGroup);
    expect(ContextMenu.Sub).toBe(ContextMenuPrimitive.Sub);
  });

  it('still forwards root props to Radix (onOpenChange)', () => {
    const onOpenChange = vi.fn();
    render(
      <ContextMenu onOpenChange={onOpenChange}>
        <ContextMenu.Trigger>Right-click me</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Cut</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Right-click me'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
