/**
 * Motion stage: one component interaction per URL hash (#button, #tabs...),
 * for scripts/record-motion.mjs to film. Every control carries a data-step
 * the recorder clicks or hovers in order. Imports per file, as main.tsx does.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../src/app/components/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/app/components/tabs';
import { SegmentedControl } from '../src/app/components/segmented-control';
import { Menu } from '../src/app/components/menu';
import { Popover } from '../src/app/components/popover';
import { Dialog } from '../src/app/components/dialog';
import { Tooltip } from '../src/app/components/hds-tooltip';
import { ToastProvider, useToast } from '../src/app/components/toast';
import { Disclosure } from '../src/app/components/disclosure';
import { Select } from '../src/app/components/select';
import { PresenceList, PresenceItem } from '../src/app/components/presence-list';
import { Skeleton, SkeletonSwap } from '../src/app/components/skeleton';
import { Card } from '../src/app/components/card';
import '../src/styles/fonts.css';
import '../src/styles/index.css';

function PinButton() {
  const [pinned, setPinned] = useState(false);
  return (
    <Button data-step="1" variant="secondary" pressed={pinned} onPressedChange={setPinned}>
      {pinned ? 'Pinned ★' : 'Pin'}
    </Button>
  );
}

function SegmentedDemo() {
  const [value, setValue] = useState('day');
  const options = ['day', 'week', 'month'].map((v) => ({ value: v, label: v }));
  return <SegmentedControl label="Range" options={options} value={value} onChange={setValue} />;
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <Button
      data-step="1"
      onClick={() =>
        toast({ title: 'Saved', description: 'Your card was duplicated.', duration: 2000 })
      }
    >
      Show toast
    </Button>
  );
}

function SelectDemo() {
  const [value, setValue] = useState('a');
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];
  return <Select label="Pick" options={options} value={value} onChange={setValue} />;
}

function ListDemo() {
  const [cards, setCards] = useState(['Card 1', 'Card 2']);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button data-step="1" onClick={() => setCards((c) => [...c, `Card ${c.length + 1}`])}>
          Duplicate
        </Button>
        <Button data-step="2" variant="secondary" onClick={() => setCards((c) => c.slice(1))}>
          Remove first
        </Button>
      </div>
      <PresenceList className="flex w-80 flex-col">
        {cards.map((name) => (
          <PresenceItem key={name} className="mb-2 rounded-md border border-border p-4">
            {name}
          </PresenceItem>
        ))}
      </PresenceList>
    </div>
  );
}

function SkeletonDemo() {
  const [loading, setLoading] = useState(true);
  return (
    <div className="flex flex-col gap-4">
      <Button data-step="1" onClick={() => setLoading((l) => !l)}>
        Toggle loading
      </Button>
      <SkeletonSwap loading={loading} skeleton={<Skeleton width={320} height={96} />}>
        <Card className="w-80 p-4">Loaded content</Card>
      </SkeletonSwap>
    </div>
  );
}

const SCENES: Record<string, () => React.ReactElement> = {
  button: () => (
    <div className="flex gap-4">
      <Button>Press me</Button>
      <PinButton />
    </div>
  ),
  tabs: () => (
    <Tabs defaultValue="a">
      <TabsList aria-label="Sections">
        <TabsTrigger value="a">Overview</TabsTrigger>
        <TabsTrigger data-step="1" value="b">
          Activity
        </TabsTrigger>
        <TabsTrigger data-step="2" value="c">
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="a">Overview</TabsContent>
      <TabsContent value="b">Activity</TabsContent>
      <TabsContent value="c">Settings</TabsContent>
    </Tabs>
  ),
  segmented: SegmentedDemo,
  menu: () => (
    <Menu>
      <Menu.Trigger asChild>
        <Button data-step="1">Open menu</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Item>Archive</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
  popover: () => (
    <Popover>
      <Popover.Trigger asChild>
        <Button data-step="1">Open popover</Button>
      </Popover.Trigger>
      <Popover.Content>Popover body</Popover.Content>
    </Popover>
  ),
  dialog: () => (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button data-step="1">Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Dialog</Dialog.Title>
        <Dialog.Description>Press Escape to close.</Dialog.Description>
      </Dialog.Content>
    </Dialog>
  ),
  tooltip: () => (
    <Tooltip delayDuration={0}>
      <Tooltip.Trigger asChild>
        <Button data-step="hover">Hover me</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Tooltip</Tooltip.Content>
    </Tooltip>
  ),
  toast: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
  disclosure: () => (
    <div className="w-80" data-step="1">
      <Disclosure label="Details">Hidden content that opens with a height animation.</Disclosure>
    </div>
  ),
  select: SelectDemo,
  list: ListDemo,
  skeleton: SkeletonDemo,
};

function Stage() {
  const Scene = SCENES[window.location.hash.slice(1)] ?? SCENES.button;
  return (
    <div data-hds className="min-h-screen bg-background p-16 text-foreground">
      <Scene />
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<Stage />);
