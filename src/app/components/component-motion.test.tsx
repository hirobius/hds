/**
 * Component motion: every state change Adrian saw jump (Pin swap, Duplicate,
 * tabs) now carries its motion hook. The animation itself is CSS on motion
 * tokens (component-motion.css); these tests pin the hooks onto the DOM.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { Button } from './button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { PresenceList, PresenceItem } from './presence-list';
import { Skeleton, SkeletonSwap } from './skeleton';
import { Dialog } from './dialog';
import { Popover } from './popover';

afterEach(cleanup);

describe('Button motion', () => {
  it('eases down on press', () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole('button').className.split(/\s+/);
    expect(cls).toContain('active:scale-97');
  });

  it('settles a toggle’s new label in after it flips, never on first render', () => {
    function Pin() {
      const [pinned, setPinned] = React.useState(false);
      return (
        <Button pressed={pinned} onPressedChange={setPinned}>
          {pinned ? 'Pinned' : 'Pin'}
        </Button>
      );
    }
    render(<Pin />);
    const button = screen.getByRole('button');
    expect(button.querySelector('.hds-motion-swap')).toBeNull();
    fireEvent.click(button);
    const swapped = button.querySelector('.hds-motion-swap');
    expect(swapped?.textContent).toBe('Pinned');
    fireEvent.click(button);
    // Remounted (new node), so the animation replays on every flip.
    const back = button.querySelector('.hds-motion-swap');
    expect(back?.textContent).toBe('Pin');
    expect(back).not.toBe(swapped);
  });
});

describe('Tabs indicator', () => {
  it('draws one bar that follows the active tab', async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">One</TabsTrigger>
          <TabsTrigger value="b">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole('tablist');
    const bar = list.querySelector('.hds-tabs-indicator');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(list.hasAttribute('data-indicator')).toBe(true);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Two' }));
    await waitFor(() => expect(screen.getByRole('tabpanel').textContent).toBe('B'));
    expect(list.hasAttribute('data-indicator')).toBe(true);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});

describe('PresenceList', () => {
  function Cards({ ids }: { ids: string[] }) {
    return (
      <PresenceList>
        {ids.map((id) => (
          <PresenceItem key={id} data-testid={id}>
            {id}
          </PresenceItem>
        ))}
      </PresenceList>
    );
  }

  it('animates only items added after the first render', () => {
    const { rerender } = render(<Cards ids={['a']} />);
    expect(screen.getByTestId('a').className).not.toContain('hds-motion-item-enter');
    rerender(<Cards ids={['a', 'a-copy']} />);
    expect(screen.getByTestId('a-copy').className).toContain('hds-motion-item-enter');
    expect(screen.getByTestId('a').className).not.toContain('hds-motion-item-enter');
  });

  it('collapses a removed item before unmounting it', async () => {
    const { rerender } = render(<Cards ids={['a', 'b']} />);
    rerender(<Cards ids={['a']} />);
    await waitFor(() => expect(screen.queryByTestId('b')).toBeNull());
    expect(screen.getByTestId('a')).toBeTruthy();
  });
});

describe('SkeletonSwap', () => {
  it('fades content in once it loads, and not when it never loaded', () => {
    const { rerender, container } = render(
      <SkeletonSwap loading skeleton={<Skeleton data-testid="sk" />}>
        Loaded
      </SkeletonSwap>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('sk')).toBeTruthy();
    rerender(
      <SkeletonSwap loading={false} skeleton={<Skeleton />}>
        Loaded
      </SkeletonSwap>,
    );
    expect(root.textContent).toBe('Loaded');
    expect(root.className).toContain('hds-motion-reveal');
    cleanup();
    const fresh = render(
      <SkeletonSwap loading={false} skeleton={<Skeleton />}>
        Ready
      </SkeletonSwap>,
    );
    expect((fresh.container.firstElementChild as HTMLElement).className).not.toContain(
      'hds-motion-reveal',
    );
  });
});

describe('Overlay enter / exit hooks', () => {
  it('Dialog panel and scrim carry the modal motion', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('hds-motion-modal');
    expect(document.querySelector('.hds-motion-scrim')).not.toBeNull();
  });

  it('Popover content carries the popover motion', async () => {
    render(
      <Popover open>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>Body</Popover.Content>
      </Popover>,
    );
    await act(async () => {});
    expect(screen.getByText('Body').className).toContain('hds-motion-popover');
  });
});
