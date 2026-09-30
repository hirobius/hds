/**
 * Portalled overlay parts hydrate cleanly (hds#335).
 *
 * The scope resolver renders a hidden in-place anchor on the first client
 * render. The server must emit the same anchor, or React 18 throws "Hydration
 * failed because the initial UI does not match what was rendered on the server"
 * and falls back to client-rendering the whole root (CONSUMING §12, islands).
 *
 * The server pass runs with `document` absent, exactly as under Node SSR.
 *
 * @unit hds#335
 */
import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { HdsThemeProvider } from '../hds-theme';
import { Dialog } from '../../components/dialog';
import { AlertDialog } from '../../components/alert-dialog';
import { Menu } from '../../components/menu';
import { ContextMenu } from '../../components/context-menu';
import { Popover } from '../../components/popover';
import { Select } from '../../components/select';
import { HoverCard } from '../../components/hover-card';
import { Tooltip } from '../../components/hds-tooltip';
import { ExpandTooltip } from '../../components/tooltip';
import { Lightbox } from '../../components/image-lightbox';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PARTS: Array<[string, () => React.ReactElement]> = [
  [
    'Dialog',
    () => (
      <Dialog>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog>
    ),
  ],
  [
    'AlertDialog',
    () => (
      <AlertDialog>
        <AlertDialog.Content>
          <AlertDialog.Title>Title</AlertDialog.Title>
          <AlertDialog.Description>Body</AlertDialog.Description>
        </AlertDialog.Content>
      </AlertDialog>
    ),
  ],
  [
    'Menu',
    () => (
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Profile</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
  ],
  [
    'ContextMenu',
    () => (
      <ContextMenu>
        <ContextMenu.Trigger>Right-click</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Cut</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    ),
  ],
  [
    'Popover',
    () => (
      <Popover>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>Body</Popover.Content>
      </Popover>
    ),
  ],
  [
    'Select',
    () => (
      <Select
        label="Plan"
        value="free"
        onChange={() => {}}
        options={[{ value: 'free', label: 'Free' }]}
      />
    ),
  ],
  [
    'HoverCard',
    () => (
      <HoverCard>
        <HoverCard.Trigger>@ada</HoverCard.Trigger>
        <HoverCard.Content>Ada</HoverCard.Content>
      </HoverCard>
    ),
  ],
  [
    'Tooltip',
    () => (
      <Tooltip>
        <Tooltip.Trigger>Hover</Tooltip.Trigger>
        <Tooltip.Content>Tip</Tooltip.Content>
      </Tooltip>
    ),
  ],
  ['ExpandTooltip', () => <ExpandTooltip visible mode="cursor" label="Pill" x={1} y={1} />],
  ['Lightbox', () => <Lightbox open onClose={() => {}} src="/x.png" alt="Pic" />],
];

const SETUPS: Array<[string, (child: React.ReactElement) => React.ReactElement]> = [
  [
    'bare data-hds div',
    (c) => (
      <div data-hds="" data-theme="dark">
        {c}
      </div>
    ),
  ],
  ['HdsThemeProvider', (c) => <HdsThemeProvider theme="dark">{c}</HdsThemeProvider>],
];

function serverHtml(ui: React.ReactElement): string {
  vi.stubGlobal('document', undefined);
  try {
    return renderToString(ui);
  } finally {
    vi.unstubAllGlobals();
  }
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe.each(SETUPS)('hydration inside %s', (_setup, wrap) => {
  it.each(PARTS)('%s hydrates without a recoverable error', async (_name, make) => {
    const spy = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.appendChild(host);
    host.innerHTML = serverHtml(wrap(make()));

    await act(async () => {
      hydrateRoot(host, wrap(make()), { onRecoverableError: spy });
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
