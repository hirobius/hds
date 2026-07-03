/**
 * Textarea stories — label, helper, error, resize, and text-style demos.
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
          'Multi-line text field primitive. cva-driven state via role-token Tailwind utilities. States: default | focus | error | disabled. Resize: none | vertical | both.',
      },
    },
  },
  argTypes: {
    textStyle: {
      control: { type: 'radio' },
      options: ['body', 'mono'],
    },
    resize: {
      control: { type: 'radio' },
      options: ['none', 'vertical', 'both'],
    },
    disabled: { control: 'boolean' },
    error: { control: 'boolean' },
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorMessage: { control: 'text' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Message',
    placeholder: 'Write your message…',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    helperText: 'Maximum 500 characters.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Description',
    error: true,
    errorMessage: 'Description is required.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Read-only notes',
    defaultValue: 'Not editable',
    disabled: true,
  },
};

export const NoResize: Story = {
  args: {
    label: 'Fixed size',
    resize: 'none',
    placeholder: 'This textarea cannot be resized.',
  },
};

export const Mono: Story = {
  args: {
    label: 'Snippet',
    textStyle: 'mono',
    placeholder: 'const x = 1;',
  },
};
