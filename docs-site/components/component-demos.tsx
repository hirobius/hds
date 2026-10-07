'use client';

/**
 * Live demos for component pages. These render the REAL components from the
 * linked @hirobius/design-system package, not screenshots. The registry is
 * typed against PREVIEWED_COMPONENTS, so a demo cannot be added or dropped
 * without the generated pages and the drift test knowing.
 *
 * Demos are interactive but local: state lives inside each demo. Overlays
 * (Dialog, Menu, Select) portal into the nearest [data-hds] scope, which
 * <DemoFrame> provides so they inherit the page theme.
 */
import { useState, type ReactNode } from 'react';
import { Button, Checkbox, Dialog, Input, Menu, Select, Table } from '@hirobius/design-system';
import { MetricTile, MetricTiles } from '@hirobius/design-system/patterns';
import type { PreviewedComponent } from '../lib/previewed-components';

function ButtonDemo() {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
      <Button variant="secondary" pressed={pressed} onClick={() => setPressed((p) => !p)}>
        {pressed ? 'Pressed' : 'Toggle'}
      </Button>
    </div>
  );
}

function InputDemo() {
  return (
    <div style={{ display: 'grid', gap: 12, width: 'min(100%, 320px)' }}>
      <Input label="Project name" placeholder="Portfolio redesign" />
      <Input label="Start date" type="date" defaultValue="2026-10-01" />
      <Input size="sm" placeholder="Small" aria-label="Small input" />
    </div>
  );
}

function SelectDemo() {
  const [value, setValue] = useState('design');
  return (
    <div style={{ width: 'min(100%, 280px)' }}>
      <Select
        label="Discipline"
        value={value}
        onChange={setValue}
        options={[
          { value: 'design', label: 'Design' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'research', label: 'Research' },
        ]}
      />
    </div>
  );
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Checkbox label="Receive project update emails" checked={checked} onChange={setChecked} />
      <Checkbox label="Disabled option" checked={false} onChange={() => {}} disabled />
    </div>
  );
}

function DialogDemo() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Confirm action</Dialog.Title>
          <Dialog.Description>
            This will publish your portfolio to the live URL. This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Button variant="primary">Publish</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

function MenuDemo() {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Actions</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Component</Menu.Label>
        <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
        <Menu.Item onSelect={() => {}}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => {}}>Archive</Menu.Item>
        <Menu.Item disabled onSelect={() => {}}>
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

function TableDemo() {
  return (
    <Table
      caption="Recent projects"
      columns={[
        { key: 'name', label: 'Project' },
        { key: 'status', label: 'Status' },
        { key: 'updated', label: 'Updated', align: 'right' },
      ]}
      rows={[
        {
          key: 'portfolio',
          cells: [
            { slot: 'label', content: 'Portfolio redesign' },
            { slot: 'badge', content: 'Active' },
            { slot: 'value', content: '2026-10-05', align: 'right' },
          ],
        },
        {
          key: 'tokens',
          cells: [
            { slot: 'label', content: 'Token audit' },
            { slot: 'badge', content: 'Review' },
            { slot: 'value', content: '2026-10-02', align: 'right' },
          ],
        },
      ]}
    />
  );
}

function MetricTilesDemo() {
  return (
    <MetricTiles>
      <MetricTile label="Open tasks" value="24" sub="6 due this week" />
      <MetricTile label="Shipped" value="12" sub="This month" tone="success" />
      <MetricTile label="Blocked" value="3" sub="Needs a decision" tone="danger" />
    </MetricTiles>
  );
}

export const DEMOS: Record<PreviewedComponent, () => ReactNode> = {
  Button: ButtonDemo,
  Input: InputDemo,
  Select: SelectDemo,
  Checkbox: CheckboxDemo,
  Dialog: DialogDemo,
  Menu: MenuDemo,
  Table: TableDemo,
  MetricTiles: MetricTilesDemo,
};

export function DemoFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-hds
      className="hds-demo-frame not-prose"
      style={{
        padding: 24,
        border: '1px solid var(--semantic-color-border-default)',
        borderRadius: 8,
        background: 'var(--semantic-color-surface-page)',
        color: 'var(--semantic-color-content-primary)',
      }}
    >
      {children}
    </div>
  );
}
