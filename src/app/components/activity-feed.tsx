// motion-ok: structural feed list — clicks delegate to parent, no per-item motion
/**
 * ActivityFeed — chronological system event log.
 * @category Display
 * @tier pattern
 * @doc-exempt: internal portfolio and systems timeline pattern; no standalone component doc page
 *
 * Renders a list of activity events using white space as the sole separator.
 * No dividers, no borders between items. 48px gap (space.12) creates the
 * visual grouping between events; 16px gap inside each item structures the
 * content hierarchy.
 *
 * Typography mapping:
 *   title       → heading3  (24px/1.25)
 *   description → body      (16px/1.5)
 *   timestamp   → technical (12px/1.0 mono)
 *   category    → ui        (14px/1.5)
 */

import type { ReactNode } from 'react';
import {
  Upload as UploadSimple,
  ShieldCheck,
  CircleX as XCircle,
  Rocket,
  Lock,
} from 'lucide-react';
import hds from '../design-system/tokens';
import { Stack } from './stack';
import { Button } from './button';
import { Icon } from './icon';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type ActivityStatus = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: string;
  icon: ReactNode;
  status: ActivityStatus;
  action?: { label: string; onClick?: () => void };
  /** Optional structured metadata rendered between description and action.
   *  Reserved for compact metadata clusters like AgentTag (assignee,
   *  tier, cost). Keeps description as prose; meta is for chips/tags. */
  meta?: ReactNode;
}

export interface ActivityFeedProps {
  events: ActivityEvent[];
}

// ── Status palette ─────────────────────────────────────────────────────────────

const statusColor: Record<ActivityStatus, string> = {
  success: 'var(--semantic-color-feedback-success)',
  error: 'var(--semantic-color-feedback-error)',
  warning: 'var(--semantic-color-feedback-warning)',
  info: 'var(--semantic-accent-rest)',
  neutral: 'var(--semantic-color-content-secondary)',
};

const activityAvatarStyle = {
  width: hds.size[40],
  height: hds.size[40],
  borderRadius: hds.borderRadius.full,
  backgroundColor: 'var(--semantic-color-surface-raised)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const;

const activityFeedListStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActivityAvatar({ icon, status }: { icon: ReactNode; status: ActivityStatus }) {
  return (
    <div
      style={{
        ...activityAvatarStyle,
        color: statusColor[status],
      }}
    >
      {icon}
    </div>
  );
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <Stack direction="row" gap="tight" align="start" as="article">
      <ActivityAvatar icon={event.icon} status={event.status} />

      {/* Content block — 16px gap between heading/body/action tiers */}
      <Stack gap="tight" style={{ flex: 1, minWidth: 0 }}>
        {/* Title + timestamp row — 8px gap for the icon/label cluster */}
        <Stack direction="row" gap="gap" align="start" justify="space-between">
          <Stack gap="gap">
            <span
              style={{ ...hds.typeStyles.heading3, color: 'var(--semantic-color-content-primary)' }}
            >
              {event.title}
            </span>
            <span style={{ ...hds.typeStyles.ui, color: statusColor[event.status] }}>
              {event.category}
            </span>
          </Stack>
          <span
            style={{
              ...hds.typeStyles.technical,
              color: 'var(--semantic-color-content-secondary)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {event.timestamp}
          </span>
        </Stack>

        {/* Description — body, 1.5 line-height from token */}
        <p
          style={{
            ...hds.typeStyles.body,
            color: 'var(--semantic-color-content-secondary)',
            margin: 0,
          }}
        >
          {event.description}
        </p>

        {/* Optional metadata cluster (AgentTag, etc.) — rendered between
            description and action so it stays adjacent to its event context. */}
        {event.meta && <div>{event.meta}</div>}

        {/* Optional action */}
        {event.action && (
          <div>
            <Button variant="secondary" size="sm" onClick={event.action.onClick}>
              {event.action.label}
            </Button>
          </div>
        )}
      </Stack>
    </Stack>
  );
}

// ── Default demo events ────────────────────────────────────────────────────────

/** @internal — demo placeholder data; supply your own ActivityEvent[] via the events prop. */
export const defaultActivityEvents: ActivityEvent[] = [
  {
    id: 'evt-001',
    title: 'File Uploaded',
    description:
      'firmware-v2.4.1.bin was uploaded to the staging environment by adrianm. File size 4.2 MB. Integrity check passed.',
    timestamp: '2026-04-22 · 08:14',
    category: 'Storage',
    icon: <Icon icon={UploadSimple} size="medium" />,
    status: 'neutral',
  },
  {
    id: 'evt-002',
    title: 'Policy Updated',
    description:
      'Access control policy "eng-prod-write" was modified. Three permission groups were added; two removed. Change authored by sys-admin.',
    timestamp: '2026-04-22 · 07:52',
    category: 'Security',
    icon: <Icon icon={ShieldCheck} size="medium" />,
    status: 'info',
    action: { label: 'View Details' },
  },
  {
    id: 'evt-003',
    title: 'Deployment Failed',
    description:
      'Release candidate rc-1.9.0 failed to deploy to production. Build step "lint:tokens" exited with code 1. Rollback triggered automatically.',
    timestamp: '2026-04-22 · 06:30',
    category: 'CI/CD',
    icon: <Icon icon={XCircle} size="medium" />,
    status: 'error',
    action: { label: 'View Details' },
  },
  {
    id: 'evt-004',
    title: 'Service Deployed',
    description:
      'API gateway v3.1.2 successfully promoted to production. Zero-downtime rollout completed across all three availability zones.',
    timestamp: '2026-04-21 · 23:05',
    category: 'CI/CD',
    icon: <Icon icon={Rocket} size="medium" />,
    status: 'success',
  },
  {
    id: 'evt-005',
    title: 'Access Revoked',
    description:
      'SSH access for contractor account "contractor-j.reed" was revoked following project completion. Token invalidated and session terminated.',
    timestamp: '2026-04-21 · 18:41',
    category: 'Security',
    icon: <Icon icon={Lock} size="medium" />,
    status: 'warning',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function ActivityFeed({ events = defaultActivityEvents }: ActivityFeedProps) {
  return (
    <Stack gap="spacious" as="ol" style={activityFeedListStyle}>
      {events.map((event) => (
        <li key={event.id}>
          <ActivityItem event={event} />
        </li>
      ))}
    </Stack>
  );
}
