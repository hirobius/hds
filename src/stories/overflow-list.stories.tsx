/**
 * OverflowList stories.
 * @see src/app/components/overflow-list.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { OverflowList } from '../app/components/overflow-list';

const meta = {
  title: 'Patterns/overflow-list',
  component: OverflowList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof OverflowList>;

export default meta;
type Story = StoryObj<typeof meta>;

const tagClass =
  'inline-flex items-center rounded-md bg-muted px-2 h-6 text-sm font-medium text-muted-foreground';

export const Default: Story = {
  render: () => (
    <OverflowList>
      <span className={tagClass}>Design</span>
      <span className={tagClass}>Engineering</span>
      <span className={tagClass}>Marketing</span>
    </OverflowList>
  ),
};

export const WithOverflow: Story = {
  render: () => (
    <OverflowList max={3}>
      <span className={tagClass}>Design</span>
      <span className={tagClass}>Engineering</span>
      <span className={tagClass}>Marketing</span>
      <span className={tagClass}>Sales</span>
      <span className={tagClass}>Support</span>
    </OverflowList>
  ),
};
