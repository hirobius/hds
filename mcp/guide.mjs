/**
 * The consumer guide: which HDS component answers which screen need.
 *
 * One source for both agent surfaces: the `hds` MCP server (mcp/catalog.mjs)
 * serves it, and scripts/generate-agents-md.mjs projects it into the packaged
 * AGENTS.md. Component facts (props, descriptions, import paths) are NOT here;
 * they come from the shipped manifest and component-api.json. This file holds
 * only the choices the data leaves open, each one a place where agents built
 * the same screen differently in the 2026-10-05 consistency baseline
 * (eval/consistency/DIAGNOSIS-2026-10-05.md).
 *
 * Every name in `use` must exist in component-api.json or be a listed hook;
 * scripts/__tests__/generate-agents-md.test.mjs enforces it.
 */

/** Hooks are not components, so component-api.json has no entry for them. */
export const HOOKS = {
  useToast: {
    import: '@hirobius/design-system',
    note: 'Inside a ToastProvider: `const { toast } = useToast(); toast({ title, description?, tone? })`.',
  },
};

/**
 * One row per screen need. `use` is the answer (in order of composition),
 * `avoid` the alternatives agents reached for instead, `how` one line of usage.
 * `keywords` feed search_components ranking. A component named in `avoid` is
 * not wrong in general; it is the wrong answer for that one need, and the
 * server tells an agent so (`insteadFor`). Every need has one answer: the four
 * number components are the case that split the baseline, so a row of numbers
 * is always MetricTiles.
 */
export const INTENTS = [
  {
    id: 'page-shell',
    need: 'Outermost wrapper of a screen',
    keywords: ['page', 'screen', 'shell', 'layout', 'wrapper', 'root'],
    use: ['Page', 'Stack'],
    avoid: ['Container', 'Box', 'a bare Stack as the root'],
    how: '`<Page><Stack gap="spacious">…one child per section…</Stack></Page>`. `Container` is for a full-bleed surface that is not a page.',
  },
  {
    id: 'page-header',
    need: 'Screen title with breadcrumb, status and actions',
    keywords: ['title', 'header', 'heading', 'breadcrumb', 'status', 'name'],
    use: ['PageHeader', 'Breadcrumb', 'Badge'],
    avoid: ['Text as the page title', 'a Stack row of Text and Badge'],
    how: 'Exactly one per screen: `<PageHeader breadcrumb={<Breadcrumb items={[{ label, href }, { label }]} />} title="…" status={<Badge tone="success">Active</Badge>} />`.',
  },
  {
    id: 'metrics',
    need: 'Row of headline numbers (stats, KPIs, counts, totals)',
    keywords: [
      'metric',
      'metrics',
      'stat',
      'stats',
      'kpi',
      'number',
      'numbers',
      'tile',
      'tiles',
      'headline',
      'count',
      'total',
    ],
    use: ['MetricTiles', 'MetricTile'],
    avoid: ['Stat', 'StatusTile', 'CardMetric', 'Card with Text'],
    how: '`<MetricTiles><MetricTile label="Open projects" value="5" />…</MetricTiles>`; one MetricTile per number. `Stat` is for a number inside prose or a dense list, `Card.Metric` for one inside an existing `Card`, `StatusTile` for a state with notes (never a number).',
  },
  {
    id: 'table',
    need: 'Table of records with row actions',
    keywords: ['table', 'rows', 'records', 'list', 'data', 'grid', 'columns'],
    use: ['DataTableSection', 'Badge', 'Button'],
    avoid: ['Table on its own', 'Card around a Table'],
    how: '`<DataTableSection title="Projects" columns={[{ key, label }]} rows={[{ key, cells: [...], actions: <Stack direction="row" gap="tight">…</Stack> }]} />`; leave the actions column out of `columns`.',
  },
  {
    id: 'tabs',
    need: 'Switch between panels of related content',
    keywords: ['tabs', 'tab', 'panel', 'panels', 'sections', 'switch'],
    use: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
    avoid: ['SegmentedControl', 'Button rows'],
    how: '`<Tabs defaultValue="a"><TabsList><TabsTrigger value="a">A</TabsTrigger></TabsList><TabsContent value="a">…</TabsContent></Tabs>`.',
  },
  {
    id: 'status',
    need: 'Status label in a header or table cell',
    keywords: ['status', 'state', 'label', 'chip', 'pill', 'badge'],
    use: ['Badge'],
    avoid: ['Tag', 'Text'],
    how: '`<Badge tone="success|info|warning|danger|neutral|inProgress">…</Badge>`; tone is the only styling input.',
  },
  {
    id: 'form',
    need: 'Form with fields and a submit button',
    keywords: ['form', 'field', 'fields', 'input', 'textarea', 'notes', 'submit', 'save'],
    use: ['Form', 'Textarea', 'Input', 'FormActions', 'Button'],
    avoid: ['a raw `<form>`', 'a Stack of Buttons as the footer'],
    how: '`<Form onSubmit={…}><Textarea label="Notes" … /><FormActions primary={<Button type="submit">Save note</Button>} /></Form>`; every field takes its own `label`.',
  },
  {
    id: 'confirm',
    need: 'Confirm a destructive or irreversible action (delete, archive, remove)',
    keywords: [
      'confirm',
      'confirmation',
      'destructive',
      'delete',
      'archive',
      'remove',
      'modal',
      'dialog',
    ],
    use: ['AlertDialog', 'Button'],
    avoid: ['Dialog', '`window.confirm`'],
    how: 'Trigger, title, description, Cancel and Action parts: `<AlertDialog><AlertDialog.Trigger asChild><Button …>Archive</Button></AlertDialog.Trigger><AlertDialog.Content><AlertDialog.Header><AlertDialog.Title>…</AlertDialog.Title><AlertDialog.Description>…</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel asChild><Button variant="secondary">Cancel</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button tone="danger" onClick={…}>Archive</Button></AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog>`. Focus moves in and returns to the trigger for you.',
  },
  {
    id: 'feedback',
    need: 'Brief confirmation after an action (saved, archived, sent)',
    keywords: [
      'toast',
      'confirmation',
      'saved',
      'success',
      'notify',
      'notification',
      'feedback',
      'message',
    ],
    use: ['ToastProvider', 'useToast'],
    avoid: ['Badge', 'Alert', 'Text'],
    how: 'Wrap the app root once in `<ToastProvider>`, then `toast({ title: "Note saved", tone: "success" })` from `useToast()`.',
  },
  {
    id: 'message',
    need: 'Message that stays next to its content (error, warning, info)',
    keywords: ['alert', 'error', 'warning', 'info', 'banner', 'callout'],
    use: ['Alert'],
    avoid: ['Text in a coloured Surface'],
    how: '`<Alert tone="warning">…</Alert>`.',
  },
  {
    id: 'action',
    need: 'Button or row action',
    keywords: ['button', 'action', 'click', 'view', 'edit', 'cta'],
    use: ['Button'],
    avoid: ['a raw `<button>`', 'InlineLink for an action'],
    how: 'Row actions: `<Button variant="tertiary" size="sm" aria-label="View Brand refresh">View</Button>`; the destructive one adds `tone="danger"`.',
  },
  {
    id: 'spacing',
    need: 'Space between sections or items',
    keywords: ['spacing', 'gap', 'stack', 'row', 'column', 'layout', 'columns'],
    use: ['Stack', 'Grid'],
    avoid: ['margins on children', 'raw px gaps such as px8'],
    how: 'Stack `gap`: `spacious` between page sections, `normal` inside a section, `tight` between buttons. `Grid` for two-dimensional layout.',
  },
  {
    id: 'surface',
    need: 'Padded background or a titled content object',
    keywords: ['card', 'surface', 'panel', 'box', 'background', 'container'],
    use: ['Surface', 'Card'],
    avoid: ['a Box with background and padding'],
    how: '`Surface` for a plain padded background; `Card` only when the content has a title or can be pressed.',
  },
  {
    id: 'progress',
    need: 'Progress bar or ring',
    keywords: ['progress', 'bar', 'percent', 'loading', 'completion'],
    use: ['Progress'],
    avoid: ['a hand-built bar'],
    how: '`<Progress value={60} label="Upload" />`; inside an existing `Card`, `CardProgress`.',
  },
  {
    id: 'text',
    need: 'Body copy',
    keywords: ['text', 'copy', 'paragraph', 'body', 'typography'],
    use: ['Text'],
    avoid: ['Text as a section heading'],
    how: 'Section headings come from the pattern that owns the section (`PageHeader` `title`, `DataTableSection` `title`), not from extra Text.',
  },
  {
    id: 'empty',
    need: 'Empty state for a list or section',
    keywords: ['empty', 'none', 'nothing', 'placeholder', 'zero'],
    use: ['EmptyState'],
    avoid: ['Text saying "No items"'],
    how: '`DataTableSection` shows its own through `emptyTitle`; use `EmptyState` elsewhere.',
  },
  {
    id: 'danger-zone',
    need: 'The one irreversible action of a screen (delete the client, close the account)',
    keywords: ['danger', 'irreversible', 'delete', 'account', 'zone', 'destructive'],
    use: ['DestructiveSection'],
    avoid: ['a danger Button that acts without a confirm'],
    how: 'Last on the screen: `<DestructiveSection title="Delete client" description="…" actionLabel="Delete" onConfirm={…} />`; it opens its own AlertDialog. A per-row destructive action uses AlertDialog directly.',
  },
  {
    id: 'metadata',
    need: 'Read-only details as label and value pairs',
    keywords: ['metadata', 'details', 'properties', 'key', 'value', 'pairs', 'record'],
    use: ['MetadataList', 'Field'],
    avoid: ['a Table with two columns', 'Text pairs in a Stack'],
    how: '`<MetadataList items={[{ term: "Owner", description: "Ada" }]} />` for a set; `Field` for one pair.',
  },
  {
    id: 'people',
    need: 'A person, or a group of people',
    keywords: ['avatar', 'avatars', 'person', 'people', 'user', 'users', 'team', 'members'],
    use: ['Avatar', 'AvatarGroup'],
    avoid: ['an image in a rounded Box'],
    how: '`<Avatar src alt initials />`; several in a row: `<AvatarGroup max={3}>…Avatars…</AvatarGroup>`.',
  },
  {
    id: 'date',
    need: 'A date or time',
    keywords: ['date', 'time', 'timestamp', 'when', 'ago', 'due'],
    use: ['Timestamp'],
    avoid: ['a formatted string in Text'],
    how: '`<Timestamp date="2026-10-14" />` renders a `<time dateTime>`; a date in a table cell may stay plain text.',
  },
  {
    id: 'shortcut',
    need: 'A keyboard key or shortcut hint',
    keywords: ['keyboard', 'shortcut', 'key', 'kbd', 'hotkey'],
    use: ['Kbd'],
    avoid: ['InlineCode', 'Text in a Box'],
    how: '`<Kbd>⌘K</Kbd>`.',
  },
  {
    id: 'quote',
    need: 'A quotation with attribution',
    keywords: ['quote', 'quotation', 'testimonial', 'blockquote', 'citation'],
    use: ['Blockquote'],
    avoid: ['Callout for a quote', 'italic Text'],
    how: '`<Blockquote attribution="Ada Lovelace">…</Blockquote>`.',
  },
  {
    id: 'rail',
    need: 'A fixed-width side rail beside fluid content, or a row that stacks when narrow',
    keywords: ['sidebar', 'rail', 'aside', 'responsive', 'switcher', 'stack', 'narrow', 'columns'],
    use: ['Sidebar', 'Switcher'],
    avoid: ['a Grid with media queries'],
    how: '`Sidebar` (`side`, `sideWidth`) for rail + content; `Switcher` (`threshold`) for a row that flips to a column. Neither needs a media query.',
  },
  {
    id: 'sticky',
    need: 'Keep an element stuck while its region scrolls',
    keywords: ['sticky', 'pin', 'fixed', 'scroll'],
    use: ['Pin'],
    avoid: ['position: sticky in style'],
    how: '`<Pin top="…">…</Pin>` inside the scrolling region.',
  },
];

/**
 * The ratified core set (scripts/lib/core-components.mjs, hds#254). Copied, not
 * imported, because scripts/ does not ship; scripts/__tests__/generate-agents-md.test.mjs
 * pins the two together.
 */
export const RATIFIED_CORE = [
  'Alert',
  'Avatar',
  'Badge',
  'Box',
  'Breadcrumb',
  'Button',
  'Card',
  'Checkbox',
  'Combobox',
  'Container',
  'Dialog',
  'Disclosure',
  'Divider',
  'EmptyState',
  'Field',
  'Grid',
  'HdsRouterProvider',
  'HdsThemeProvider',
  'Icon',
  'InlineLink',
  'Input',
  'Kbd',
  'Menu',
  'Pagination',
  'Popover',
  'Progress',
  'Radio',
  'SegmentedControl',
  'Select',
  'Skeleton',
  'Slider',
  'Spinner',
  'Stack',
  'Surface',
  'Table',
  'Tabs',
  'Tag',
  'Text',
  'Textarea',
  'ToastProvider',
  'Toggle',
  'Tooltip',
  'VisuallyHidden',
];

/** The core set agents should prefer: the ratified core plus every `use` above, hooks excluded. */
export function coreComponents() {
  const names = new Set(RATIFIED_CORE);
  for (const intent of INTENTS) for (const name of intent.use) if (!HOOKS[name]) names.add(name);
  return [...names].sort();
}
