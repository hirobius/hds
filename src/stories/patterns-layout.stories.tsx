/**
 * Golden-path layout recipes — canonical full-screen compositions built
 * purely from HDS layout primitives (Page/Container/Center, Stack/Grid, the
 * every-layout primitives, and Surface). No raw hex/px — every spacing and
 * color value resolves to an HDS token. See `public/llms.txt` → "How To Lay
 * Out A Screen" for the recipe these stories demonstrate, and the `@ai-rules`
 * docstring on each primitive (`src/app/components/*.tsx`) for the rule an
 * agent should follow when reaching for it.
 * @see docs/architecture/variant-contract.md
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Page } from '../app/components/page';
import { Center } from '../app/components/center';
import { Stack } from '../app/components/stack';
import { Grid } from '../app/components/grid';
import { Cluster } from '../app/components/cluster';
import { Sidebar } from '../app/components/sidebar';
import { Cover } from '../app/components/cover';
import { Surface } from '../app/components/surface';
import { Text } from '../app/components/text';
import { Button } from '../app/components/button';
import { Badge } from '../app/components/badge';
import { Field } from '../app/components/field';
import { Input } from '../app/components/input';
import { EmptyState } from '../app/components/empty-state';

const meta = {
  title: 'Patterns/Layout',
  component: Page,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical full-screen layout recipes assembled entirely from HDS layout primitives — the shape an agent should reach for before inventing bespoke flex/grid math. Each story is Page/Container/Center for width constraint, Stack/Grid for structure, and the every-layout primitives (Cluster, Sidebar, Cover, …) for common intents. Token-only: no raw hex/px anywhere in these recipes.',
      },
    },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Form screen ────────────────────────────────────────────────────────────
// Skeleton: Page (content width) > Stack (section rhythm) > Surface (the
// form's padded card) > Stack (field rhythm) > Cluster (action row, right-
// aligned). No FormField wrapping — HDS Input self-wires its own label,
// helperText, and error via props (see form.tsx's file-level docstring).

function FormScreenDemo() {
  return (
    <Page maxWidth="content">
      <Stack direction="column" gap="spacious">
        <Stack direction="column" gap="gap">
          <Text variant="heading2">Create project</Text>
          <Text variant="body">
            One config file drives the whole site — fill in the basics to scaffold it.
          </Text>
        </Stack>

        <Surface padding="component">
          <Stack direction="column" gap="normal">
            <Input label="Project name" placeholder="Hirobius Design System" />
            <Input label="Slug" helperText="Used in the generated URL." placeholder="hds" />
            <Input label="Contact email" type="email" placeholder="adrian@hirobius.com" />
            <Cluster gap="tight" justify="end">
              <Button variant="secondary">Cancel</Button>
              <Button variant="primary" type="submit">
                Create project
              </Button>
            </Cluster>
          </Stack>
        </Surface>
      </Stack>
    </Page>
  );
}

export const FormScreen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Page > Stack (section rhythm) > Surface (form card) > Stack (field rhythm) > Cluster (right-aligned actions). Fields are HDS Input — no FormField wrapper, since Input self-wires label/helper/error.',
      },
    },
  },
  render: () => <FormScreenDemo />,
};

// ── Dashboard grid ─────────────────────────────────────────────────────────
// Skeleton: Page (max width) > Stack (section rhythm) > Cluster (header row)
// + Grid (12-col KPI row + a full-width panel) > Surface tiles.

function KpiTile({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <Surface padding="component">
      <Stack direction="column" gap="gap">
        <Text variant="caption">{label}</Text>
        <Cluster gap="tight" justify="space-between" align="end">
          <Text variant="heading2">{value}</Text>
          <Badge tone="success">{delta}</Badge>
        </Cluster>
      </Stack>
    </Surface>
  );
}

function ActivityRow({ label, tone }: { label: string; tone: 'success' | 'info' | 'warning' }) {
  return (
    <Cluster gap="normal" justify="space-between">
      <Text variant="body">{label}</Text>
      <Badge tone={tone}>{tone}</Badge>
    </Cluster>
  );
}

function DashboardGridDemo() {
  return (
    <Page maxWidth="max">
      <Stack direction="column" gap="spacious">
        <Cluster gap="normal" justify="space-between">
          <Text variant="heading2">Fleet dashboard</Text>
          <Cluster gap="tight">
            <Button variant="secondary">Filter</Button>
            <Button variant="primary">New project</Button>
          </Cluster>
        </Cluster>

        <Grid layout="fixed" columns={12} gap="inset">
          <Grid.Item colSpan={4}>
            <KpiTile label="Active sites" value="12" delta="+2" />
          </Grid.Item>
          <Grid.Item colSpan={4}>
            <KpiTile label="Open issues" value="7" delta="-3" />
          </Grid.Item>
          <Grid.Item colSpan={4}>
            <KpiTile label="Deploys this week" value="24" delta="+9" />
          </Grid.Item>
          <Grid.Item colSpan={12}>
            <Surface padding="component">
              <Stack direction="column" gap="normal">
                <Text variant="heading3">Recent activity</Text>
                <Stack direction="column" gap="gap">
                  <ActivityRow label="hirobius-design-system — release published" tone="success" />
                  <ActivityRow label="ops — guardrail drift detected" tone="warning" />
                  <ActivityRow label="clients/acme-landscaping — build queued" tone="info" />
                </Stack>
              </Stack>
            </Surface>
          </Grid.Item>
        </Grid>
      </Stack>
    </Page>
  );
}

export const DashboardGrid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Page > Stack (section rhythm) > Cluster (header row) + Grid (12-col: three KPI tiles at colSpan 4, one full-width panel at colSpan 12). Every tile is a Surface; metric rows use Cluster to align label and trend Badge.',
      },
    },
  },
  render: () => <DashboardGridDemo />,
};

// ── Detail / read page ─────────────────────────────────────────────────────
// Skeleton: Page (content width) > Sidebar (metadata rail + fluid article).
// Sidebar showcases the "rail + content that stacks with no media query"
// intent instead of hand-rolled two-column flex.

function DetailPageDemo() {
  return (
    <Page maxWidth="content">
      <Sidebar side="end" sideWidth="14rem" contentMin="24rem" gap="spacious">
        <Stack direction="column" gap="normal">
          <Field label="Status" value={<Badge tone="success">Shipped</Badge>} />
          <Field label="Owner" value="Adrian" />
          <Field label="Phase" value="Components — 75%" />
        </Stack>
        <Stack direction="column" gap="normal">
          <Text variant="heading1">Machine-readable AI layout guidance</Text>
          <Text variant="body">
            Workstream 3 of the layout-consistency epic adds `@ai-rules` docstrings to every layout
            primitive, a &ldquo;How To Lay Out A Screen&rdquo; recipe in `llms.txt`, and golden-path
            Storybook examples so agents reach for named primitives before Box `sx`.
          </Text>
          <Text variant="body">
            Read `public/hds-manifest.json` for the canonical component inventory and
            `src/app/data/component-api.json` for the generated prop tables this docstring
            normalization now feeds.
          </Text>
        </Stack>
      </Sidebar>
    </Page>
  );
}

export const DetailPage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Page > Sidebar(side="end") — a fixed-width metadata rail (Field stack) beside the fluid article body. The pair wraps to stacked automatically in a narrow viewport, no media query.',
      },
    },
  },
  render: () => <DetailPageDemo />,
};

// ── Empty state ────────────────────────────────────────────────────────────
// Skeleton: Cover (full-height shell, centered main region) > Center
// (constrained message column) > Stack (title/description/action rhythm).

function EmptyStateScreenDemo() {
  return (
    <Cover minHeight="480px" gap="normal">
      <Center maxWidth="content" gutter="normal">
        <Stack direction="column" gap="normal" align="center">
          <EmptyState
            title="No projects yet"
            description="Scaffold your first client site to see it listed here."
          />
          <Button variant="primary">Create project</Button>
        </Stack>
      </Center>
    </Cover>
  );
}

export const EmptyStateScreen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Cover (full-height shell, auto-centered main region) > Center (constrained message column) > Stack (title/description/action rhythm around EmptyState). minHeight is a CSS length dimension, not a spacing token — 480px keeps the demo readable inside the Storybook canvas; product code defaults to Cover's 100svh.",
      },
    },
  },
  render: () => <EmptyStateScreenDemo />,
};
