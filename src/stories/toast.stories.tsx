/**
 * Toast stories — transient feedback notifications via imperative API.
 * @see src/app/components/toast.tsx
 *
 * NOTE: Toast uses an imperative API (useToast hook) inside a ToastProvider.
 * The Default story renders a trigger button only — toasts mount on click,
 * NOT on story mount, so the jsdom smoke gate sees just the button.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ToastProvider, useToast } from '../app/components/toast';
import { Button } from '../app/components/button';

// Meta uses ToastProvider as the stand-in component since Toast has no
// single exported React component to pass to `component`.
const meta = {
  title: 'Primitives/toast',
  component: ToastProvider,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Transient notification system built on Radix Toast. Wrap the app once in <ToastProvider> then call useToast().toast({ title, tone }) from anywhere. Tones: neutral | info | success | danger | warning.',
      },
    },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default (neutral) ─────────────────────────────────────────────────────────

function NeutralToastDemo() {
  const { toast } = useToast();
  return (
    <Button variant="secondary" onClick={() => toast({ title: 'Changes saved', tone: 'neutral' })}>
      Show neutral toast
    </Button>
  );
}

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <NeutralToastDemo />
    </ToastProvider>
  ),
};

// ── Success ───────────────────────────────────────────────────────────────────

function SuccessToastDemo() {
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        toast({
          title: 'Component published',
          description: 'Button v2.4.0 is now live in Storybook.',
          tone: 'success',
        })
      }
    >
      Show success toast
    </Button>
  );
}

export const Success: Story = {
  parameters: {
    docs: {
      description: { story: 'Success tone — use for completed async operations.' },
    },
  },
  render: () => (
    <ToastProvider>
      <SuccessToastDemo />
    </ToastProvider>
  ),
};

// ── Danger ────────────────────────────────────────────────────────────────────

function DangerToastDemo() {
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        toast({
          title: 'Build failed',
          description: 'Typecheck returned 3 errors. See the terminal for details.',
          tone: 'danger',
        })
      }
    >
      Show danger toast
    </Button>
  );
}

export const Danger: Story = {
  parameters: {
    docs: {
      description: { story: 'Danger tone — use for errors that require the user\'s attention.' },
    },
  },
  render: () => (
    <ToastProvider>
      <DangerToastDemo />
    </ToastProvider>
  ),
};

// ── Warning ───────────────────────────────────────────────────────────────────

function WarningToastDemo() {
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        toast({
          title: 'Token drift detected',
          description: 'Your local tokens are 2 versions behind the Figma library.',
          tone: 'warning',
        })
      }
    >
      Show warning toast
    </Button>
  );
}

export const Warning: Story = {
  parameters: {
    docs: {
      description: { story: 'Warning tone — use for non-blocking issues the user should know about.' },
    },
  },
  render: () => (
    <ToastProvider>
      <WarningToastDemo />
    </ToastProvider>
  ),
};

// ── Info ──────────────────────────────────────────────────────────────────────

function InfoToastDemo() {
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        toast({
          title: 'Sync in progress',
          description: 'Pulling the latest Figma variables — this may take a moment.',
          tone: 'info',
        })
      }
    >
      Show info toast
    </Button>
  );
}

export const Info: Story = {
  parameters: {
    docs: {
      description: { story: 'Info tone — use for background processes and neutral FYI messages.' },
    },
  },
  render: () => (
    <ToastProvider>
      <InfoToastDemo />
    </ToastProvider>
  ),
};
