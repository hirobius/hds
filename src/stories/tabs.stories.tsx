/**
 * Tabs stories — underline tab navigation with content panels.
 * @see src/app/components/tabs.tsx
 *
 * Tabs content renders without pointer-capture so stories may mount with a
 * default selected tab visible — no closed-on-mount restriction needed here.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../app/components/tabs';

const meta = {
  title: 'Primitives/tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Underline tab navigation backed by Radix Tabs. Exports Tabs (root), TabsList, TabsTrigger, and TabsContent. Supports horizontal scroll for many tabs at narrow viewports.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" style={{ width: '480px' }}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="props">Props</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground">
          A high-level summary of the component — purpose, tier, and Figma link.
        </p>
      </TabsContent>
      <TabsContent value="props">
        <p className="text-sm text-muted-foreground">
          Prop table generated from the TypeScript interface via component-api.json.
        </p>
      </TabsContent>
      <TabsContent value="usage">
        <p className="text-sm text-muted-foreground">
          Code snippets and best-practice guidance for integrating the component.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

// ── Many tabs (scroll) ────────────────────────────────────────────────────────

export const ManyTabs: Story = {
  parameters: {
    docs: {
      description: {
        story: 'TabsList scrolls horizontally when tab count overflows the container.',
      },
    },
  },
  render: () => (
    <Tabs defaultValue="components" style={{ width: '340px' }}>
      <TabsList>
        <TabsTrigger value="tokens">Tokens</TabsTrigger>
        <TabsTrigger value="components">Components</TabsTrigger>
        <TabsTrigger value="patterns">Patterns</TabsTrigger>
        <TabsTrigger value="figma">Figma</TabsTrigger>
        <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        <TabsTrigger value="changelog">Changelog</TabsTrigger>
      </TabsList>
      <TabsContent value="tokens">Token pipeline and hirobius.tokens.json.</TabsContent>
      <TabsContent value="components">Primitive and pattern components.</TabsContent>
      <TabsContent value="patterns">Higher-order compositions.</TabsContent>
      <TabsContent value="figma">Figma bridge and Code Connect mappings.</TabsContent>
      <TabsContent value="roadmap">Phase-by-phase delivery plan.</TabsContent>
      <TabsContent value="changelog">Recent releases and breaking changes.</TabsContent>
    </Tabs>
  ),
};

// ── Disabled tab ─────────────────────────────────────────────────────────────

export const WithDisabledTab: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A disabled TabsTrigger is non-interactive and visually dimmed.',
      },
    },
  },
  render: () => (
    <Tabs defaultValue="published" style={{ width: '480px' }}>
      <TabsList>
        <TabsTrigger value="published">Published</TabsTrigger>
        <TabsTrigger value="draft">Draft</TabsTrigger>
        <TabsTrigger value="archived" disabled>Archived</TabsTrigger>
      </TabsList>
      <TabsContent value="published">
        <p className="text-sm text-muted-foreground">Live components visible in production.</p>
      </TabsContent>
      <TabsContent value="draft">
        <p className="text-sm text-muted-foreground">Work-in-progress components not yet released.</p>
      </TabsContent>
      <TabsContent value="archived">
        <p className="text-sm text-muted-foreground">Archived content.</p>
      </TabsContent>
    </Tabs>
  ),
};

// ── Controlled ────────────────────────────────────────────────────────────────

function ControlledTabsDemo() {
  const [tab, setTab] = React.useState('design');
  return (
    <div style={{ width: '480px' }}>
      <p className="mb-4 text-xs text-muted-foreground">Active: <strong>{tab}</strong></p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="inspect">Inspect</TabsTrigger>
        </TabsList>
        <TabsContent value="design">
          <p className="text-sm text-muted-foreground">Figma canvas and component properties.</p>
        </TabsContent>
        <TabsContent value="code">
          <p className="text-sm text-muted-foreground">Generated TSX snippet and imports.</p>
        </TabsContent>
        <TabsContent value="inspect">
          <p className="text-sm text-muted-foreground">Token values, spacing, and computed styles.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Controlled tabs via value + onValueChange. The label above updates as you switch.',
      },
    },
  },
  render: () => <ControlledTabsDemo />,
};
