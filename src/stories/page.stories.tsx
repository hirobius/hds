/**
 * Page stories — standard page shell demos.
 * @see src/app/components/page.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Page } from '../app/components/page';
import { Text } from '../app/components/text';
import { Stack } from '../app/components/stack';
import { Surface } from '../app/components/surface';

const meta = {
  title: 'Layout/page',
  component: Page,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Standard page shell. Wraps content in a Container (width-constrained) and applies canonical vertical padding so content breathes against the viewport. Use as the outermost element of any new page for consistent rhythm. Does not render its own footer — the HDSLayout shell owns that.',
      },
    },
  },
  argTypes: {
    maxWidth: {
      control: { type: 'radio' },
      options: ['content', 'max'],
    },
    paddingY: {
      control: { type: 'radio' },
      options: ['default', 'compact', 'none'],
    },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxWidth: 'max',
    paddingY: 'default',
  },
  render: (args) => (
    <div style={{ background: 'var(--semantic-color-surface-page, #f9fafb)' }}>
      <Page {...args}>
        <Surface>
          <Stack gap="normal">
            <Text variant="heading2" as="h1">Page shell — default padding</Text>
            <Text variant="body">
              This is the standard page shell with maxWidth "max" (1200 px) and
              default vertical padding (48 px top / 64 px bottom). Use it as the
              outermost wrapper for every new page in the system.
            </Text>
          </Stack>
        </Surface>
      </Page>
    </div>
  ),
};

export const ContentWidth: Story = {
  args: {
    maxWidth: 'content',
    paddingY: 'default',
  },
  render: (args) => (
    <div style={{ background: 'var(--semantic-color-surface-page, #f9fafb)' }}>
      <Page {...args}>
        <Surface>
          <Stack gap="normal">
            <Text variant="heading2" as="h1">Content width (760 px)</Text>
            <Text variant="body">
              Prose-optimised max-width for documentation, case studies, and
              long-form article layouts.
            </Text>
          </Stack>
        </Surface>
      </Page>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'maxWidth="content" constrains the shell to 760 px for comfortable reading measure.',
      },
    },
  },
};

export const CompactPadding: Story = {
  args: {
    maxWidth: 'max',
    paddingY: 'compact',
  },
  render: (args) => (
    <div style={{ background: 'var(--semantic-color-surface-page, #f9fafb)' }}>
      <Page {...args}>
        <Surface>
          <Stack gap="normal">
            <Text variant="heading2" as="h1">Compact padding</Text>
            <Text variant="body">
              paddingY="compact" uses 24 px top / 32 px bottom — useful for
              dense dashboard views or secondary pages.
            </Text>
          </Stack>
        </Surface>
      </Page>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'paddingY="compact" reduces vertical breathing room for dense views.',
      },
    },
  },
};

export const NoPadding: Story = {
  args: {
    maxWidth: 'max',
    paddingY: 'none',
  },
  render: (args) => (
    <div style={{ background: 'var(--semantic-color-surface-page, #f9fafb)' }}>
      <Page {...args}>
        <Surface>
          <Stack gap="normal">
            <Text variant="heading2" as="h1">No padding</Text>
            <Text variant="body">
              paddingY="none" removes all vertical padding. Use for full-bleed
              hero sections or canvas surfaces that own their own spacing.
            </Text>
          </Stack>
        </Surface>
      </Page>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'paddingY="none" for full-bleed surfaces that manage their own vertical rhythm.',
      },
    },
  },
};
