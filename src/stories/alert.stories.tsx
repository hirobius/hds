/**
 * Alert stories — tone and title demos.
 * @see src/app/components/alert.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '../app/components/alert';

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

export const Danger: Story = {
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
        story: 'All four severity tones stacked.',
      },
    },
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
