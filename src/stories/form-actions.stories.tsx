/**
 * FormActions stories - the footer row of a form.
 * @see src/app/components/form-actions.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { FormActions } from '../app/components/form-actions';
import { Button } from '../app/components/button';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Patterns/FormActions',
  component: FormActions,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('FormActions'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'Form footer with one fixed order: destructive on the far left (if any), then secondary, then the primary submit last and right-most. `sticky` pins the row to the bottom of its scroll container and is off by default.',
      },
    },
  },
  args: {
    primary: <Button variant="primary">Save changes</Button>,
  },
} satisfies Meta<typeof FormActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryOnly: Story = {};

export const WithSecondary: Story = {
  args: { secondary: <Button variant="secondary">Cancel</Button> },
};

export const WithDestructive: Story = {
  args: {
    secondary: <Button variant="secondary">Cancel</Button>,
    destructive: (
      <Button variant="secondary" tone="danger">
        Delete client
      </Button>
    ),
  },
};

export const Sticky: Story = {
  args: {
    sticky: true,
    secondary: <Button variant="secondary">Cancel</Button>,
  },
};
