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
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  AlertDialog,
  Avatar,
  AvatarGroup,
  Badge,
  Blockquote,
  Board,
  BoardColumn,
  Box,
  Breadcrumb,
  Button,
  Callout,
  Card,
  Checkbox,
  Combobox,
  CommandPalette,
  Composer,
  Container,
  Dialog,
  Disclosure,
  Divider,
  EmptyState,
  Field,
  Grid,
  Icon,
  InlineCode,
  InlineLink,
  Input,
  Kbd,
  MetaLine,
  MetadataList,
  Menu,
  NavList,
  List,
  Pagination,
  Pin,
  Dock,
  Popover,
  Progress,
  Radio,
  SegmentedControl,
  Select,
  Sidebar,
  Sheet,
  Skeleton,
  Slider,
  Spinner,
  Stack,
  StatusListItem,
  Surface,
  Switcher,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  useTransientFlag,
  ThemeToggle,
  Text,
  Textarea,
  Timeline,
  TimelineItem,
  Timestamp,
  Toggle,
  TokenField,
  type TokenFieldHandle,
  Tooltip,
  VisuallyHidden,
} from '@hirobius/design-system';
import {
  ArrowRight,
  Banknote,
  Bell,
  Briefcase,
  Calendar,
  CircleCheck,
  Copy,
  FileText,
  MapPin,
  Search,
  Star,
  Users,
} from '@hirobius/design-system/icons';
import {
  AppShell,
  AssetImg,
  AsyncState,
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
// A soft raised tile, no outline (hds#891).
const demoTile = {
  padding: SM,
  background: 'var(--semantic-color-surface-raised)',
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
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="tertiary" tone="quiet">
        Quiet
      </Button>
      <Button variant="tertiary" flush>
        Flush
      </Button>
      <Button variant="link">Link</Button>
      <Button variant="secondary" tone="danger">
        Danger
      </Button>
      <Button variant="secondary" shadow="none" hoverEffect="none">
        Flat (opt-out)
      </Button>
      <Button variant="secondary" size="sm">
        Small
      </Button>
    </div>
  );
}

function InputDemo() {
  return (
    <div style={{ display: 'grid', gap: SM, width: 'min(100%, 320px)' }}>
      <Input label="Project name" placeholder="Portfolio redesign" />
      <Input label="Start date" type="date" defaultValue="2026-10-01" />
      <Input size="sm" defaultValue="Small" aria-label="Small input" />
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

function AppShellDemo() {
  // AppShell reads the viewport (lg) on the client only, so its server render is the narrow
  // layout and hydration reflows it. Mount it after hydration inside the fixed-height frame
  // so the page does not shift on load (check:docs-layout-shift, hds#806).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div style={{ height: '24rem', overflow: 'auto', isolation: 'isolate' }}>
      {mounted && (
        <AppShell
          header={<Text variant="ui">Ops</Text>}
          sidebar={({ collapsed }) => (
            <Stack gap="tight">
              {['Today', 'Jobs', 'Documents'].map((item) => (
                <InlineLink key={item} href={`#${item.toLowerCase()}`}>
                  {collapsed ? item.slice(0, 1) : item}
                </InlineLink>
              ))}
            </Stack>
          )}
          aside={<Text variant="caption">Detail panel</Text>}
        >
          <Text variant="title" as="h2">
            Pipeline
          </Text>
        </AppShell>
      )}
    </div>
  );
}

function SheetDemo() {
  const [sort, setSort] = useState('Newest');
  return (
    <Sheet>
      <Sheet.Trigger asChild>
        <Button variant="secondary">Sort: {sort}</Button>
      </Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Sort by</Sheet.Title>
          <Sheet.Description>
            A bottom sheet on a phone, a centred panel on wider screens.
          </Sheet.Description>
        </Sheet.Header>
        <Sheet.Actions aria-label="Sort order">
          {['Newest', 'Company', 'Best fit'].map((option) => (
            <Sheet.Action key={option} current={sort === option} onClick={() => setSort(option)}>
              {option}
            </Sheet.Action>
          ))}
          <Sheet.Action tone="danger">Remove filters</Sheet.Action>
        </Sheet.Actions>
      </Sheet.Content>
    </Sheet>
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

// A link, prose and an action row are what used to shear a table on desktop
// (tests/visual/table-clipping.spec.ts guards it). The literal columns (status, date,
// actions) size to their content. Project and Summary share the spare width 1 : 1.5:
// in compact, Project gets room for one line; in comfortable, Summary keeps the
// priority (a max-content Project would take the space first and push Summary to its
// floor, hds#1339). Summary floors at one and a half tiles; on a 390px phone the
// frame scrolls instead of squeezing it.
const TABLE_DEMO_ROWS = [
  {
    key: 'portfolio',
    name: 'Portfolio redesign',
    summary: 'Case studies, about page and the new design-system section',
    href: 'https://hirobius.com/work/portfolio',
    status: 'Active',
    updated: '2026-10-05',
  },
  {
    key: 'tokens',
    name: 'Token audit',
    summary: 'Contrast and naming review across the light and dark themes',
    href: 'https://hirobius.com/work/tokens',
    status: 'Review',
    updated: '2026-10-02',
  },
];

function TableDemo() {
  return (
    <Table
      caption="Recent projects"
      emphasizeFirstColumn
      columns={[
        { key: 'name', label: 'Project', width: 'minmax(min-content, 1fr)' },
        {
          key: 'summary',
          label: 'Summary',
          width: 'minmax(calc(var(--semantic-size-tile) * 1.5), 1.5fr)',
        },
        { key: 'status', label: 'Status', width: 'max-content' },
        { key: 'updated', label: 'Updated', align: 'right', width: 'max-content' },
        { key: 'actions', label: 'Actions', align: 'right', width: 'max-content' },
      ]}
      rows={TABLE_DEMO_ROWS.map((row) => ({
        key: row.key,
        cells: [
          { slot: 'label', content: <InlineLink href={row.href}>{row.name}</InlineLink> },
          { slot: 'description', content: row.summary },
          { slot: 'badge', content: <Badge>{row.status}</Badge> },
          { slot: 'value', content: row.updated, align: 'right' },
          {
            slot: 'action',
            align: 'right',
            content: (
              <Button size="sm" variant="secondary">
                Open brief
              </Button>
            ),
          },
        ],
      }))}
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

function BoardDemo() {
  return (
    <Board aria-label="Lead pipeline">
      <BoardColumn title="On fire">
        <Card padding="item" className="border-0">
          <Card.Row trailing={<Badge tone="danger">Today</Badge>}>
            <Card.RowTitle>Monroe Landscaping</Card.RowTitle>
            <Card.RowNote>Asked for a quote</Card.RowNote>
          </Card.Row>
        </Card>
        <Card padding="item" className="border-0">
          <Card.Row>
            <Card.RowTitle>Cedar Fencing</Card.RowTitle>
            <Card.RowNote>Preview sent</Card.RowNote>
          </Card.Row>
        </Card>
      </BoardColumn>
      <BoardColumn title="Warm">
        <Card padding="item" className="border-0">
          <Card.Row>
            <Card.RowTitle>Northside Pressure Washing</Card.RowTitle>
            <Card.RowNote>Follow up Friday</Card.RowNote>
          </Card.Row>
        </Card>
      </BoardColumn>
      <BoardColumn title="Won" count={0}>
        <EmptyState title="Nothing here yet" />
      </BoardColumn>
    </Board>
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

// The account button: initials when signed in, a person icon when signed out,
// and a warning dot while changes are not synced. The Button label carries the
// status, since it replaces the avatar's own name.
function AvatarDemo() {
  const [signedIn, setSignedIn] = useState(true);
  const [synced, setSynced] = useState(false);
  const accountLabel = signedIn
    ? `Account, Ada Lovelace${synced ? '' : ', not synced'}`
    : 'Sign in';
  return (
    <div style={demoStack}>
      <div style={demoRow}>
        <Avatar alt="Ada Lovelace" initials="AL" size="sm" />
        <Avatar alt="Grace Hopper" initials="GH" size="md" />
        <Avatar alt="Alan Kay" initials="AK" size="lg" />
        <Avatar alt="Signed out" fallback="icon" />
        <Avatar alt="Grace Hopper" status="success" statusLabel="Online" />
        <Avatar alt="Alan Kay" status="warning" statusLabel="Not synced" />
      </div>
      <div style={demoRow}>
        <Menu>
          <Menu.Trigger asChild>
            <Button
              variant="tertiary"
              iconOnly
              label={accountLabel}
              className="rounded-full"
              iconLeft={
                signedIn ? (
                  <Avatar
                    alt="Ada Lovelace"
                    status={synced ? undefined : 'warning'}
                    statusLabel={synced ? undefined : 'Not synced'}
                  />
                ) : (
                  <Avatar alt="Signed out" fallback="icon" />
                )
              }
            />
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Label>{signedIn ? 'Ada Lovelace' : 'Not signed in'}</Menu.Label>
            {signedIn && (
              <Menu.Item onSelect={() => setSynced((s) => !s)}>
                {synced ? 'Mark as not synced' : 'Sync now'}
              </Menu.Item>
            )}
            <Menu.Item onSelect={() => setSignedIn((s) => !s)}>
              {signedIn ? 'Sign out' : 'Sign in'}
            </Menu.Item>
          </Menu.Content>
        </Menu>
        <Text variant="caption" tone="secondary">
          Account button: open it to sign in or out, or to sync.
        </Text>
      </div>
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
      <Badge icon={Calendar} tone="neutral">
        Due Friday
      </Badge>
      <Badge icon={Bell} tone="warning">
        2 alerts
      </Badge>
      <Badge count={3} label="3 roles" />
      <Badge count={42} label="42 roles" />
      <Badge count={120} max={99} label="120 roles" />
      <Stack direction="row" gap="xs" align="center">
        <Text as="h3" variant="titleSm">
          Open roles
        </Text>
        <Badge count={12} label="12 roles" />
      </Stack>
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
    <Stack gap="normal" style={{ maxWidth: 360 }}>
      <Card padding="none">
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
      {/* radius="lg": the fixed 16px scale step, for a larger bordered surface (hds#1436). */}
      <Card bordered radius="lg">
        <Card.Header>
          <Card.Title>Larger radius</Card.Title>
          <Card.Description>radius="lg" is 16px whatever the tenant radius.</Card.Description>
        </Card.Header>
      </Card>
      {/* The row slot: a titled status with notes and a trailing badge (hds#622). */}
      <Card padding="item" className="border-0">
        <Card.Row trailing={<Badge tone="success">Synced</Badge>}>
          <Card.RowTitle>Figma sync</Card.RowTitle>
          <Card.RowNote>Last run 2 hours ago</Card.RowNote>
        </Card.Row>
      </Card>
      {/* The entity card: source row, title, facts row, actions (hds#872). */}
      <Grid columns={1} gap="normal">
        <Card>
          <Card.Source
            avatar={<Avatar size="sm" initials="NR" alt="" />}
            name="Northwind Robotics"
            time={
              <Timestamp date="2026-10-21T10:00:00Z" now="2026-10-21T12:00:00Z" format="relative" />
            }
          />
          <Card.Header>
            <Card.Title>Senior product designer</Card.Title>
          </Card.Header>
          <Card.Facts
            items={[
              { icon: MapPin, label: 'Remote' },
              { icon: Banknote, label: '$120k to $150k' },
              { icon: Briefcase, label: 'Full time' },
            ]}
          />
          <Card.Footer>
            <Button variant="secondary" size="sm">
              Save
            </Button>
          </Card.Footer>
        </Card>
      </Grid>
      {/* asChild: the whole card is one link, with the interactive hover. */}
      <Card asChild padding="item">
        <a href="#card">
          <Stack direction="row" gap="tight" justify="space-between" align="center">
            <Users size={18} aria-hidden="true" />
            <ArrowRight size={14} aria-hidden="true" />
          </Stack>
          <Text variant="titleSm" as="span">
            Leads
          </Text>
          <Text variant="ui" as="span" className="text-muted-foreground">
            Find businesses and build sites
          </Text>
        </a>
      </Card>
    </Stack>
  );
}

const COMPONENT_OPTIONS = [
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'table', label: 'Table' },
];

const SKILL_OPTIONS = [
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'figma', label: 'Figma' },
  { value: 'sql', label: 'SQL' },
];

function ComboboxDemo() {
  const [value, setValue] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>(['react']);
  return (
    <Stack gap="normal" style={{ width: 'min(100%, 360px)' }}>
      <Combobox
        options={COMPONENT_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Select a component…"
        aria-label="Component"
      />
      {/* Chip input: suggestions as you type; Enter adds free text. */}
      <Combobox
        multiple
        creatable
        options={SKILL_OPTIONS}
        value={skills}
        onChange={setSkills}
        onCreate={(text) => setSkills((prev) => [...prev, text])}
        placeholder="Add a skill…"
        aria-label="Skills"
      />
    </Stack>
  );
}

function ContainerDemo() {
  return (
    <Container maxWidth="content" padding="0">
      <div style={{ ...demoTile, border: '1px dashed var(--semantic-color-border-default)' }}>
        Content is centred and capped at the reading width.
      </div>
    </Container>
  );
}

function DisclosureDemo() {
  const rows = [
    ['Fonts', 'What ships in fonts.css', 'Sora (variable) and IBM Plex Mono 400.'],
    [
      'Tokens',
      'Where the token files live',
      'hirobius.tokens.json is the source; build output is generated from it.',
    ],
    [
      'Figma',
      'How the library stays in sync',
      'Sync runs one way, from code to the Figma library.',
    ],
  ] as const;
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Disclosure label="What ships in fonts.css?">
          Sora (variable) and IBM Plex Mono 400.
        </Disclosure>
      </div>
      {rows.map(([label, preview, body]) => (
        <Disclosure
          key={label}
          variant="row"
          label={label}
          preview={preview}
          actions={
            <Button variant="tertiary" aria-label={`Edit ${label}`}>
              Edit
            </Button>
          }
        >
          {body}
        </Disclosure>
      ))}
    </div>
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
    <div style={demoStack}>
      <EmptyState
        title="No projects yet"
        description="Create a project to start tracking tokens and components."
      />
      <EmptyState
        variant="teaching"
        framed
        icon={FileText}
        title="No projects yet"
        description="Create a project to start tracking tokens and components."
        action={<Button variant="primary">New project</Button>}
      />
    </div>
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
      Read the <InlineLink href="#">upgrade guide</InlineLink> before you bump the range, or the{' '}
      <InlineLink href="https://github.com/hirobius/hds/releases">release notes</InlineLink> on
      GitHub.
    </p>
  );
}

function ComposerDemo() {
  const [sent, setSent] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Composer
        placeholder="Drop a thought, or paste something long"
        pasteFoldThreshold={200}
        onSubmit={({ text, attachments }) =>
          setSent(`${text.length} chars, ${attachments.length} attachments`)
        }
      />
      {sent && <p style={{ margin: 0 }}>Sent: {sent}</p>}
    </div>
  );
}

const PALETTE_ITEMS = [
  { id: 'new-issue', label: 'New issue', group: 'Actions', shortcut: ['C'] },
  { id: 'invite', label: 'Invite a teammate', group: 'Actions', keywords: ['member', 'user'] },
  {
    id: 'move-issue',
    label: 'Move issue',
    group: 'Actions',
    args: [
      {
        id: 'project',
        label: 'Project',
        options: [
          { id: 'website', label: 'Website' },
          { id: 'mobile', label: 'Mobile app' },
        ],
      },
      { id: 'note', label: 'Note' },
    ],
  },
  { id: 'archive', label: 'Archive project', group: 'Actions', disabled: true },
  { id: 'inbox', label: 'Go to inbox', group: 'Navigation', shortcut: ['G', 'I'] },
  { id: 'settings', label: 'Open settings', group: 'Navigation', keywords: ['preferences'] },
  { id: 'theme', label: 'Switch theme', group: 'Preferences', shortcut: ['⌘', 'J'] },
];

function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState<string | null>(null);
  return (
    <div style={demoRow}>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Search commands
      </Button>
      {ran && <span>Ran: {ran}</span>}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={PALETTE_ITEMS}
        onSelect={(item, args) =>
          setRan(
            args
              ? `${item.label} (${Object.entries(args)
                  .map(([name, value]) => `${name}: ${value}`)
                  .join(', ')})`
              : item.label,
          )
        }
        // ⌘K already opens the docs search here, so the demo opens from its button only.
        hotkey={false}
      />
    </div>
  );
}

function ThemeToggleDemo() {
  // Local state only: the demo shows the morph without switching the docs theme.
  const [dark, setDark] = useState(false);
  return (
    <div style={demoRow}>
      <ThemeToggle isDark={dark} onToggle={() => setDark((d) => !d)} />
      <span>{dark ? 'Dark' : 'Light'}: press to morph</span>
      <ThemeToggle isDark={false} onToggle={() => {}} />
      <ThemeToggle isDark onToggle={() => {}} />
    </div>
  );
}

function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialog.Trigger asChild>
        <Button variant="secondary" tone="danger">
          Delete project
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete project?</AlertDialog.Title>
          <AlertDialog.Description>
            Its boards and files are removed for everyone. This cannot be undone.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel asChild>
            <Button variant="secondary">Cancel</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button variant="primary" tone="danger">
              Delete
            </Button>
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}

function DockDemo() {
  // The frame's transform makes it the Dock's containing block, so on a phone the
  // fixed Dock sits at the frame's bottom, not the page's. Focus the field: the Dock steps aside.
  return (
    <div style={{ position: 'relative', transform: 'translateZ(0)', minBlockSize: 200 }}>
      <Stack gap="normal">
        <Input label="Cover note" />
        <Dock aria-label="Job actions">
          <Stack direction="row" gap="tight">
            <Button variant="secondary">Save</Button>
            <Button variant="primary">Apply</Button>
          </Stack>
        </Dock>
      </Stack>
    </div>
  );
}

function PinDemo() {
  // A short scroll box stands in for the page: scroll it and the heading stays put.
  return (
    <div
      role="region"
      aria-label="Pinned heading example"
      // A scroll box must be keyboard-scrollable (axe scrollable-region-focusable).
      tabIndex={0}
      className="hds-focus"
      style={{ blockSize: 200, overflowY: 'auto' }}
    >
      <Pin top="0" style={{ ...demoTile, zIndex: 1 }}>
        Pinned while this box scrolls
      </Pin>
      {['Step one', 'Step two', 'Step three', 'Step four', 'Step five'].map((label) => (
        <p key={label} style={{ margin: 0, padding: SM }}>
          {label}
        </p>
      ))}
    </div>
  );
}

function SidebarDemo() {
  return (
    <Sidebar sideWidth="12rem" gap="normal">
      <div style={demoTile}>Rail: filters</div>
      <div style={demoTile}>
        Content: results fill the rest and drop below the rail when space runs out.
      </div>
    </Sidebar>
  );
}

function SwitcherDemo() {
  return (
    <Switcher threshold="30rem" gap="normal">
      {['Plan', 'Build', 'Ship'].map((label) => (
        <div key={label} style={demoTile}>
          {label}
        </div>
      ))}
    </Switcher>
  );
}

function AvatarGroupDemo() {
  return (
    <AvatarGroup max={3} aria-label="Project members">
      <Avatar alt="Ada Lovelace" initials="AL" />
      <Avatar alt="Grace Hopper" initials="GH" />
      <Avatar alt="Alan Kay" initials="AK" />
      <Avatar alt="Barbara Liskov" initials="BL" />
      <Avatar alt="Edsger Dijkstra" initials="ED" />
    </AvatarGroup>
  );
}

function MetadataListDemo() {
  return (
    <div style={demoColumn}>
      <MetadataList
        orientation="horizontal"
        items={[
          { term: 'Status', description: 'Active' },
          { term: 'Owner', description: 'Grace Hopper' },
          { term: 'Plan', description: 'Team, billed yearly' },
        ]}
      />
    </div>
  );
}

function StatusListItemDemo() {
  return (
    <div style={demoColumn}>
      <StatusListItem
        tone="success"
        statusLabel="Done"
        title="Invoice sent"
        notes={['Paid on delivery']}
        trailing={<Badge tone="success">Paid</Badge>}
      />
      <StatusListItem
        tone="warning"
        statusLabel="Waiting"
        title="Quote awaiting reply"
        notes={['Sent 3 days ago']}
      />
      <StatusListItem title="Draft saved" />
    </div>
  );
}

function BlockquoteDemo() {
  return <Blockquote attribution="Dieter Rams">Less, but better.</Blockquote>;
}

function CalloutDemo() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Callout tone="info">Drafts save every few seconds while you type.</Callout>
      <Callout tone="accent" italic>
        Hypothesis: a shorter form lifts sign-ups more than a new headline.
      </Callout>
    </div>
  );
}

function InlineCodeDemo() {
  return (
    <p style={{ margin: 0 }}>
      Install the package with <InlineCode copyable>pnpm add @hirobius/design-system</InlineCode>,
      then import <InlineCode>Button</InlineCode>.
    </p>
  );
}

// A fixed date, reference time and locale keep the demo the same on every build.
const TIMESTAMP_NOW = '2026-03-14T12:00:00Z';

function TimestampDemo() {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <Timestamp date="2026-03-02T12:00:00Z" format="date" locale="en-US" />
      <Timestamp date="2026-03-12T12:00:00Z" format="relative" now={TIMESTAMP_NOW} locale="en-US" />
    </div>
  );
}

function KbdDemo() {
  return (
    <p style={{ margin: 0 }}>
      Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to search.
    </p>
  );
}

function MetaLineDemo() {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <MetaLine items={['Acme Cloud', 'Remote']} />
      <MetaLine items={['Posted 3 days ago']} />
    </div>
  );
}

function ListDemo() {
  return (
    <div className="flex max-w-xl flex-col">
      <List>
        <List.Group title="Saved roles" count={2} action={<Button variant="link">See all</Button>}>
          <List.Item
            href="#"
            leading={<List.Tile icon={Briefcase} />}
            title="Design systems lead"
            description="Acme Cloud, remote, full time"
            meta="Saved 2 days ago"
            trailing="chevron"
          />
          <List.Item
            href="#"
            leading={<List.Tile icon={Briefcase} />}
            title="Staff front-end engineer"
            description="Northwind, hybrid"
            meta="Saved last week"
            actions={
              <>
                <Menu.Item onSelect={() => {}}>Archive</Menu.Item>
                <Menu.Item onSelect={() => {}}>Copy link</Menu.Item>
              </>
            }
          />
        </List.Group>
        <List.Group title="Alerts" count={1}>
          <List.Item
            href="#"
            leading={<List.Tile icon={Bell} />}
            title="New roles this week"
            description="Matches for design systems lead"
            trailing={4}
          />
        </List.Group>
        <List.Group title="Applied" count={0}>
          <List.Empty title="No applications yet" description="Roles you apply to show here." />
        </List.Group>
      </List>
      <List variant="plain" divider="none" defaultStatus="open">
        <List.Group title="Pipeline" count={2}>
          <List.Item
            href="#"
            title="Acme Cloud"
            meta="Updated today"
            status={{ value: 'open', label: 'Open' }}
          />
          <List.Item
            href="#"
            title="Northwind"
            meta="Updated Monday"
            status={{ value: 'interview', label: 'Interview' }}
            statusIn="trailing"
            trailing="chevron"
          />
        </List.Group>
      </List>
    </div>
  );
}

function NavListDemo() {
  const jobs = [
    { title: 'Design systems lead', meta: ['Acme Cloud', 'Remote'] as [string, string] },
    { title: 'Staff front-end engineer', meta: ['Northwind', 'Hybrid'] as [string, string] },
    { title: 'Product designer', meta: ['Globex', 'On-site'] as [string, string] },
  ];
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ maxWidth: 320, display: 'grid', gap: 24 }}>
      <NavList aria-label="Saved jobs (links)">
        <NavList.Item href="#" current>
          Design systems lead
          <MetaLine items={['Acme Cloud', 'Remote']} />
        </NavList.Item>
        <NavList.Item
          href="#"
          action={
            <Button
              variant="tertiary"
              iconOnly
              label="Star Staff front-end engineer"
              iconLeft={<Icon icon={Star} size="small" />}
            />
          }
        >
          Staff front-end engineer
          <MetaLine items={['Northwind', 'Hybrid']} />
        </NavList.Item>
      </NavList>
      <NavList aria-label="Saved jobs">
        {jobs.map((job, index) => (
          <NavList.Item
            key={job.title}
            selected={index === selected}
            onSelect={() => setSelected(index)}
          >
            {job.title}
            <MetaLine items={job.meta} />
          </NavList.Item>
        ))}
      </NavList>
    </div>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(3);
  const [item, setItem] = useState(1);
  return (
    <div className="flex flex-col gap-fixed-md">
      <Pagination count={10} page={page} onPageChange={setPage} />
      {/* Compact Previous and Next are outlined; the end you are on stays outlined, faded (hds#886). */}
      <Pagination variant="compact" label="Item" count={4} page={item} onPageChange={setItem} />
    </div>
  );
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
  const [range, setRange] = useState('week');
  const ranges = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
  return (
    <div style={demoStack}>
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
      <SegmentedControl
        label="Range"
        variant="secondary"
        value={range}
        onChange={setRange}
        options={ranges}
      />
      {/* The secondary selected segment must read on a raised surface too (hds#866). */}
      <Card padding="item">
        <SegmentedControl
          label="Range on a card"
          variant="secondary"
          value={range}
          onChange={setRange}
          options={ranges}
        />
      </Card>
    </div>
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
  const [copied, flashCopied] = useTransientFlag();
  const [terms, setTerms] = useState(['design systems', 'tokens', 'contract']);
  return (
    <div style={{ display: 'grid', gap: XS }}>
      <div style={demoRow}>
        {['tokens', 'components', 'patterns'].map((tag) => (
          <Tag key={tag} active={active === tag} onClick={() => setActive(tag)}>
            {tag}
          </Tag>
        ))}
      </div>
      {/* Dismissible: a static label; only the X (40px hit area) removes it. */}
      <div style={demoRow}>
        {terms.map((term) => (
          <Tag key={term} onDismiss={() => setTerms((t) => t.filter((x) => x !== term))}>
            {term}
          </Tag>
        ))}
      </div>
      {/* Leading icon, and a short "Copied" state (the caller owns the copy and the timer). */}
      <div style={demoRow}>
        <Tag icon={Star}>tokens</Tag>
        <Tag
          icon={Copy}
          copied={copied}
          onClick={() => {
            void navigator.clipboard?.writeText('#4f46e5');
            flashCopied();
          }}
        >
          #4f46e5
        </Tag>
        <Tag icon={Star} onDismiss={() => {}}>
          contract
        </Tag>
      </div>
    </div>
  );
}

function TextDemo() {
  // minmax(0, 1fr): a grid track sized to its content would grow to the full
  // one-line width of the truncated row, so the track has to be allowed to shrink.
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: XS }}>
      <Text variant="display">Display</Text>
      <Text variant="title">Title</Text>
      <Text variant="body">Body for flowing prose and paragraph copy.</Text>
      <Text variant="ui">UI for labels and control text.</Text>
      <Text variant="caption">Caption for supporting metadata.</Text>
      <Text variant="mono">semantic.typography.mono</Text>
      {/* hds#916: truncate gives way to a neighbour in a flex row; lineClamp breaks between words. */}
      <div style={{ display: 'flex', gap: SM, alignItems: 'center' }}>
        <Text variant="ui" truncate>
          Senior Design Systems Engineer, Component Platform and Tooling, Remote across the Americas
        </Text>
        <Badge>New</Badge>
      </div>
      <Text variant="body" lineClamp={2}>
        A note under a card&apos;s facts stays at two lines at most: the rest of this sentence runs
        on past the second line so the clamp has something to cut, and the last visible word ends in
        an ellipsis instead of a half-cut letter.
      </Text>
      <Text variant="mono" lineClamp={4}>
        (&quot;design system&quot; OR &quot;design systems&quot; OR &quot;component library&quot;)
        AND (engineer OR technologist OR lead) site:boards.greenhouse.io OR site:jobs.lever.co OR
        site:jobs.ashbyhq.com -intern -internship -contract -agency -recruiter -&quot;staffing&quot;
        -&quot;talent partner&quot;
        semantic.typography.mono.font-family.fallback-stack.with-no-spaces-anywhere-in-it
      </Text>
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

function TokenFieldDemo() {
  const [value, setValue] = useState('Hi [Contact],\n\nI saw the [Role] opening at [Company].');
  const field = useRef<TokenFieldHandle>(null);
  return (
    <div style={demoColumn}>
      <TokenField
        ref={field}
        label="Message"
        helperText="Each [Variable] is one chip: Backspace removes all of it."
        value={value}
        onChange={setValue}
      />
      <Menu modal={false}>
        <Menu.Trigger asChild>
          <Button variant="secondary">Insert variable</Button>
        </Menu.Trigger>
        <Menu.Content>
          {['[Company]', '[Role]', '[Contact]'].map((token) => (
            <Menu.Item key={token} onSelect={() => field.current?.insertAt(token)}>
              {token.slice(1, -1)}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu>
    </div>
  );
}

function TimelineDemo() {
  return (
    <Timeline aria-label="Recent activity">
      <TimelineItem
        date={new Date(2026, 9, 12, 16, 40)}
        title="Shipped hds 0.24"
        icon={CircleCheck}
        tone="success"
      />
      <TimelineItem date={new Date(2026, 9, 12, 9, 15)} title="Client portal deployed">
        Preview checked on desktop and mobile, then promoted by the owner.
      </TimelineItem>
      <TimelineItem date={new Date(2026, 9, 11, 14, 5)} title="Invoice reminder sent" />
      <TimelineItem
        date={new Date(2026, 9, 11, 10, 30)}
        title="Lead pipeline run finished"
        tone="info"
      />
    </Timeline>
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
      metadata={
        <>
          <Badge tone="neutral">Referral</Badge>
          <Badge tone="info">Pitch</Badge>
        </>
      }
      title="Acme Co"
      titleMenu={
        <>
          <Menu.Item>Rename client</Menu.Item>
          <Menu.Item>Switch client</Menu.Item>
        </>
      }
      titleMenuLabel="Acme Co options"
      description="Brand refresh and the spring campaign site."
      descriptionPlacement="title"
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
        // A status badge is a short literal: it sizes to itself. One-word statuses keep all three
        // columns inside a 390px phone (tests/visual/docs-phone-fit.spec.ts).
        { key: 'status', label: 'Status', width: 'max-content' },
      ]}
      rows={[
        {
          key: 'portfolio',
          cells: [
            'Portfolio redesign',
            <Badge key="s" tone="success">
              Live
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
              Draft
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

function AsyncStateDemo() {
  return (
    <AsyncState
      status="error"
      label="Open roles"
      error="The job board did not answer in time."
      onRetry={() => {}}
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
    // The frame holds the image's ratio, so the page does not reflow when it decodes (hds#770).
    <div style={{ width: 'min(100%, 360px)', aspectRatio: '640 / 360' }}>
      <AssetImg
        src={SAMPLE_IMAGE}
        alt="Sample artwork"
        naturalWidth={640}
        naturalHeight={360}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
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
  AlertDialog: AlertDialogDemo,
  Pin: PinDemo,
  Dock: DockDemo,
  Sidebar: SidebarDemo,
  Switcher: SwitcherDemo,
  AvatarGroup: AvatarGroupDemo,
  MetadataList: MetadataListDemo,
  StatusListItem: StatusListItemDemo,
  Blockquote: BlockquoteDemo,
  Callout: CalloutDemo,
  InlineCode: InlineCodeDemo,
  Timestamp: TimestampDemo,
  AppShell: AppShellDemo,
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
  Board: BoardDemo,
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
  Composer: ComposerDemo,
  CommandPalette: CommandPaletteDemo,
  Kbd: KbdDemo,
  MetaLine: MetaLineDemo,
  NavList: NavListDemo,
  List: ListDemo,
  Pagination: PaginationDemo,
  Popover: PopoverDemo,
  Progress: ProgressDemo,
  Radio: RadioDemo,
  SegmentedControl: SegmentedControlDemo,
  Sheet: SheetDemo,
  Skeleton: SkeletonDemo,
  Slider: SliderDemo,
  Spinner: SpinnerDemo,
  Stack: StackDemo,
  Surface: SurfaceDemo,
  Tabs: TabsDemo,
  ThemeToggle: ThemeToggleDemo,
  Tag: TagDemo,
  Text: TextDemo,
  Textarea: TextareaDemo,
  TokenField: TokenFieldDemo,
  Timeline: TimelineDemo,
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
  AsyncState: AsyncStateDemo,
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
        // The page canvas, no outline (hds#891): the surface components sit on in apps.
        // Not surface.muted (muted Tags and SegmentedControl tracks vanish into it) and not
        // surface.raised (borderless Cards vanish into it). Pinned by
        // tests/docs-site/demo-frame-contrast.test.ts.
        // Narrower below sm (globals.css), where the frame's empty inset costs a phone's width.
        padding: 'var(--hds-demo-frame-padding, var(--semantic-space-scale-md))',
        borderRadius: 'var(--semantic-radius-action)',
        background: 'var(--semantic-color-surface-page)',
        color: 'var(--semantic-color-content-primary)',
      }}
    >
      {children}
    </div>
  );
}
