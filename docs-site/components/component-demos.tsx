'use client';

/**
 * Live demos for component pages. These render the REAL components from the
 * linked @hirobius/design-system package, not screenshots. The registry is
 * typed against PREVIEWED_COMPONENTS, so a demo cannot be added or dropped
 * without the generated pages and the drift test knowing.
 *
 * Demos are interactive but local: state lives inside each demo. Overlays
 * (Dialog, Menu, Select) portal into the nearest [data-hds] scope, which
 * <DemoFrame> provides so they inherit the page theme.
 */
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Combobox,
  Container,
  Dialog,
  Disclosure,
  Divider,
  EmptyState,
  Field,
  Grid,
  Icon,
  InlineLink,
  Input,
  Kbd,
  Menu,
  Pagination,
  Popover,
  Progress,
  Radio,
  SegmentedControl,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Stack,
  Surface,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  Text,
  Textarea,
  Toggle,
  Tooltip,
  VisuallyHidden,
} from '@hirobius/design-system';
import { Copy, Search, Star } from '@hirobius/design-system/icons';
import {
  AssetImg,
  CodeBlock,
  DataTableSection,
  DestructiveSection,
  ErrorPattern,
  Form,
  FormActions,
  FormField,
  MetricTile,
  MetricTiles,
  Page,
  PageHeader,
  Reveal,
  StatusTile,
} from '@hirobius/design-system/patterns';
import type { PreviewedComponent } from '../lib/previewed-components';

// Demo layout uses the HDS space scale, never raw px.
const SM = 'var(--semantic-space-scale-sm)';
const XS = 'var(--semantic-space-scale-xs)';
const demoRow = { display: 'flex', gap: SM, flexWrap: 'wrap', alignItems: 'center' } as const;
const demoStack = { display: 'grid', gap: SM } as const;
const demoColumn = { ...demoStack, width: 'min(100%, 360px)' } as const;
const demoTile = {
  padding: SM,
  border: '1px solid var(--semantic-color-border-default)',
  borderRadius: 'var(--semantic-radius-action)',
} as const;

function ButtonDemo() {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{ display: 'flex', gap: SM, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
      <Button variant="secondary" pressed={pressed} onClick={() => setPressed((p) => !p)}>
        {pressed ? 'Pressed' : 'Toggle'}
      </Button>
    </div>
  );
}

function InputDemo() {
  return (
    <div style={{ display: 'grid', gap: SM, width: 'min(100%, 320px)' }}>
      <Input label="Project name" placeholder="Portfolio redesign" />
      <Input label="Start date" type="date" defaultValue="2026-10-01" />
      <Input size="sm" placeholder="Small" aria-label="Small input" />
    </div>
  );
}

function SelectDemo() {
  const [value, setValue] = useState('design');
  return (
    <div style={{ width: 'min(100%, 280px)' }}>
      <Select
        label="Discipline"
        value={value}
        onChange={setValue}
        options={[
          { value: 'design', label: 'Design' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'research', label: 'Research' },
        ]}
      />
    </div>
  );
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <div style={demoStack}>
      <Checkbox label="Receive project update emails" checked={checked} onChange={setChecked} />
      <Checkbox label="Disabled option" checked={false} onChange={() => {}} disabled />
    </div>
  );
}

function DialogDemo() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Confirm action</Dialog.Title>
          <Dialog.Description>
            This will publish your portfolio to the live URL. This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Button variant="primary">Publish</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

function MenuDemo() {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Actions</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Component</Menu.Label>
        <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
        <Menu.Item onSelect={() => {}}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => {}}>Archive</Menu.Item>
        <Menu.Item disabled onSelect={() => {}}>
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

function TableDemo() {
  return (
    <Table
      caption="Recent projects"
      columns={[
        { key: 'name', label: 'Project' },
        { key: 'status', label: 'Status' },
        { key: 'updated', label: 'Updated', align: 'right' },
      ]}
      rows={[
        {
          key: 'portfolio',
          cells: [
            { slot: 'label', content: 'Portfolio redesign' },
            { slot: 'badge', content: 'Active' },
            { slot: 'value', content: '2026-10-05', align: 'right' },
          ],
        },
        {
          key: 'tokens',
          cells: [
            { slot: 'label', content: 'Token audit' },
            { slot: 'badge', content: 'Review' },
            { slot: 'value', content: '2026-10-02', align: 'right' },
          ],
        },
      ]}
    />
  );
}

function MetricTilesDemo() {
  return (
    <MetricTiles>
      <MetricTile label="Open tasks" value="24" sub="6 due this week" />
      <MetricTile label="Shipped" value="12" sub="This month" tone="success" />
      <MetricTile label="Blocked" value="3" sub="Needs a decision" tone="danger" />
    </MetricTiles>
  );
}

function AlertDemo() {
  return (
    <div style={demoStack}>
      <Alert tone="info" title="Heads up">
        Tokens regenerate on every build.
      </Alert>
      <Alert tone="success" title="Published">
        Version 0.22.0 is live on npm.
      </Alert>
      <Alert tone="warning" title="Needs review">
        One deprecated prop is still in use.
      </Alert>
      <Alert tone="danger" title="Build failed">
        Two components have no Figma node.
      </Alert>
    </div>
  );
}

function AvatarDemo() {
  return (
    <div style={demoRow}>
      <Avatar alt="Ada Lovelace" initials="AL" size="sm" />
      <Avatar alt="Grace Hopper" initials="GH" size="md" />
      <Avatar alt="Alan Kay" initials="AK" size="lg" />
    </div>
  );
}

function BadgeDemo() {
  return (
    <div style={demoRow}>
      <Badge tone="neutral">Draft</Badge>
      <Badge tone="info">Review</Badge>
      <Badge tone="success">Active</Badge>
      <Badge tone="warning">At risk</Badge>
      <Badge tone="danger">Blocked</Badge>
      <Badge tone="success" dot label="Online" />
    </div>
  );
}

function BoxDemo() {
  return (
    <Box
      sx={{
        p: 'md',
        bgcolor: 'surface.raised',
        color: 'content.primary',
      }}
    >
      A Box with token-based padding, background and radius.
    </Box>
  );
}

function BreadcrumbDemo() {
  return (
    <Breadcrumb
      items={[
        { label: 'Clients', href: '#' },
        { label: 'Acme Co', href: '#' },
        { label: 'Brand refresh' },
      ]}
    />
  );
}

function CardDemo() {
  return (
    <Card padding="none" style={{ maxWidth: 360 }}>
      <Card.Header>
        <Card.Title>Design tokens</Card.Title>
        <Card.Description>Semantic color and spacing for every product.</Card.Description>
      </Card.Header>
      <Card.Body>389 variables across light and dark.</Card.Body>
      <Card.Footer>
        <Button variant="secondary" size="sm">
          Browse
        </Button>
      </Card.Footer>
    </Card>
  );
}

const COMPONENT_OPTIONS = [
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'table', label: 'Table' },
];

function ComboboxDemo() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ width: 'min(100%, 280px)' }}>
      <Combobox
        options={COMPONENT_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Select a component…"
        aria-label="Component"
      />
    </div>
  );
}

function ContainerDemo() {
  return (
    <Container maxWidth="content" padding="0">
      <div style={{ ...demoTile, borderStyle: 'dashed' }}>
        Content is centred and capped at the reading width.
      </div>
    </Container>
  );
}

function DisclosureDemo() {
  return (
    <Disclosure label="What ships in fonts.css?">
      Satoshi 400, 500 and 700, plus IBM Plex Mono 400.
    </Disclosure>
  );
}

function DividerDemo() {
  return (
    <div style={demoStack}>
      <span>Above</span>
      <Divider />
      <span>Between</span>
      <Divider variant="strong" />
      <span>Below</span>
    </div>
  );
}

function EmptyStateDemo() {
  return (
    <EmptyState
      title="No projects yet"
      description="Create a project to start tracking tokens and components."
    />
  );
}

function FieldDemo() {
  return (
    <div style={demoColumn}>
      <Field label="Version" value="0.22.0" mono />
      <Field label="Status" value="Published" tone="success" />
    </div>
  );
}

function GridDemo() {
  return (
    <Grid columns={3} gap="normal">
      {['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((label) => (
        <div key={label} style={demoTile}>
          {label}
        </div>
      ))}
    </Grid>
  );
}

function IconDemo() {
  return (
    <div style={demoRow}>
      <Icon icon={Star} size="small" />
      <Icon icon={Search} size="medium" />
      <Icon icon={Copy} size="large" />
    </div>
  );
}

function InlineLinkDemo() {
  return (
    <p style={{ margin: 0 }}>
      Read the <InlineLink href="#">upgrade guide</InlineLink> before you bump the range.
    </p>
  );
}

function KbdDemo() {
  return (
    <p style={{ margin: 0 }}>
      Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to search.
    </p>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(3);
  return <Pagination count={10} page={page} onPageChange={setPage} />;
}

function PopoverDemo() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="secondary">Open popover</Button>
      </Popover.Trigger>
      <Popover.Content>Popovers hold short, interactive content.</Popover.Content>
    </Popover>
  );
}

function ProgressDemo() {
  return (
    <div style={demoColumn}>
      <Progress label="Upload" value={64} />
      <Progress label="Sync" value={100} tone="success" />
      <Progress label="Loading" variant="circular" />
    </div>
  );
}

function RadioDemo() {
  const [plan, setPlan] = useState('team');
  return (
    <div role="radiogroup" aria-label="Plan" style={demoStack}>
      {[
        { value: 'solo', label: 'Solo' },
        { value: 'team', label: 'Team' },
        { value: 'enterprise', label: 'Enterprise' },
      ].map((option) => (
        <Radio
          key={option.value}
          name="plan"
          value={option.value}
          label={option.label}
          checked={plan === option.value}
          onChange={() => setPlan(option.value)}
        />
      ))}
    </div>
  );
}

function SegmentedControlDemo() {
  const [value, setValue] = useState('grid');
  return (
    <SegmentedControl
      label="View"
      value={value}
      onChange={setValue}
      options={[
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
        { value: 'board', label: 'Board' },
      ]}
    />
  );
}

function SkeletonDemo() {
  return (
    <div style={{ ...demoRow, flexWrap: 'nowrap', width: 'min(100%, 360px)' }}>
      <Skeleton variant="circular" width={40} height={40} />
      <div style={{ display: 'grid', gap: XS, flex: 1 }}>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" />
      </div>
    </div>
  );
}

function SliderDemo() {
  const [value, setValue] = useState(40);
  return (
    <div style={demoColumn}>
      <Slider label="Volume" min={0} max={100} value={value} onChange={setValue} />
    </div>
  );
}

function SpinnerDemo() {
  return (
    <div style={demoRow}>
      <Spinner size="sm" label="Loading" />
      <Spinner size="md" label="Loading" />
      <Spinner size="lg" label="Loading" />
    </div>
  );
}

function StackDemo() {
  return (
    <Stack direction="row" gap="tight" wrap="wrap">
      <Button variant="primary">Save</Button>
      <Button variant="secondary">Cancel</Button>
    </Stack>
  );
}

function SurfaceDemo() {
  return (
    <Surface padding="component" shadow>
      A raised surface for grouping content without card anatomy.
    </Surface>
  );
}

function TabsDemo() {
  return (
    <Tabs defaultValue="overview" style={{ width: 'min(100%, 420px)' }}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="props">Props</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">What the component is for.</TabsContent>
      <TabsContent value="props">Every prop, generated from the API.</TabsContent>
      <TabsContent value="usage">When to use it, and when not to.</TabsContent>
    </Tabs>
  );
}

function TagDemo() {
  const [active, setActive] = useState('tokens');
  return (
    <div style={demoRow}>
      {['tokens', 'components', 'patterns'].map((tag) => (
        <Tag key={tag} active={active === tag} onClick={() => setActive(tag)}>
          {tag}
        </Tag>
      ))}
    </div>
  );
}

function TextDemo() {
  return (
    <div style={{ display: 'grid', gap: XS }}>
      <Text variant="display">Display</Text>
      <Text variant="title">Title</Text>
      <Text variant="body">Body for flowing prose and paragraph copy.</Text>
      <Text variant="ui">UI for labels and control text.</Text>
      <Text variant="caption">Caption for supporting metadata.</Text>
      <Text variant="mono">semantic.typography.mono</Text>
    </div>
  );
}

function TextareaDemo() {
  return (
    <div style={demoColumn}>
      <Textarea label="Notes" helperText="Markdown is supported." placeholder="Add a note…" />
    </div>
  );
}

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return <Toggle label="Dark mode" checked={on} onChange={setOn} />;
}

function TooltipDemo() {
  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Button variant="secondary">Hover or focus me</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Saved to your library</Tooltip.Content>
    </Tooltip>
  );
}

function VisuallyHiddenDemo() {
  return (
    <Button variant="secondary">
      <Icon icon={Search} size="small" />
      <VisuallyHidden>Search components</VisuallyHidden>
    </Button>
  );
}

function PageDemo() {
  return (
    <Page maxWidth="content" paddingY="compact">
      <div style={demoTile}>
        Page content sits in the reading width with the standard vertical rhythm.
      </div>
    </Page>
  );
}

function PageHeaderDemo() {
  return (
    <PageHeader
      // The docs page owns the one h1; a demo heading sits below it.
      level={2}
      breadcrumb={<Breadcrumb items={[{ label: 'Clients', href: '#' }, { label: 'Acme Co' }]} />}
      title="Acme Co"
      status={<Badge tone="success">Active</Badge>}
      actions={
        <>
          <Button variant="secondary">Edit</Button>
          <Button variant="primary">New project</Button>
        </>
      }
    />
  );
}

function StatusTileDemo() {
  return (
    <Grid columns={2} gap="normal">
      <StatusTile
        title="Figma sync"
        notes={['Last run 2 hours ago']}
        trailing={<Badge tone="success">Synced</Badge>}
      />
      <StatusTile
        title="Bundle size"
        notes={['34 kB of 40 kB budget']}
        trailing={<Badge tone="warning">Near limit</Badge>}
      />
    </Grid>
  );
}

function FormDemo() {
  return (
    <Form onSubmit={(e) => e.preventDefault()} style={{ width: 'min(100%, 360px)' }}>
      <FormField label="Full name" required>
        <Input placeholder="Ada Lovelace" />
      </FormField>
      <FormField label="Email" description="We only use it for release notes.">
        <Input type="email" placeholder="ada@example.com" />
      </FormField>
      <Button type="submit" variant="primary">
        Save
      </Button>
    </Form>
  );
}

function FormActionsDemo() {
  return (
    <FormActions
      destructive={
        <Button variant="secondary" tone="danger">
          Delete
        </Button>
      }
      secondary={<Button variant="secondary">Cancel</Button>}
      primary={<Button variant="primary">Save changes</Button>}
    />
  );
}

function DataTableSectionDemo() {
  return (
    <DataTableSection
      title="Projects"
      toolbar={<Button variant="primary">New project</Button>}
      columns={[
        { key: 'name', label: 'Project' },
        { key: 'status', label: 'Status' },
      ]}
      rows={[
        {
          key: 'portfolio',
          cells: [
            'Portfolio redesign',
            <Badge key="s" tone="success">
              Active
            </Badge>,
          ],
          actions: (
            <Button variant="secondary" size="sm">
              Open
            </Button>
          ),
        },
        {
          key: 'tokens',
          cells: [
            'Token audit',
            <Badge key="s" tone="warning">
              Review
            </Badge>,
          ],
          actions: (
            <Button variant="secondary" size="sm">
              Open
            </Button>
          ),
        },
      ]}
    />
  );
}

function DestructiveSectionDemo() {
  return (
    <DestructiveSection
      title="Delete project"
      description="Removes the project and its history for everyone on the team."
      actionLabel="Delete project"
      confirmLabel="Delete"
      confirmBody="This cannot be undone."
      onConfirm={() => {}}
    />
  );
}

function ErrorPatternDemo() {
  return <ErrorPattern displayText="404" message="That page moved or never existed." />;
}

function CodeBlockDemo() {
  return (
    <CodeBlock
      filename="app.tsx"
      language="tsx"
      code={
        'import { Button } from \'@hirobius/design-system\';\n\nexport const Save = () => <Button variant="primary">Save</Button>;'
      }
    />
  );
}

const SAMPLE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#e5e5e5"/><circle cx="320" cy="180" r="72" fill="#111"/></svg>',
  );

function AssetImgDemo() {
  return (
    <div style={{ width: 'min(100%, 360px)' }}>
      <AssetImg src={SAMPLE_IMAGE} alt="Sample artwork" naturalWidth={640} naturalHeight={360} />
    </div>
  );
}

function RevealDemo() {
  return (
    <Reveal animation="fade-up">
      <div style={demoTile}>Fades up as it scrolls into view.</div>
    </Reveal>
  );
}

export const DEMOS: Record<PreviewedComponent, () => ReactNode> = {
  Button: ButtonDemo,
  Input: InputDemo,
  Select: SelectDemo,
  Checkbox: CheckboxDemo,
  Dialog: DialogDemo,
  Menu: MenuDemo,
  Table: TableDemo,
  MetricTiles: MetricTilesDemo,
  Alert: AlertDemo,
  Avatar: AvatarDemo,
  Badge: BadgeDemo,
  Box: BoxDemo,
  Breadcrumb: BreadcrumbDemo,
  Card: CardDemo,
  Combobox: ComboboxDemo,
  Container: ContainerDemo,
  Disclosure: DisclosureDemo,
  Divider: DividerDemo,
  EmptyState: EmptyStateDemo,
  Field: FieldDemo,
  Grid: GridDemo,
  Icon: IconDemo,
  InlineLink: InlineLinkDemo,
  Kbd: KbdDemo,
  Pagination: PaginationDemo,
  Popover: PopoverDemo,
  Progress: ProgressDemo,
  Radio: RadioDemo,
  SegmentedControl: SegmentedControlDemo,
  Skeleton: SkeletonDemo,
  Slider: SliderDemo,
  Spinner: SpinnerDemo,
  Stack: StackDemo,
  Surface: SurfaceDemo,
  Tabs: TabsDemo,
  Tag: TagDemo,
  Text: TextDemo,
  Textarea: TextareaDemo,
  Toggle: ToggleDemo,
  Tooltip: TooltipDemo,
  VisuallyHidden: VisuallyHiddenDemo,
  Page: PageDemo,
  PageHeader: PageHeaderDemo,
  StatusTile: StatusTileDemo,
  Form: FormDemo,
  FormActions: FormActionsDemo,
  DataTableSection: DataTableSectionDemo,
  DestructiveSection: DestructiveSectionDemo,
  ErrorPattern: ErrorPatternDemo,
  CodeBlock: CodeBlockDemo,
  AssetImg: AssetImgDemo,
  Reveal: RevealDemo,
};

export function DemoFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-hds
      className="hds-demo-frame not-prose"
      style={{
        padding: 'var(--semantic-space-scale-md)',
        border: '1px solid var(--semantic-color-border-default)',
        borderRadius: 'var(--semantic-radius-action)',
        background: 'var(--semantic-color-surface-page)',
        color: 'var(--semantic-color-content-primary)',
      }}
    >
      {children}
    </div>
  );
}
