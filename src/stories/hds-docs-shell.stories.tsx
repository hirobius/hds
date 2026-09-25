/**
 * HdsDocsShell stories — three-region docs shell mechanics.
 * @see src/app/layouts/HdsDocsShell.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsDocsShell } from '../app/layouts/HdsDocsShell';

const Panel = ({ label, lines = 3 }: { label: string; lines?: number }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-surface-raised, #e5e7eb)',
      border: '1px solid var(--semantic-color-border-default, #d1d5db)',
      borderRadius: '6px',
      padding: '16px',
      fontSize: '12px',
      color: 'var(--semantic-color-content-secondary, #6b7280)',
    }}
  >
    {label}
    {Array.from({ length: lines }).map((_, i) => (
      <p key={i} style={{ margin: '8px 0 0' }}>
        Line {i + 1} of filler content to give the rail something to scroll.
      </p>
    ))}
  </div>
);

const meta = {
  title: 'Layout/HdsDocsShell',
  component: HdsDocsShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HdsDocsShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    leftRail: <Panel label="Left nav rail" lines={12} />,
    rightRail: <Panel label="On this page" lines={8} />,
    children: <Panel label="Content" lines={20} />,
  },
};

export const NoRightRail: Story = {
  args: {
    leftRail: <Panel label="Left nav rail" lines={12} />,
    children: <Panel label="Content (no TOC rail)" lines={20} />,
  },
};

export const ContentOnly: Story = {
  args: {
    children: <Panel label="Content only — both rails omitted" lines={10} />,
  },
};

export const WithTopOffset: Story = {
  args: {
    topOffset: '56px',
    leftRail: <Panel label="Left nav rail (offset below a 56px header)" lines={12} />,
    rightRail: <Panel label="On this page" lines={8} />,
    children: <Panel label="Content" lines={20} />,
  },
};
