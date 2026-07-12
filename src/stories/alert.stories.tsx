/**
 * Alert stories — variant and title demos.
 * @see src/app/components/Alert.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '../app/components/alert';
import { MODES } from '../../.storybook/preview';

const meta = {
  title: 'Primitives/alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Compact feedback surface with contextual severity. Tones: success | danger | warning | info. Non-blocking status messages; use Dialog for blocking responses.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['success', 'danger', 'warning', 'info'],
    },
    title: { control: 'text' },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    tone: 'info',
    children: 'Your account settings have been updated.',
  },
};

export const Success: Story = {
  args: {
    tone: 'success',
    children: 'Component exported successfully.',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    children: 'This action cannot be undone.',
  },
};

export const Error: Story = {
  args: {
    tone: 'danger',
    children: 'Failed to connect to the token bridge.',
  },
};

export const WithTitle: Story = {
  args: {
    tone: 'danger',
    title: 'Export Failed',
    children: 'The Figma plugin could not export this token batch. Check your API key.',
  },
};

export const AllVariants: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All four severity variants stacked.',
      },
    },
    // #126 — representative story for the per-brand/density/theme modes matrix.
    chromatic: { modes: MODES },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
      <Alert tone="info">Informational message for context.</Alert>
      <Alert tone="success">Operation completed successfully.</Alert>
      <Alert tone="warning">Review before proceeding.</Alert>
      <Alert tone="danger">Something went wrong. Please retry.</Alert>
    </div>
  ),
};
