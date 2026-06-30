/**
 * Form + FormField stories — validation-agnostic form seam.
 * @see src/app/components/form.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Form, FormField } from '../app/components/form';
import { Button } from '../app/components/button';

const meta = {
  title: 'Patterns/form',
  component: Form,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Validation-agnostic form seam. Form is a styled <form>; FormField owns the label↔control + aria wiring and takes a plain `error` string (validation source is the consumer’s choice). Note: the HDS Input self-wires its own label/error.',
      },
    },
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

const inputClass =
  'hds-focus h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';

export const Default: Story = {
  render: () => (
    <Form style={{ minWidth: 320 }} onSubmit={(e) => e.preventDefault()}>
      <FormField label="Workspace name" description="Shown to your teammates.">
        <input className={inputClass} defaultValue="Hirobius" />
      </FormField>
      <FormField label="Subdomain" error="That subdomain is taken." required>
        <input className={inputClass} defaultValue="hirobius" />
      </FormField>
      <Button type="submit" variant="primary">
        Save
      </Button>
    </Form>
  ),
};
