/**
 * Card stories — compound anatomy, padding variants, and a11y demos.
 * @see src/app/components/Card.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../app/components/card';
import { MODES } from '../../.storybook/preview';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Card'),
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

export const ProgressSlot: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`Card.Progress` — the progress slot. It owns its own 4px rail and matches the Header/Body 24px inset, so it aligns without the caller doing spacing math. `tone` drives the fill color, which lets a card signal status without a separate badge. The fill animates with `transform: scaleX` rather than `width`, so it runs on the compositor instead of forcing layout each frame.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 360 }}>
      <Card>
        <Card.Header>
          <Card.Title>Migration</Card.Title>
        </Card.Header>
        <Card.Progress value={68} label="68% complete" />
        <Card.Body>
          <p style={{ margin: 0, fontSize: '13px' }}>Default neutral fill.</p>
        </Card.Body>
      </Card>
      {(['success', 'warning', 'danger'] as const).map((tone) => (
        <Card key={tone} tone={tone}>
          <Card.Progress value={tone === 'danger' ? 18 : 84} tone={tone} label={`tone="${tone}"`} />
        </Card>
      ))}
    </div>
  ),
};

export const MetricSlot: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`Card.Metric` — the metric slot: an eyebrow label, an h2-weight value, and an optional sub-line. `tone` colors the value only, so the number carries the status and the card chrome stays quiet.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Card style={{ minWidth: 160 }}>
        <Card.Metric label="Retainer" value="$3,500" sub="Active" />
      </Card>
      <Card style={{ minWidth: 160 }}>
        <Card.Metric label="Open tasks" value="12" sub="this week" tone="warning" />
      </Card>
      <Card style={{ minWidth: 160 }}>
        <Card.Metric label="Uptime" value="99.9%" sub="30d" tone="success" />
      </Card>
    </div>
  ),
};
