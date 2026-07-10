/**
 * Box stories — token colors, spacing shorthands, responsive values,
 * &-selector composition, and polymorphic `as`.
 * @see src/app/components/box.tsx
 * @see src/app/components/box-sx.ts
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '../app/components/box';

const meta = {
  title: 'Primitives/box',
  component: Box,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Polymorphic layout primitive with a token-first `sx` engine — a deliberate ' +
          "SUBSET of MUI's sx. Reach for Stack/Grid/Container first; use Box `sx` only " +
          'for genuinely one-off layout that no named primitive covers.',
      },
    },
  },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TokenColors: Story = {
  render: () => (
    <Box
      sx={{
        p: 6,
        bgcolor: 'surface.raised',
        color: 'content.primary',
        borderColor: 'border.subtle',
        border: '1px solid',
        borderRadius: 8,
      }}
    >
      background: surface.raised · text: content.primary · border: border.subtle
    </Box>
  ),
};

export const SpacingShorthands: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ p: 2, bgcolor: 'surface.raised' }}>p: 2 → var(--primitive-space-2)</Box>
      <Box sx={{ p: 'inset', bgcolor: 'surface.raised' }}>
        p: &apos;inset&apos; → --semantic-space-layout-inset
      </Box>
      <Box sx={{ px: 6, py: 2, bgcolor: 'surface.raised' }}>px: 6, py: 2 (axis shorthand)</Box>
      <Box sx={{ mt: 9, bgcolor: 'surface.raised', p: 2 }}>
        mt: 9 (off-scale) → calc(var(--primitive-space-1) * 9)
      </Box>
    </Box>
  ),
};

export const ResponsiveValues: Story = {
  render: () => (
    <Box
      sx={{
        p: 2,
        bgcolor: 'feedback.info',
        color: 'content.inverse',
        width: { xs: 120, sm: 200, md: 320 },
      }}
    >
      Resize the viewport — width steps 120px (xs) → 200px (sm) → 320px (md).
    </Box>
  ),
};

export const AmpersandSelectors: Story = {
  render: () => (
    <Box
      sx={{
        p: 6,
        bgcolor: 'surface.raised',
        color: 'content.primary',
        '&:hover': { bgcolor: 'accent.subtle', color: 'accent.content' },
      }}
    >
      Hover me — base declarations (bgcolor/color) survive alongside the `&:hover` rule (the
      insertRule regression this primitive guards against).
    </Box>
  ),
};

export const AmpersandWithResponsive: Story = {
  render: () => (
    <Box
      sx={{
        p: 4,
        bgcolor: 'surface.raised',
        color: 'content.primary',
        '&:hover': { color: 'accent.content' },
        width: { xs: 160, md: 280 },
      }}
    >
      Base + `&:hover` + a responsive `width` all on one Box.
    </Box>
  ),
};

export const PolymorphicAs: Story = {
  render: () => (
    <Box as="section" sx={{ p: 6, bgcolor: 'surface.raised' }}>
      <Box as="h2" sx={{ color: 'content.primary' }}>
        Rendered as &lt;section&gt; / &lt;h2&gt;
      </Box>
    </Box>
  ),
};
