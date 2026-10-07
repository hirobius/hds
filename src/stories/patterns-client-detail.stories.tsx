/**
 * Reference screen: Client detail. Composes all five screen patterns the way a
 * screen should: PageHeader once at the top, MetricTiles for the headline numbers,
 * Tabs for the sections, DataTableSection for the projects, a notes form closed by
 * FormActions, and DestructiveSection last. Shown in light, dark, compact and at
 * 390 px so the layout is checked at each.
 * @see public/llms.txt "How To Lay Out A Screen"
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Pencil } from 'lucide-react';
import { PageHeader } from '../app/components/page-header';
import {
  Badge,
  Breadcrumb,
  Button,
  Icon,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '../index';
import {
  DataTableSection,
  DestructiveSection,
  FormActions,
  MetricTile,
  MetricTiles,
} from '../patterns';

const projectColumns = [
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'value', label: 'Value', align: 'right' as const },
];

const projectRows = [
  {
    key: 'site',
    cells: [
      'Site rebuild',
      <Badge key="s" tone="success">
        Active
      </Badge>,
      'Oct 14',
      '$8,400',
    ],
    actions: (
      <Button
        iconOnly
        label="Edit Site rebuild"
        size="sm"
        variant="tertiary"
        iconLeft={<Icon icon={Pencil} size="small" />}
      />
    ),
  },
  {
    key: 'brand',
    cells: [
      'Brand refresh',
      <Badge key="s" tone="warning">
        Paused
      </Badge>,
      'Nov 2',
      '$3,200',
    ],
    actions: (
      <Button
        iconOnly
        label="Edit Brand refresh"
        size="sm"
        variant="tertiary"
        iconLeft={<Icon icon={Pencil} size="small" />}
      />
    ),
  },
  {
    key: 'retainer',
    cells: [
      'Monthly retainer',
      <Badge key="s" tone="success">
        Active
      </Badge>,
      'Monthly',
      '$3,500',
    ],
    actions: (
      <Button
        iconOnly
        label="Edit Monthly retainer"
        size="sm"
        variant="tertiary"
        iconLeft={<Icon icon={Pencil} size="small" />}
      />
    ),
  },
];

function ClientDetailScreen() {
  return (
    <Stack gap="spacious">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: 'Acme Co' }]} />
        }
        title="Acme Co"
        status={<Badge tone="success">Active</Badge>}
        actions={
          <>
            <Button variant="secondary">Edit</Button>
            <Button variant="primary">New project</Button>
          </>
        }
      />
      <MetricTiles>
        <MetricTile label="Retainer" value="$3,500" sub="Active" tone="success" />
        <MetricTile label="Open tasks" value="12" sub="this week" />
        <MetricTile label="Overdue" value="3" sub="needs a reply" tone="danger" />
      </MetricTiles>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Stack gap="spacious">
            <DataTableSection
              title="Projects"
              toolbar={<Button variant="secondary">Add project</Button>}
              columns={projectColumns}
              rows={projectRows}
            />
            <form aria-label="Client notes" onSubmit={(event) => event.preventDefault()}>
              <Stack gap="normal">
                <Textarea label="Notes" placeholder="Anything the team should know about Acme Co" />
                <FormActions
                  secondary={<Button variant="secondary">Cancel</Button>}
                  primary={
                    <Button variant="primary" type="submit">
                      Save notes
                    </Button>
                  }
                />
              </Stack>
            </form>
            <DestructiveSection
              title="Archive client"
              description="Hides Acme Co from every list. Projects and invoices are kept."
              confirmLabel="Archive client"
              confirmBody="Archived clients stop receiving updates. You can restore them later."
              onConfirm={() => {}}
            />
          </Stack>
        </TabsContent>
        <TabsContent value="activity">Activity for Acme Co appears here.</TabsContent>
        <TabsContent value="billing">Invoices for Acme Co appear here.</TabsContent>
      </Tabs>
    </Stack>
  );
}

const meta = {
  title: 'Patterns/Client detail screen',
  component: ClientDetailScreen,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The reference screen for the five screen patterns: `PageHeader`, `MetricTiles`, `Tabs`, `DataTableSection`, a notes form closed by `FormActions`, and `DestructiveSection` last. Copy this composition, not the pieces.',
      },
    },
  },
} satisfies Meta<typeof ClientDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  globals: { theme: 'dark' },
};

export const Compact: Story = {
  globals: { density: 'compact' },
};

export const Phone390: Story = {
  parameters: {
    viewport: {
      viewports: {
        phone390: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
      },
      defaultViewport: 'phone390',
    },
  },
};
