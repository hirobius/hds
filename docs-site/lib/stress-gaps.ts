/**
 * /stress (hds#520): the screens built from public HDS only, and every gap the
 * build hit. Each gap is marked `GAP:<id>` at the line that works around it;
 * tests/docs-site/stress.test.tsx fails if the two lists drift. `title` is the
 * proposed issue title; nothing here is filed.
 */
export type StressScreenId = 'settings' | 'dashboard' | 'inbox';

export const STRESS_SCREENS: { id: StressScreenId; title: string; summary: string }[] = [
  {
    id: 'settings',
    title: 'Workspace settings',
    summary: 'A settings form with sections, validation and a destructive action.',
  },
  {
    id: 'dashboard',
    title: 'Studio dashboard',
    summary: 'Metrics, a sortable project table and pagination.',
  },
  { id: 'inbox', title: 'Drops inbox', summary: 'A list with a detail pane.' },
];

export interface StressGap {
  id: string;
  kind: 'component' | 'prop' | 'token';
  screens: StressScreenId[];
  /** Proposed issue title. */
  title: string;
  /** What the screen did instead. */
  workaround: string;
}

export const STRESS_GAPS: StressGap[] = [
  {
    id: 'radio-group',
    kind: 'component',
    screens: ['settings'],
    title: 'RadioGroup: label, value, onChange and arrow-key focus for a set of Radio options',
    workaround:
      'A Stack with role="radiogroup" and one controlled Radio per option; arrow keys do not move between them.',
  },
  {
    id: 'settings-section',
    kind: 'component',
    screens: ['settings'],
    title: 'SettingsSection pattern: a titled, described group of fields, side by side on desktop',
    workaround:
      'Sidebar with a Text title and caption on the rail, the fields in the content; re-spaced by hand per section.',
  },
  {
    id: 'toggle-description',
    kind: 'prop',
    screens: ['settings'],
    title: 'Toggle and Checkbox: a description prop for one line of help under the label',
    workaround: 'A caption Text placed after the control, not tied to it with aria-describedby.',
  },
  {
    id: 'metric-tile',
    kind: 'component',
    screens: ['dashboard'],
    title: 'A non-deprecated metric tile: label, value and a change versus last period',
    workaround:
      'Stat, MetricTile and Card.Metric are all deprecated, so each tile is a Card with caption and title Text.',
  },
  {
    id: 'metric-delta',
    kind: 'prop',
    screens: ['dashboard'],
    title: 'Metric delta: an up or down change with tone and an accessible label',
    workaround: 'A Badge with the change written out as text ("+12% vs last month").',
  },
  {
    id: 'grid-mobile-columns',
    kind: 'prop',
    screens: ['dashboard'],
    title: 'Grid: fixed layout should drop to one or two columns on phones, not keep four',
    workaround:
      'layout="auto-fit" with a minItemWidth, so the column count is no longer set by the screen.',
  },
  {
    id: 'chart',
    kind: 'component',
    screens: ['dashboard'],
    title: 'Sparkline or bar chart primitive themed by the dataviz tokens',
    workaround: 'Progress bars stand in for a weekly hours chart.',
  },
  {
    id: 'list-selected',
    kind: 'prop',
    screens: ['inbox'],
    title: 'ListItem: a selected state (aria-current) for list and detail layouts',
    workaround: 'The open row is only shown in the detail pane; the list does not mark it.',
  },
  {
    id: 'split-view',
    kind: 'component',
    screens: ['inbox'],
    title:
      'SplitView pattern: list and detail panes that collapse to one pane with a back action on phones',
    workaround:
      'Sidebar stacks the list over the detail at 390px, so the detail sits below a long list.',
  },
];
