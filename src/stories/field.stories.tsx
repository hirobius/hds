/**
 * Field stories — tone, mono, and children variants.
 * @see src/app/components/field.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Field } from '../app/components/field';

const meta = {
  title: 'Primitives/field',
  component: Field,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Caption label paired with a value — used in metadata grids and read-only detail panels.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
    },
    mono: { control: 'boolean' },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Status',
    value: 'Active',
  },
};

export const Success: Story = {
  args: {
    label: 'Build',
    value: 'Passing',
    tone: 'success',
  },
};

export const Warning: Story = {
  args: {
    label: 'Coverage',
    value: '61%',
    tone: 'warning',
  },
};

export const Danger: Story = {
  args: {
    label: 'Errors',
    value: '3 critical',
    tone: 'danger',
  },
};

export const Info: Story = {
  args: {
    label: 'Note',
    value: 'Pending review',
    tone: 'info',
  },
};

export const AllTones: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All five tones rendered side-by-side.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Field label="Status" value="Active" tone="neutral" />
      <Field label="Build" value="Passing" tone="success" />
      <Field label="Coverage" value="61%" tone="warning" />
      <Field label="Errors" value="3 critical" tone="danger" />
      <Field label="Note" value="Pending review" tone="info" />
    </div>
  ),
};

export const Mono: Story = {
  args: {
    label: 'Commit',
    value: 'a3f9c12',
    mono: true,
  },
};

export const WithChildren: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Children slot — pass any React node as the value body.',
      },
    },
  },
  render: () => (
    <Field label="Component">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--semantic-color-feedback-success)',
            flexShrink: 0,
          }}
        />
        HdsButton
      </span>
    </Field>
  ),
};

export const MetadataGrid: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Multiple Field components arranged in a metadata grid layout.',
      },
    },
  },
  render: () => (
    <div
      style={{
        // eslint-disable-next-line no-restricted-syntax -- story demo: a raw grid is the point of the layout showcase
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        padding: '24px',
      }}
    >
      <Field label="Version" value="2.4.1" mono />
      <Field label="Status" value="Stable" tone="success" />
      <Field label="Last updated" value="June 2026" />
      <Field label="Coverage" value="94%" tone="success" />
      <Field label="Bundle size" value="12.4 kB" mono />
      <Field label="Peer dep" value="React 18+" />
    </div>
  ),
};
