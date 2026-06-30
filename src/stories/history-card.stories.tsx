/**
 * HistoryCard stories — compact commit-history card for repo and systems-log surfaces.
 * @see src/app/components/history-card.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HistoryCard } from '../app/components/history-card';

const meta = {
  title: 'Primitives/history-card',
  component: HistoryCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Compact commit-history card linking out to GitHub. Renders a commit hash, date, and message with a hover/focus arrow animation.',
      },
    },
  },
} satisfies Meta<typeof HistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    commit: {
      hash: 'a1b2c3d',
      date: '2026-06-28T14:32:00Z',
      message: 'feat(tokens): add semantic motion duration tokens',
    },
    href: 'https://github.com/hirobius/design-system/commit/a1b2c3d',
  },
};

export const WithDisplayMessage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'displayMessage overrides the raw commit message for editorial tidying — the original message is preserved in the title tooltip.',
      },
    },
  },
  args: {
    commit: {
      hash: 'f4e5d6c',
      date: '2026-06-25T09:15:00Z',
      message: 'fix(button): correct disabled opacity in dark mode [skip ci]',
      displayMessage: 'Fix: button disabled opacity in dark mode',
    },
    href: 'https://github.com/hirobius/design-system/commit/f4e5d6c',
  },
};

export const NoHash: Story = {
  parameters: {
    docs: {
      description: {
        story: 'When hash is null only the date and message are shown.',
      },
    },
  },
  args: {
    commit: {
      hash: null,
      date: '2026-06-20T17:00:00Z',
      message: 'chore: update pnpm lockfile',
    },
    href: 'https://github.com/hirobius/design-system/commits/main',
  },
};

export const RecentActivity: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Multiple cards stacked to simulate a repo activity feed.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 560 }}>
      <HistoryCard
        commit={{
          hash: 'a1b2c3d',
          date: '2026-06-28T14:32:00Z',
          message: 'feat(tokens): add semantic motion duration tokens',
        }}
        href="https://github.com/hirobius/design-system/commit/a1b2c3d"
      />
      <HistoryCard
        commit={{
          hash: 'f4e5d6c',
          date: '2026-06-25T09:15:00Z',
          message: 'fix(button): correct disabled opacity in dark mode',
          displayMessage: 'Fix: button disabled opacity in dark mode',
        }}
        href="https://github.com/hirobius/design-system/commit/f4e5d6c"
      />
      <HistoryCard
        commit={{
          hash: null,
          date: '2026-06-20T17:00:00Z',
          message: 'chore: update pnpm lockfile',
        }}
        href="https://github.com/hirobius/design-system/commits/main"
      />
    </div>
  ),
};
