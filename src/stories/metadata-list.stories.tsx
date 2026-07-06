/**
 * MetadataList stories.
 * @see src/app/components/metadata-list.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { MetadataList } from '../app/components/metadata-list';
import { InlineCode } from '../app/components/inline-code';

const meta = {
  title: 'Patterns/metadata-list',
  component: MetadataList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: { type: 'select' }, options: ['vertical', 'horizontal'] },
    variant: { control: { type: 'select' }, options: ['plain', 'divided'] },
  },
} satisfies Meta<typeof MetadataList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { term: 'Status', description: 'Active' },
      { term: 'Owner', description: 'Adrian' },
      { term: 'Updated', description: 'Jul 2026' },
    ],
  },
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    items: [
      { term: 'Status', description: 'Active' },
      { term: 'Owner', description: 'Adrian' },
      { term: 'Updated', description: 'Jul 2026' },
    ],
  },
};

/**
 * The `divided` variant renders one bordered container with a full-width rule
 * between each pair, and supports rich, multi-line descriptions. Use it for
 * spec sheets and namespace tables rather than short key/value metadata.
 */
export const Divided: Story = {
  args: {
    variant: 'divided',
    footer:
      'Any release may add names inside DS-owned space; consumers may never declare there. Collisions become impossible by construction — no registry, no coordination.',
    items: [
      {
        term: 'DS-owned',
        description: (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <InlineCode compact>--primitive-*</InlineCode>
            <InlineCode compact>--semantic-*</InlineCode>
            <InlineCode compact>--component-*</InlineCode>
            <InlineCode compact>--role-*</InlineCode>
            <InlineCode compact>--hds-*</InlineCode>
          </span>
        ),
      },
      {
        term: 'Consumer-owned',
        description: (
          <>
            <InlineCode compact>--lb-*</InlineCode>
            <div className="mt-1">(lilac-bonds; each consumer picks its own prefix)</div>
          </>
        ),
      },
      {
        term: 'Retired squat',
        description: (
          <>
            <InlineCode compact style={{ textDecoration: 'line-through' }}>
              --primitive-color-lilac-*
            </InlineCode>
            <div className="mt-1 flex items-center gap-2">
              → moved to <InlineCode compact>--lb-lilac-*</InlineCode>
            </div>
          </>
        ),
      },
    ],
  },
};
