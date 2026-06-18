/**
 * ActivityFeed pattern doc (8t-3b)
 * @doc-ignore — this is a doc *page*, not a component. It documents the
 *   ActivityFeed pattern; the pattern itself owns its tier:pattern
 *   componentSpecs row.
 */

import { Rocket, ShieldCheck, Upload as UploadSimple, CircleX as XCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { ActivityFeed, type ActivityEvent } from '../../../components/activity-feed';
import { Icon } from '../../../components/icon';
import { PatternDocPage } from './_template';

const BASIC_SOURCE = `<ActivityFeed events={[
  {
    id: 'evt-001',
    title: 'File uploaded',
    description: 'firmware-v2.4.1.bin pushed to staging.',
    timestamp: '2026-04-22 · 08:14',
    category: 'Storage',
    icon: <Icon icon={UploadSimple} size="medium" />,
    status: 'neutral',
  },
]} />`;

const STATUS_SOURCE = `<ActivityFeed events={[
  { /* status: 'success' */ },
  { /* status: 'error'   */ },
  { /* status: 'info'    */ },
]} />`;

const ACTION_SOURCE = `<ActivityFeed events={[
  {
    /* …event… */
    action: { label: 'View Details', onClick: () => {} },
  },
]} />`;

const basicEvents: ActivityEvent[] = [
  {
    id: 'evt-001',
    title: 'File uploaded',
    description: 'firmware-v2.4.1.bin pushed to staging by adrianm. Integrity check passed.',
    timestamp: '2026-04-22 · 08:14',
    category: 'Storage',
    icon: <Icon icon={UploadSimple} size="medium" />,
    status: 'neutral',
  },
];

const statusEvents: ActivityEvent[] = [
  {
    id: 'evt-success',
    title: 'Service deployed',
    description: 'API gateway v3.1.2 promoted to production.',
    timestamp: '2026-04-21 · 23:05',
    category: 'CI/CD',
    icon: <Icon icon={Rocket} size="medium" />,
    status: 'success',
  },
  {
    id: 'evt-error',
    title: 'Deployment failed',
    description: 'Release candidate rc-1.9.0 failed during lint:tokens.',
    timestamp: '2026-04-22 · 06:30',
    category: 'CI/CD',
    icon: <Icon icon={XCircle} size="medium" />,
    status: 'error',
  },
  {
    id: 'evt-info',
    title: 'Policy updated',
    description: 'Access control policy "eng-prod-write" was modified.',
    timestamp: '2026-04-22 · 07:52',
    category: 'Security',
    icon: <Icon icon={ShieldCheck} size="medium" />,
    status: 'info',
  },
];

const actionEvents: ActivityEvent[] = [
  {
    id: 'evt-action',
    title: 'Policy updated',
    description: 'Three permission groups were added to "eng-prod-write"; two removed.',
    timestamp: '2026-04-22 · 07:52',
    category: 'Security',
    icon: <Icon icon={ShieldCheck} size="medium" />,
    status: 'info',
    action: { label: 'View Details' },
  },
];

export default function ActivityFeedPatternPage() {
  const { isDark } = useTheme();

  return (
    <PatternDocPage
      title="ActivityFeed"
      intro="Chronological event log using whitespace to separate items."
      isDark={isDark}
      whenToUse={[
        'A timeline of system events needs to read top-to-bottom with status colour as the only chrome.',
        'You want a content density that scales — short titles plus longer descriptions read in flow.',
        'Optional inline actions are needed for some events but not all.',
        'Avoid for true tabular data — for sortable rows reach for a table composition instead.',
      ]}
      composition="ActivityFeed = Stack (spacious rhythm) + ActivityItem rows (Stack row + status avatar) + Button (inline action) + Icon (status glyph)"
      examples={[
        {
          title: 'Basic event',
          description:
            'A single event row — neutral status, no action. Title + category + timestamp on the first line, description on the second.',
          source: BASIC_SOURCE,
          preview: <ActivityFeed events={basicEvents} />,
        },
        {
          title: 'Status palette',
          description:
            'success / error / info / warning / neutral each pick up the matching feedback colour for the avatar glyph and the category label.',
          source: STATUS_SOURCE,
          preview: <ActivityFeed events={statusEvents} />,
        },
        {
          title: 'With inline action',
          description:
            'Optional action prop renders an Button (secondary, sm) below the description for events that need a follow-up.',
          source: ACTION_SOURCE,
          preview: <ActivityFeed events={actionEvents} />,
        },
      ]}
      primitives={[
        { label: 'Stack — one-dimensional layout primitive', href: '/components/layout' },
        { label: 'Button — base action primitive', href: '/components/actions' },
        { label: 'Icon — Phosphor icon primitive', href: '/components/display' },
      ]}
    />
  );
}
