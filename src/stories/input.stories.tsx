/**
 * Input stories — size, state, label, and error demos.
 * @see src/app/components/Input.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../app/components/input';
import { MODES } from '../../.storybook/preview';

const meta = {
  title: 'Primitives/input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Text field primitive (shadcn baseline). cva-driven sizing and state via role-token Tailwind utilities. Sizes: sm | md | lg. Derived states: default | focus | filled | error | disabled | loading.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    textStyle: {
      control: { type: 'radio' },
      options: ['body', 'mono'],
    },
    disabled: { control: 'boolean' },
    error: { control: 'boolean' },
    loading: { control: 'boolean' },
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorMessage: { control: 'text' },
    placeholder: { control: 'text' },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email address',
    placeholder: 'you@example.com',
    type: 'email',
  },
  parameters: {
    // #126 — representative story for the per-brand/density/theme modes matrix.
    chromatic: { modes: MODES },
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Username',
    placeholder: 'hirobius',
    helperText: 'Lowercase letters, numbers, and underscores only.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    error: true,
    errorMessage: 'Password must be at least 8 characters.',
    defaultValue: 'abc',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Read-only field',
    defaultValue: 'Not editable',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    label: 'Verifying token',
    loading: true,
    defaultValue: 'hds-tk-abc123',
  },
};

export const Mono: Story = {
  args: {
    label: 'Token path',
    textStyle: 'mono',
    placeholder: 'semantic.color.brand.primary',
  },
};

export const SizeVariants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All three size tiers side-by-side.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
      <Input size="sm" placeholder="Small (32px)" />
      <Input size="md" placeholder="Medium (40px)" />
      <Input size="lg" placeholder="Large (48px)" />
    </div>
  ),
};
