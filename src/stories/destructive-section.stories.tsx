/**
 * DestructiveSection stories - the one place a screen puts an irreversible action.
 * @see src/app/components/destructive-section.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { DestructiveSection } from '../app/components/destructive-section';

// The story render gate mounts each story from its own args, so every story spreads the base.
const base = {
  title: 'Archive client',
  description: 'Hides the client from every list. Projects and invoices are kept.',
  confirmLabel: 'Archive client',
  confirmBody: 'Archived clients stop receiving updates. You can restore them later.',
  onConfirm: () => {},
};
import { designParameters } from './design-parameters';

const meta = {
  title: 'Patterns/DestructiveSection',
  component: DestructiveSection,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('DestructiveSection'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'A titled danger zone: a title, an explanation and one danger button that opens an `AlertDialog`. Pressing the button never runs the action; only the dialog confirm calls `onConfirm`. `confirmLabel`, `confirmBody` and `onConfirm` are required. Put it last on the screen, below the form.',
      },
    },
  },
  args: base,
} satisfies Meta<typeof DestructiveSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: base };

export const Dark: Story = {
  args: base,
  globals: { theme: 'dark' },
};

export const SeparateButtonLabel: Story = {
  args: {
    ...base,
    title: 'Delete client',
    description: 'Removes the client and every project under it. This cannot be undone.',
    actionLabel: 'Delete client...',
    confirmLabel: 'Yes, delete client',
    confirmBody: 'This removes 4 projects and 12 invoices for good.',
  },
};

export const Phone: Story = {
  args: base,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
