/**
 * Toast stories — transient feedback.
 * @see src/app/components/toast.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast, type ToastTone } from '../app/components/toast';
import { Button } from '../app/components/button';

const meta = {
  title: 'Patterns/toast',
  component: ToastProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Transient notifications backed by Radix Toast. Wrap the app in <ToastProvider>, then call useToast().toast({ title, description, tone }).',
      },
    },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function Fire({ tone, label }: { tone: ToastTone; label: string }) {
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() => toast({ title: label, description: 'Triggered from a story.', tone })}
    >
      {label}
    </Button>
  );
}

export const Tones: Story = {
  render: () => (
    <ToastProvider>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Fire tone="success" label="Success" />
        <Fire tone="info" label="Info" />
        <Fire tone="warning" label="Warning" />
        <Fire tone="danger" label="Danger" />
      </div>
    </ToastProvider>
  ),
};
