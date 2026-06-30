/**
 * Callout stories — tone and italic demos.
 * @see src/app/components/callout.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Callout } from '../app/components/callout';

const meta = {
  title: 'Primitives/callout',
  component: Callout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Tone-driven side-rule callout for status messages, pull quotes, and hypotheses. Tones: accent | info | success | warning | danger.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['accent', 'info', 'success', 'warning', 'danger'],
    },
    italic: { control: 'boolean' },
  },
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: 'info',
    children: 'This component is in active development. The prop API may change before 1.0.',
  },
};

export const Accent: Story = {
  args: {
    tone: 'accent',
    children: 'New design tokens are available in the latest release. Review the migration guide before upgrading.',
  },
};

export const Success: Story = {
  args: {
    tone: 'success',
    children: 'All guardrails passed. The component meets accessibility and token-compliance requirements.',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    children: 'Deprecated prop detected. Migrate to the updated API before the next major release.',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    children: 'Breaking change: the `size` prop has been removed. Use the `scale` token instead.',
  },
};

export const Italic: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Italic mode for pull quotes or hypothesis text.',
      },
    },
  },
  args: {
    tone: 'accent',
    italic: true,
    children:
      '"Consistency is not about restricting creativity — it is about freeing engineers from low-level decisions so they can focus on the product."',
  },
};

export const AllTones: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All five tones rendered in a vertical stack.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
      <Callout tone="accent">Accent — used for on-brand highlights and feature notices.</Callout>
      <Callout tone="info">Info — neutral informational message.</Callout>
      <Callout tone="success">Success — confirmation that an action completed without errors.</Callout>
      <Callout tone="warning">Warning — caution: review before proceeding.</Callout>
      <Callout tone="danger">Danger — destructive or breaking-change notice.</Callout>
    </div>
  ),
};
