/**
 * Token stories — node surface, swatch, and path display demos.
 * @see src/app/components/token.tsx
 *
 * Note: Token uses useHdsRouter (falls back gracefully with no provider) and
 * useTokenDisplay (also has a safe no-provider fallback). The smoke gate wraps
 * stories in MemoryRouter + ThemeProvider, so these render without extra setup.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Token } from '../app/components/token';

const meta = {
  title: 'Primitives/token',
  component: Token,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Reflective token specimen for unified node-based token views. Renders a labelled chip with an optional colour swatch. Deep-links into the token explorer when a valid dot-notation path is supplied.',
      },
    },
  },
  argTypes: {
    fullWidth: { control: 'boolean' },
    isSelected: { control: 'boolean' },
    nowrap: { control: 'boolean' },
    isSourceNode: { control: 'boolean' },
    pathDisplayMode: {
      control: { type: 'radio' },
      options: ['full', 'compressed'],
    },
  },
} satisfies Meta<typeof Token>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tokenPath: 'semantic.color.content.primary',
    children: 'semantic.color.content.primary',
  },
};

export const ColorToken: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Colour token — renders with a colour swatch derived from the token path.',
      },
    },
  },
  args: {
    tokenPath: 'semantic.color.content.accent',
    children: 'semantic.color.content.accent',
  },
};

export const Selected: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Selected state — accent background, inverted label colour.',
      },
    },
  },
  args: {
    tokenPath: 'semantic.color.surface.raised',
    children: 'semantic.color.surface.raised',
    isSelected: true,
  },
};

export const CompressedPath: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Compressed path display — shows only the last path segment.',
      },
    },
  },
  args: {
    tokenPath: 'semantic.space.component.padding',
    children: 'semantic.space.component.padding',
    pathDisplayMode: 'compressed',
    pathDisplayDepth: 1,
  },
};

export const SourceNode: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Source node variant — text wraps rather than truncating, used for multi-line token paths in diagrams.',
      },
    },
  },
  args: {
    tokenPath: 'primitive.color.blue.500',
    children: 'primitive.color.blue.500',
    isSourceNode: true,
  },
};

export const ExplicitSwatch: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Explicit swatchVar overrides automatic swatch resolution.',
      },
    },
  },
  args: {
    tokenPath: 'semantic.color.feedback.success',
    children: 'semantic.color.feedback.success',
    swatchVar: '--semantic-color-feedback-success',
  },
};
