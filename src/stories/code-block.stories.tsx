/**
 * CodeBlock stories — code display with syntax highlighting, copy, and collapsible toggle.
 * @see src/app/components/code-block.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CodeBlock } from '../app/components/code-block';

const TS_SAMPLE = `import { Badge } from '@hirobius/design-system';

export function StatusChip({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? 'success' : 'neutral'}>
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}`;

const JSON_SAMPLE = `{
  "name": "@hirobius/design-system",
  "version": "1.0.0",
  "tier": "primitive",
  "tokens": {
    "space": 8,
    "radius": 4
  }
}`;

const CSS_SAMPLE = `/* HDS surface token */
.hds-surface {
  background: var(--semantic-color-surface-raised);
  border-radius: 8px;
  padding: 16px;
}`;

const LONG_SAMPLE = `import React, { useState, useEffect } from 'react';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import { Stack } from '../components/stack';

// Fetch component list and render with status badges
export function ComponentList() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/components')
      .then((res) => res.json())
      .then((data) => {
        setItems(data.components);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <span>Loading…</span>;

  return (
    <Stack gap="md">
      {items.map((name) => (
        <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge tone="success">{name}</Badge>
          <Button variant="ghost" size="sm">View docs</Button>
        </div>
      ))}
    </Stack>
  );
}`;

const meta = {
  title: 'Primitives/code-block',
  component: CodeBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Code display with regex-based syntax highlighting, one-click copy, and optional collapsible toggle. Variants: block (default) and inline.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['block', 'inline'],
    },
    collapsible: { control: 'boolean' },
    defaultExpanded: { control: 'boolean' },
    truncateFromStart: { control: 'boolean' },
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: TS_SAMPLE,
    language: 'tsx',
    filename: 'StatusChip.tsx',
    variant: 'block',
  },
};

export const JsonHighlighting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'JSON language mode highlights keys, strings, and primitives.',
      },
    },
  },
  args: {
    code: JSON_SAMPLE,
    language: 'json',
    filename: 'package.json',
    variant: 'block',
  },
};

export const CssHighlighting: Story = {
  parameters: {
    docs: {
      description: {
        story: 'CSS language mode highlights custom properties, values, and at-rules.',
      },
    },
  },
  args: {
    code: CSS_SAMPLE,
    language: 'css',
    filename: 'surface.css',
    variant: 'block',
  },
};

export const Collapsible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Collapsible block hides code behind a "Show code" toggle — useful inside doc pages to reduce visual noise.',
      },
    },
  },
  args: {
    code: LONG_SAMPLE,
    language: 'tsx',
    filename: 'ComponentList.tsx',
    variant: 'block',
    collapsible: true,
    defaultExpanded: false,
  },
};

export const Inline: Story = {
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story:
          'Inline variant renders a single-line pill with a copy button — for token paths and prop names.',
      },
    },
  },
  args: {
    code: 'var(--semantic-color-surface-raised)',
    variant: 'inline',
  },
};
