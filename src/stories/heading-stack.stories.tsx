/**
 * HeadingStack stories — level, gap, and tag override demos.
 * @see src/app/components/heading-stack.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HeadingStack } from '../app/components/heading-stack';

const meta = {
  title: 'Primitives/heading-stack',
  component: HeadingStack,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Enforced vertical rhythm for heading + subheading pairs. Handles gap and secondary colour automatically. Levels: heading1 | heading2 | heading3. Gap: px4 | px8.',
      },
    },
  },
  argTypes: {
    level: {
      control: { type: 'radio' },
      options: ['heading1', 'heading2', 'heading3'],
    },
    gap: {
      control: { type: 'radio' },
      options: ['px4', 'px8'],
    },
  },
} satisfies Meta<typeof HeadingStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    level: 'heading1',
    heading: 'Hirobius Design System',
    subheading: 'A token-driven component library built for clarity and scale.',
  },
};

export const Heading1: Story = {
  args: {
    level: 'heading1',
    heading: 'Component Library',
    subheading: 'Foundational primitives for consistent product interfaces.',
  },
};

export const Heading2: Story = {
  args: {
    level: 'heading2',
    heading: 'Typography Scale',
    subheading: 'Seven semantic type roles mapped to Swiss-canon proportions.',
  },
};

export const Heading3: Story = {
  args: {
    level: 'heading3',
    heading: 'Token Reference',
    subheading: 'Primitive, semantic, and component-level design tokens.',
  },
};

export const TightGap: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Gap reduced to px4 (4 px) for compact layout contexts.',
      },
    },
  },
  args: {
    level: 'heading2',
    gap: 'px4',
    heading: 'Compact Section Header',
    subheading: 'Tight gap keeps the label and subtitle visually fused.',
  },
};

export const AllLevels: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All three heading levels rendered in sequence.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '600px' }}>
      <HeadingStack
        level="heading1"
        heading="Heading 1 — Page Title"
        subheading="Highest-level heading, used once per page."
      />
      <HeadingStack
        level="heading2"
        heading="Heading 2 — Section"
        subheading="Groups a major page section with supporting context."
      />
      <HeadingStack
        level="heading3"
        heading="Heading 3 — Sub-section"
        subheading="Subsection label within a larger content zone."
      />
    </div>
  ),
};
