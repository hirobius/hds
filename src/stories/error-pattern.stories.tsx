/**
 * ErrorPattern stories — recovery surface tone and copy demos.
 * @see src/app/components/error-pattern.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ErrorPattern } from '../app/components/error-pattern';

const meta = {
  title: 'Feedback/error-pattern',
  component: ErrorPattern,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-viewport governed recovery surface for routed application errors. Animates in on mount; provides a Back button that calls window.history.back(). Pair with NotFoundPattern for 404 routes.',
      },
    },
  },
} satisfies Meta<typeof ErrorPattern>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    displayText: 'Oops',
    message: 'Something went wrong',
  },
};

export const NotFound: Story = {
  args: {
    displayText: '404',
    message: 'Page not found',
  },
  parameters: {
    docs: {
      description: {
        story: 'Mirrors the output of NotFoundPattern — 404 display text with a human-readable message.',
      },
    },
  },
};

export const ServerError: Story = {
  args: {
    displayText: '500',
    message: 'Server error — please try again',
  },
  parameters: {
    docs: {
      description: {
        story: '5xx server error variant with a recovery prompt.',
      },
    },
  },
};

export const Unauthorized: Story = {
  args: {
    displayText: '401',
    message: 'You need to sign in to view this page',
  },
  parameters: {
    docs: {
      description: {
        story: 'Authentication gate variant — prompts the user to sign in.',
      },
    },
  },
};
