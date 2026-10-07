/**
 * Portalled overlay parts inherit the nearest `[data-hds]` scope (hds#335).
 *
 * Radix `Portal` defaults to `document.body`, which sits outside a
 * `<div data-hds data-theme="dark">` scope and so renders light tokens on a dark
 * page. Each overlay part must resolve its portal container in this order:
 * explicit `container` prop, HdsThemeProvider element, the nearest `[data-hds]`
 * ancestor of an in-place anchor, then `document.body`.
 *
 * @unit hds#335
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { HdsThemeProvider } from '../hds-theme';
import { Dialog } from '../../components/dialog';
import { AlertDialog } from '../../components/alert-dialog';
import { Menu } from '../../components/menu';
import { Popover } from '../../components/popover';
import { Select } from '../../components/select';
import { Tooltip } from '../../components/hds-tooltip';
import { ExpandTooltip } from '../../components/tooltip';

type Container = HTMLElement | null | undefined;

interface Part {
  name: string;
  /** Render the part, forwarding `container` to its Content. */
  ui: (container: Container) => React.ReactElement;
  /** Open the part after mount when it cannot be opened by prop. */
  open?: () => void;
  /** Locate the portalled content node. */
  find: () => HTMLElement | null;
}

const byTestId = () => document.querySelector<HTMLElement>('[data-testid="portal-content"]');

const PARTS: Part[] = [
  {
    name: 'Dialog',
    ui: (container) => (
      <Dialog defaultOpen>
        <Dialog.Content container={container} data-testid="portal-content">
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Body</Dialog.Description>
        </Dialog.Content>
      </Dialog>
    ),
    find: byTestId,
  },
  {
    name: 'AlertDialog',
    ui: (container) => (
      <AlertDialog defaultOpen>
        <AlertDialog.Content container={container} data-testid="portal-content">
          <AlertDialog.Title>Title</AlertDialog.Title>
          <AlertDialog.Description>Body</AlertDialog.Description>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        </AlertDialog.Content>
      </AlertDialog>
    ),
    find: byTestId,
  },
  {
    name: 'Menu',
    ui: (container) => (
      <Menu defaultOpen>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content container={container} data-testid="portal-content">
          <Menu.Item>Profile</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
    find: byTestId,
  },
  {
    name: 'Popover',
    ui: (container) => (
      <Popover defaultOpen>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content container={container} data-testid="portal-content">
          Body
        </Popover.Content>
      </Popover>
    ),
    find: byTestId,
  },
  {
    name: 'Select',
    ui: (container) => (
      <Select
        label="Plan"
        value="free"
        onChange={() => {}}
        options={[
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
        ]}
        container={container}
      />
    ),
    open: () =>
      fireEvent.keyDown(document.querySelector('[role="combobox"]') as Element, {
        key: 'ArrowDown',
      }),
    find: () => document.querySelector<HTMLElement>('[role="listbox"]'),
  },
  {
    name: 'Tooltip',
    ui: (container) => (
      <Tooltip open>
        <Tooltip.Trigger>Hover</Tooltip.Trigger>
        <Tooltip.Content container={container} data-testid="portal-content">
          Tip
        </Tooltip.Content>
      </Tooltip>
    ),
    find: byTestId,
  },
];

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-hds');
  document.body.replaceChildren();
});

describe.each(PARTS)('$name portal scope', (part) => {
  it('lands inside HdsThemeProvider theme="dark"', () => {
    const { container } = render(
      <HdsThemeProvider theme="dark">{part.ui(undefined)}</HdsThemeProvider>,
    );
    part.open?.();
    const scope = container.querySelector<HTMLElement>('[data-hds][data-theme="dark"]');
    const content = part.find();
    expect(scope).not.toBeNull();
    expect(content).not.toBeNull();
    expect(content!.closest('[data-hds]')).toBe(scope);
  });

  it('lands inside a bare <div data-hds data-theme="dark"> with no provider', () => {
    const { getByTestId } = render(
      <div data-hds="" data-theme="dark" data-testid="scope">
        {part.ui(undefined)}
      </div>,
    );
    part.open?.();
    const content = part.find();
    expect(content).not.toBeNull();
    expect(content!.closest('[data-hds]')).toBe(getByTestId('scope'));
  });

  it('honours an explicit container over the surrounding scope', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const { getByTestId } = render(
      <div data-hds="" data-theme="dark" data-testid="scope">
        {part.ui(target)}
      </div>,
    );
    part.open?.();
    const content = part.find();
    expect(content).not.toBeNull();
    expect(target.contains(content)).toBe(true);
    expect(getByTestId('scope').contains(content)).toBe(false);
  });

  it('stays under document.body when data-hds is on <html>', () => {
    document.documentElement.setAttribute('data-hds', '');
    render(<div>{part.ui(undefined)}</div>);
    part.open?.();
    const content = part.find();
    expect(content).not.toBeNull();
    // Portalling into <html> would put the node outside <body>.
    expect(content!.closest('body')).toBe(document.body);
    expect(content!.closest('[data-hds]')).toBe(document.documentElement);
  });
});

describe('ExpandTooltip cursor pill portal scope', () => {
  it('mounts inside the nearest data-hds scope, not document.body', () => {
    const { getByTestId } = render(
      <div data-hds="" data-theme="dark" data-testid="scope">
        <ExpandTooltip visible mode="cursor" label="Expand pill" x={10} y={10} />
      </div>,
    );
    const pill = Array.from(document.querySelectorAll('span')).find(
      (el) => el.textContent === 'Expand pill',
    );
    expect(pill).toBeDefined();
    expect(getByTestId('scope').contains(pill as Element)).toBe(true);
  });
});
