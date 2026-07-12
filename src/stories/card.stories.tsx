/**
 * Card stories — compound anatomy, padding variants, and a11y demos.
 * @see src/app/components/Card.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../app/components/card';
import { MODES } from '../../.storybook/preview';

const meta = {
  title: 'Primitives/card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          "Surface container (shadcn baseline) with compound anatomy parts. Use Card.Header / Card.Title / Card.Description / Card.Body / Card.Footer for structured content. Pass padding='none' on the root when using parts. Legacy padding props are retained for backward-compatible flat-children usage.",
      },
    },
  },
  argTypes: {
    padding: {
      control: { type: 'select' },
      options: ['component', 'item', 'px24', 'px16', 'none'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Flat children (legacy API) ──────────────────────────────────────────────

export const Default: Story = {
  args: {
    children: 'Simple card with flat children and default component padding.',
    style: { maxWidth: 360 },
  },
};

// ── Compound anatomy ─────────────────────────────────────────────────────────

export const FullAnatomy: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Full compound anatomy: Header → Title + Description → Body → Footer.',
      },
    },
  },
  render: () => (
    <Card padding="none" style={{ maxWidth: 360 }}>
      <Card.Header>
        <Card.Title>Design Tokens</Card.Title>
        <Card.Description>Semantic color and spacing tokens for the HDS.</Card.Description>
      </Card.Header>
      <Card.Body>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Tokens are sourced from <code>hirobius.tokens.json</code> and published to Figma variables
          on every sync.
        </p>
      </Card.Body>
      <Card.Footer>
        <span style={{ fontSize: '12px', opacity: 0.6 }}>Last sync: today</span>
      </Card.Footer>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card padding="none" style={{ maxWidth: 360 }}>
      <Card.Header>
        <Card.Title>Token Explorer</Card.Title>
        <Card.Description>Browse all 400+ design tokens.</Card.Description>
      </Card.Header>
      <Card.Body>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Filter by primitive, semantic, or component tier.
        </p>
      </Card.Body>
    </Card>
  ),
};

// ── Padding variants ─────────────────────────────────────────────────────────

export const PaddingVariants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All padding tiers: component (24px) | item (16px) | px24 | px16 | none.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 360 }}>
      {(['component', 'item', 'px16', 'none'] as const).map((padding) => (
        <Card key={padding} padding={padding}>
          <p style={{ margin: 0, fontSize: '13px' }}>padding=&quot;{padding}&quot;</p>
        </Card>
      ))}
    </div>
  ),
};

// ── Elevated card ────────────────────────────────────────────────────────────

export const Elevated: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'shadow-md class adds a two-layer elevation treatment for interactive or floating cards.',
      },
    },
  },
  render: () => (
    <Card className="shadow-md" style={{ maxWidth: 360 }}>
      <p style={{ margin: 0, fontSize: '14px' }}>
        Elevated card — use for modals, popovers, or highlighted content surfaces.
      </p>
    </Card>
  ),
};

// ── Variant + tone (#60 Phase 3 cva axes) ───────────────────────────────────

export const VariantAccent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'variant="accent" — 2px accent border for highlighted entries (e.g. a recommended package). variant="default" (the default) is borderless.',
      },
    },
    // #126 — representative story for the per-brand/density/theme modes
    // matrix. The accent border is exactly the token a tenant overlay
    // repoints, so this is the story a tenant accent regression shows up on.
    chromatic: { modes: MODES },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', maxWidth: 640 }}>
      <Card variant="default" style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '13px' }}>variant=&quot;default&quot; (borderless)</p>
      </Card>
      <Card variant="accent" style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '13px' }}>variant=&quot;accent&quot;</p>
      </Card>
    </div>
  ),
};

export const Bordered: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`bordered` opts a default-variant card into a neutral 1px border, for discrete standalone records in a sparse layout.',
      },
    },
  },
  render: () => (
    <Card bordered style={{ maxWidth: 360 }}>
      <p style={{ margin: 0, fontSize: '13px' }}>bordered (neutral 1px border)</p>
    </Card>
  ),
};

export const FeedbackTones: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`tone` — the fixed feedback axis (neutral | danger | success | warning | info). The border color IS the status signal; tone always wins over variant.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 360 }}>
      {(['neutral', 'success', 'warning', 'danger', 'info'] as const).map((tone) => (
        <Card key={tone} tone={tone}>
          <p style={{ margin: 0, fontSize: '13px' }}>tone=&quot;{tone}&quot;</p>
        </Card>
      ))}
    </div>
  ),
};
