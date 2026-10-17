/**
 * The sections of /tour (hds#795) and the components each one shows. This is the
 * placement list the coverage test (tests/docs-site/tour.test.tsx) checks against
 * component-api.json: a public component missing here fails the build, so a new
 * component cannot ship without a place on the tour. Each section's caption is
 * generated from `components`, linking every name to its docs page.
 */
export interface TourSection {
  id: string;
  title: string;
  /** One line on what the section shows. */
  lead: string;
  components: readonly string[];
}

export const TOUR_SECTIONS: readonly TourSection[] = [
  {
    id: 'shell',
    title: 'App shell',
    lead: 'Providers, the pinned top bar, the navigation rail and the layout primitives under everything else.',
    components: [
      'HdsRouterProvider',
      'HdsThemeProvider',
      'ToastProvider',
      'Page',
      'Pin',
      'Sidebar',
      'Switcher',
      'Container',
      'Box',
      'Stack',
      'Grid',
      'Surface',
      'Divider',
      'Icon',
      'Avatar',
      'AvatarGroup',
      'ThemeToggle',
      'Kbd',
      'InlineLink',
      'VisuallyHidden',
    ],
  },
  {
    id: 'header',
    title: 'Page header and tabs',
    lead: 'Where you are, what it is and what you can do next.',
    components: [
      'PageHeader',
      'Breadcrumb',
      'Badge',
      'Button',
      'Tabs',
      'TabsList',
      'TabsTrigger',
      'TabsContent',
      'Text',
    ],
  },
  {
    id: 'metrics',
    title: 'Metrics',
    lead: 'Counts read from the registry, the token file and the changelog.',
    components: [
      'MetricTiles',
      'MetricTile',
      'StatusTile',
      'Stat',
      'Progress',
      'Timestamp',
      'Card',
      'CardHeader',
      'CardTitle',
      'CardDescription',
      'CardBody',
      'CardFooter',
      'CardMetric',
      'CardProgress',
      'CardRow',
      'CardRowTitle',
      'CardRowNote',
    ],
  },
  {
    id: 'components',
    title: 'Component status',
    lead: 'A sortable, filterable, paginated table, with loading and empty states.',
    components: [
      'Table',
      'DataTableSection',
      'Tag',
      'SegmentedControl',
      'Input',
      'Combobox',
      'Pagination',
      'Skeleton',
      'Spinner',
      'EmptyState',
    ],
  },
  {
    id: 'releases',
    title: 'Release notes and upgrade asks',
    lead: 'The latest releases from CHANGELOG.md, with the steps each one asks of you.',
    components: [
      'Timeline',
      'TimelineItem',
      'Disclosure',
      'Callout',
      'Blockquote',
      'MetadataList',
      'StatusListItem',
      'CodeBlock',
      'InlineCode',
      'Board',
      'BoardColumn',
      'Reveal',
      'AssetImg',
    ],
  },
  {
    id: 'settings',
    title: 'Console settings',
    lead: 'A form with every input type, validation, alerts and a destructive action.',
    components: [
      'Form',
      'FormField',
      'FormFieldShell',
      'FormActions',
      'Field',
      'Select',
      'Checkbox',
      'Radio',
      'Toggle',
      'Slider',
      'Textarea',
      'Composer',
      'Alert',
      'DestructiveSection',
    ],
  },
  {
    id: 'overlays',
    title: 'Menus and overlays',
    lead: 'Everything that opens on top of the page.',
    components: [
      'Menu',
      'Popover',
      'Tooltip',
      'Dialog',
      'DialogTrigger',
      'DialogContent',
      'DialogHeader',
      'DialogTitle',
      'DialogDescription',
      'DialogFooter',
      'DialogClose',
      'DialogPortal',
      'DialogOverlay',
      'AlertDialog',
    ],
  },
];

/**
 * Parts that Dialog.Content renders itself (it wraps its children in a Portal and
 * an Overlay), so the tour cannot place them a second time without doubling the
 * scrim. They count as rendered whenever the part named here is.
 */
export const COMPOSED_BY: Readonly<Record<string, string>> = {
  DialogPortal: 'DialogContent',
  DialogOverlay: 'DialogContent',
};

export const tourComponents = (): string[] => TOUR_SECTIONS.flatMap((s) => [...s.components]);
