/**
 * Tests for HdsContextMenu. Plain-DOM assertions. Radix ContextMenu needs the
 * pointer-capture jsdom polyfill and is opened via a contextmenu event.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsContextMenu } from './hds-context-menu';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function Example() {
  return (
    <HdsContextMenu>
      <HdsContextMenu.Trigger>Right-click me</HdsContextMenu.Trigger>
      <HdsContextMenu.Content>
        <HdsContextMenu.Item>Cut</HdsContextMenu.Item>
        <HdsContextMenu.Separator />
        <HdsContextMenu.Item disabled>Paste</HdsContextMenu.Item>
      </HdsContextMenu.Content>
    </HdsContextMenu>
  );
}

describe('HdsContextMenu', () => {
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
