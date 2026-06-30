/**
 * NotFoundPattern stories — 404 recovery surface demo.
 * @see src/app/components/not-found-pattern.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { NotFoundPattern } from '../app/components/not-found-pattern';

const meta = {
  title: 'Feedback/not-found-pattern',
  component: NotFoundPattern,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Zero-prop 404 recovery surface. Renders ErrorPattern with displayText="404" and message="Page not found". For custom display text or messages, use ErrorPattern directly.',
      },
    },
  },
} satisfies Meta<typeof NotFoundPattern>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
