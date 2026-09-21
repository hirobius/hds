/**
 * StackedCardRail stories — horizontally-scrolling stacked card carousel.
 * @see src/app/components/stacked-card-rail.tsx
 *
 * NOTE: the stack/unstack effect uses CSS scroll-driven animation
 * (animation-timeline: view(x ...)), which is behind an @supports guard. Where
 * the browser lacks it the rail degrades to a plain horizontal scroller — that
 * fallback is the correct rendering, not a broken story.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { StackedCardRail } from '../app/components/stacked-card-rail';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Patterns/stacked-card-rail',
  component: StackedCardRail,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('StackedCardRail'),
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Horizontally-scrolling card rail with a scroll-driven stack/unstack effect. Vertical scroll on an absolutely-positioned outer container is mapped onto a sticky inner strip, so the rail advances with normal page scrolling rather than requiring a horizontal gesture. Cards are `{ id, title, category?, coverImage?, href? }`.',
      },
    },
  },
} satisfies Meta<typeof StackedCardRail>;

export default meta;
type Story = StoryObj<typeof meta>;

const CARDS = [
  { id: '1', title: 'Token pipeline', category: 'Foundations' },
  { id: '2', title: 'Component parity', category: 'Figma' },
  { id: '3', title: 'Guardrail sweep', category: 'Engineering' },
  { id: '4', title: 'Contrast ratchet', category: 'Accessibility' },
  { id: '5', title: 'Release flow', category: 'Engineering' },
  { id: '6', title: 'Brand modes', category: 'Foundations' },
];

export const Default: Story = {
  args: { cards: CARDS },
};

export const WithLinks: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A card with `href` renders as a link; one without stays a static tile. The rail mixes both without a layout change.',
      },
    },
  },
  args: {
    cards: CARDS.map((card, index) => (index % 2 === 0 ? { ...card, href: `#${card.id}` } : card)),
  },
};

export const Sparse: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Fewer cards than fill the viewport. The rail must not stretch or centre-justify them into a layout that changes shape once more arrive.',
      },
    },
  },
  args: { cards: CARDS.slice(0, 2) },
};
