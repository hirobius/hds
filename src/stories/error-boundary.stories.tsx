/**
 * ErrorBoundary stories — happy-path and caught-error demos.
 * @see src/app/components/error-boundary.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBoundary } from '../app/components/error-boundary';
import { Text } from '../app/components/text';

const meta = {
  title: 'Feedback/error-boundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Slot-scoped recovery surface for runtime render failures. Wraps any child subtree; shows a retry UI if a descendant throws during render. Happy path: renders children transparently.',
      },
    },
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slotLabel: 'portfolio section',
  },
  render: (args) => (
    <ErrorBoundary {...args}>
      <Text variant="body">
        This child rendered successfully. The ErrorBoundary is transparent on the happy path.
      </Text>
    </ErrorBoundary>
  ),
};

export const WithMinHeight: Story = {
  args: {
    slotLabel: 'hero section',
    minHeight: '320px',
  },
  render: (args) => (
    <ErrorBoundary {...args}>
      <div style={{ padding: '24px' }}>
        <Text variant="heading3" as="h2">Component mounted cleanly</Text>
        <Text variant="body">
          The boundary sits at minHeight 320 px — content occupies only the space it needs.
        </Text>
      </div>
    </ErrorBoundary>
  ),
};
