/**
 * Stepper stories.
 * @see src/app/components/stepper.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Stepper } from '../app/components/stepper';

const meta = {
  title: 'Patterns/stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

const checkoutSteps = [
  { label: 'Cart' },
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
];

export const Default: Story = {
  args: { steps: checkoutSteps, activeStep: 1 },
};

export const Vertical: Story = {
  args: {
    steps: [
      { label: 'Account', description: 'Create your login' },
      { label: 'Profile', description: 'Tell us about you' },
      { label: 'Confirm', description: 'Review and submit' },
    ],
    activeStep: 1,
    orientation: 'vertical',
  },
};
