/**
 * Textarea stories — multi-line text field with label, helper, and error slots.
 * @see src/app/components/textarea.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../app/components/textarea';

const meta = {
  title: 'Primitives/textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Multi-line text field. Mirrors Input’s shell + token skin as a native textarea. States: Default / Focus / Error / Disabled (Figma parity).',
      },
    },
  },
  argTypes: {
    resize: { control: { type: 'select' }, options: ['none', 'vertical', 'both'] },
    label: { control: 'text' },
    helperText: { control: 'text' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Project brief',
    placeholder: 'Describe the work…',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Bio',
    helperText: 'Shown on your public profile. Max 280 characters.',
    defaultValue: 'Design systems engineer focused on token-driven UI.',
  },
};

export const Error: Story = {
  args: {
    label: 'Release notes',
    error: true,
    errorMessage: 'Release notes are required before publishing.',
    defaultValue: '',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked field',
    disabled: true,
    defaultValue: 'This content cannot be edited.',
  },
};

export const AllStates: Story = {
  parameters: {
    docs: { description: { story: 'Default, error, and disabled states stacked.' } },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
      <Textarea label="Default" placeholder="Type here…" />
      <Textarea label="Error" error errorMessage="This field has a problem." />
      <Textarea label="Disabled" disabled defaultValue="Read-only content." />
    </div>
  ),
};
