/**
 * Dialog stories — modal dialog with trigger, content, and footer actions.
 * @see src/app/components/dialog.tsx
 *
 * NOTE: The Default story renders the trigger only (closed on mount).
 * jsdom lacks pointer-capture so the smoke gate cannot exercise open Radix
 * content — do NOT set defaultOpen or open the dialog in an effect.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Dialog } from '../app/components/dialog';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal dialog with focus trap, scroll lock, and ESC-to-close. Compound API: Dialog.Trigger / Dialog.Content / Dialog.Header / Dialog.Title / Dialog.Description / Dialog.Footer / Dialog.Close.',
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultDemo() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Confirm action</Dialog.Title>
          <Dialog.Description>
            This will publish your portfolio to the live URL. This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Button variant="primary">Publish</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ── Destructive ──────────────────────────────────────────────────────────────

function DestructiveDemo() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Delete component</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete component</Dialog.Title>
          <Dialog.Description>
            Removing this component will also remove all Figma Code Connect mappings. Are you sure?
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Button variant="primary">Delete</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export const Destructive: Story = {
  parameters: {
    docs: {
      description: { story: 'Destructive confirmation pattern with a clearly labelled primary action.' },
    },
  },
  render: () => <DestructiveDemo />,
};

// ── No close affordance ───────────────────────────────────────────────────────

function NoCloseAffordanceDemo() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Open (no ✕)</Button>
      </Dialog.Trigger>
      <Dialog.Content hideClose>
        <Dialog.Header>
          <Dialog.Title>Session expired</Dialog.Title>
          <Dialog.Description>
            Your session has timed out. Sign in again to continue.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button variant="primary">Sign in</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export const NoCloseAffordance: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Pass hideClose to remove the built-in ✕ button for fully custom layouts.',
      },
    },
  },
  render: () => <NoCloseAffordanceDemo />,
};

// ── Information only ─────────────────────────────────────────────────────────

function InformationDemo() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">What is HDS?</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Hirobius Design System</Dialog.Title>
          <Dialog.Description>
            HDS is a self-driving component library built for portfolio and job-hunt products.
            It owns the token pipeline, Figma bridge, and Storybook publishing in one closed loop.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="primary">Got it</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export const Information: Story = {
  parameters: {
    docs: {
      description: { story: 'Informational dialog with a single acknowledge action.' },
    },
  },
  render: () => <InformationDemo />,
};
