/**
 * Button stories — variant, size, state, and a11y demos.
 * @see src/app/components/button.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Bold, Italic, Star, X } from 'lucide-react';
import { Button } from '../app/components/button';
import { MODES } from '../../.storybook/preview';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Button'),
    layout: 'centered',
    docs: {
      description: {
        component:
          'Shared button primitive. cva-driven variants composed against role-token Tailwind utilities. Variants: primary | secondary | tertiary. Sizes: sm | md | lg.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'tertiary'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Variants ────────────────────────────────────────────────────────────────

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Tertiary: Story = {
  args: {
    variant: 'tertiary',
    children: 'Tertiary Button',
  },
};

// ── Sizes ───────────────────────────────────────────────────────────────────

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small',
  },
};

export const Medium: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Medium',
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large',
  },
};

// ── States ──────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Saving',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled',
  },
};

// ── iconOnly and pressed (hds#393) ─────────────────────────────────────────

export const IconOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`iconOnly` renders only `iconLeft`, so `label` becomes the aria-label. In development, an icon-only Button with no label, aria-label, aria-labelledby or title logs a warning.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button iconOnly size="sm" label="Close" iconLeft={<X />} />
      <Button iconOnly label="Close" iconLeft={<X />} />
      <Button iconOnly size="lg" variant="primary" label="Close" iconLeft={<X />} />
    </div>
  ),
};

export const Pressed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`pressed` (controlled) or `defaultPressed` (uncontrolled) makes a Button a toggle: it sets aria-pressed and data-pressed, and `onPressedChange` gets the next state. Pressed fills with role.accent. Click to toggle.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Button iconOnly label="Bold" iconLeft={<Bold />} defaultPressed />
      <Button iconOnly label="Italic" iconLeft={<Italic />} defaultPressed={false} />
      <Button variant="tertiary" iconLeft={<Star />} defaultPressed>
        Starred
      </Button>
      <Button variant="tertiary" iconLeft={<Star />} defaultPressed={false}>
        Star
      </Button>
    </div>
  ),
};

// ── A11y demo ───────────────────────────────────────────────────────────────

export const AllVariantsRow: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All three variants at default size for side-by-side comparison.',
      },
    },
    // #126 — representative story for the per-brand/density/theme modes
    // matrix. `primary` uses the accent-driven `bg-primary` token, so this
    // is the story a tenant accent regression shows up on.
    chromatic: { modes: MODES },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
    </div>
  ),
};

// ── Tone over variant ───────────────────────────────────────────────────────

const TONE_MATRIX_VARIANTS = ['primary', 'secondary', 'tertiary'] as const;
const TONE_MATRIX_TONES = ['danger', 'success', 'warning', 'info'] as const;

export const ToneMatrix: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Every variant × status tone, plus a disabled and a loading toned button. `tone` replaces the variant colours (fill, border, text and their hover states) through tailwind-merge class-group replacement, not the `!` important modifier (ADR-030), so each row must look the same across variants.',
      },
    },
    // hds#372 — the 12 variant × tone combos reach the axe gate and the
    // brand/density/theme modes matrix through this one story.
    chromatic: { modes: MODES },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {TONE_MATRIX_VARIANTS.map((variant) => (
        <div
          key={variant}
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}
        >
          {TONE_MATRIX_TONES.map((tone) => (
            <Button key={tone} variant={variant} tone={tone}>
              {`${variant} ${tone}`}
            </Button>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="primary" tone="danger" disabled>
          Disabled danger
        </Button>
        <Button variant="secondary" tone="warning" loading>
          Loading warning
        </Button>
      </div>
    </div>
  ),
};
