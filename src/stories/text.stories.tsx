/**
 * Text stories — typographic variant ramp demos.
 * @see src/app/components/Text.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Text } from '../app/components/text';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/Text',
  component: Text,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Text'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'Token-bound typographic primitive. Six roles (display, title, body, ui, caption, mono) map onto the type ramp via design tokens. All font metrics resolve from CSS custom properties. The pre-cut variant names still render, as deprecated aliases of a role, and go in 1.0.0.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['display', 'title', 'body', 'ui', 'caption', 'mono'],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Display: Story = {
  args: { variant: 'display', children: 'Display Heading' },
};

/** Deprecated alias of `title`: still renders, goes in 1.0.0. */
export const Heading1: Story = {
  // type-ramp-ok: pins that the pre-cut variant names still render
  args: { variant: 'heading1', children: 'Heading 1 (now title)' },
};

/** Deprecated alias of `title`: still renders, goes in 1.0.0. */
export const Heading2: Story = {
  // type-ramp-ok: pins that the pre-cut variant names still render
  args: { variant: 'heading2', children: 'Heading 2 (now title)' },
};

/** Deprecated alias of `title`: still renders, goes in 1.0.0. */
export const Heading3: Story = {
  // type-ramp-ok: pins that the pre-cut variant names still render
  args: { variant: 'heading3', children: 'Heading 3 (now title)' },
};

export const Body: Story = {
  args: {
    variant: 'body',
    children: 'Body text for paragraphs, descriptions, and flowing prose content.',
  },
};

export const UI: Story = {
  args: {
    variant: 'ui',
    children: 'UI label text for controls and metadata.',
  },
};

export const Caption: Story = {
  args: { variant: 'caption', children: 'Caption for supporting metadata.' },
};

/** Deprecated alias of `mono`: still renders, goes in 1.0.0. */
export const Technical: Story = {
  // type-ramp-ok: pins that the pre-cut variant names still render
  args: { variant: 'technical', children: 'technical.token.path (now mono)' },
};

export const FullRamp: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'The six roles stacked to verify the full ramp.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Text variant="display">Display</Text>
      <Text variant="title">Title</Text>
      <Text variant="body">Body — flowing prose and paragraph copy.</Text>
      <Text variant="ui">UI — labels and control text.</Text>
      <Text variant="caption">Caption — supporting metadata.</Text>
      <Text variant="mono">semantic.typography.mono</Text>
    </div>
  ),
};
