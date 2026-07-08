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
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Stack } from './stack';
import { Button } from './button';
import { Icon } from './icon';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use `ActivityTone` instead — values are renamed to match the
 * fixed HDS tone vocabulary (`neutral | danger | success | warning | info`,
 * see docs/architecture/variant-contract.md). `'error'` remains supported
 * here as a back-compat alias for `'danger'`; new code should use `tone`.
 */
export type ActivityStatus = 'success' | 'error' | 'warning' | 'info' | 'neutral';

/** @public */
export type ActivityTone = 'neutral' | 'danger' | 'success' | 'warning' | 'info';

export interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: string;
  icon: ReactNode;
  /**
   * Semantic tone for this event's icon and category color.
   * `neutral | danger | success | warning | info`. Supersedes `status`.
   */
  tone?: ActivityTone;
  /**
   * @deprecated Use `tone` instead. Retained for back-compat; `'error'`
   * resolves to the `danger` tone.
   */
  status?: ActivityStatus;
  action?: { label: string; onClick?: () => void };
  /** Optional structured metadata rendered between description and action.
   *  Reserved for compact metadata clusters like AgentTag (assignee,
   *  tier, cost). Keeps description as prose; meta is for chips/tags. */
  meta?: ReactNode;
}

export interface ActivityFeedProps {
  events: ActivityEvent[];
}

// ── Tone resolution ────────────────────────────────────────────────────────────
// `tone` wins when present; otherwise fall back to the deprecated `status`
// field, mapping its 'error' value onto 'danger'. Neither present → neutral.

function resolveTone(event: Pick<ActivityEvent, 'tone' | 'status'>): ActivityTone {
  if (event.tone) return event.tone;
  if (event.status === 'error') return 'danger';
  if (event.status) return event.status;
  return 'neutral';
}

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. `tone` drives the icon
// avatar and category text color; the fixed vocabulary matches the removed
// `statusColor` map 1:1, including `info`'s `--semantic-accent-rest` binding
// (deliberately not `--semantic-color-feedback-info`, a different token) and
// `neutral`'s `--semantic-color-content-secondary` binding (which is exactly
// what `text-muted-foreground` resolves to — see tokens.css `--role-muted-foreground`).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- info's accent-rest token has no matching Tailwind-theme utility (text-feedback-info binds to a different var); var()-based so still token-driven
const activityToneVariants = cva('', {
  variants: {
    tone: {
      neutral: 'text-muted-foreground',
      danger: 'text-feedback-danger',
      success: 'text-feedback-success',
      warning: 'text-feedback-warning',
      info: 'text-[var(--semantic-accent-rest)]',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- size-40/radius-full/surface-raised tokens have no matching Tailwind-theme utility; var()-based so still token-driven
const activityAvatarVariants = cva(
  'flex h-[var(--primitive-size-40)] w-[var(--primitive-size-40)] shrink-0 items-center justify-center rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-raised)]',
);

// Typography composites — var()-based, no matching Tailwind-theme utility
// (see code-block.tsx's TECHNICAL_TYPE_CLASSES for the same idiom). These are
// arbitrary CSS *properties* (`[property:value]`), not arbitrary values on a
// known utility, so `tailwindcss/no-arbitrary-value` does not flag them.
const HEADING3_TYPE_CLASSES =
  '[font-family:var(--semantic-typography-h3-font-family)] [font-size:var(--semantic-typography-h3-font-size)] [font-weight:var(--semantic-typography-h3-font-weight)] [letter-spacing:var(--semantic-typography-h3-letter-spacing)] [line-height:var(--semantic-typography-h3-line-height)]';

const BODY_TYPE_CLASSES =
  '[font-family:var(--semantic-typography-body-font-family)] [font-size:var(--semantic-typography-body-font-size)] [font-weight:var(--semantic-typography-body-font-weight)] [letter-spacing:var(--semantic-typography-body-letter-spacing)] [line-height:var(--semantic-typography-body-line-height)] max-w-[var(--semantic-typography-body-max-width)]';

const UI_TYPE_CLASSES =
  '[font-family:var(--semantic-typography-ui-font-family)] [font-size:var(--semantic-typography-ui-font-size)] [font-weight:var(--semantic-typography-ui-font-weight)] [letter-spacing:var(--semantic-typography-ui-letter-spacing)] [line-height:var(--semantic-typography-ui-line-height)] max-w-[var(--semantic-typography-ui-max-width)]';

const TECHNICAL_TYPE_CLASSES =
  '[font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)] [line-height:var(--semantic-typography-mono-line-height)] max-w-[var(--semantic-typography-mono-max-width)]';

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActivityAvatar({ icon, tone }: { icon: ReactNode; tone: ActivityTone }) {
  return (
    <div data-tone={tone} className={cn(activityAvatarVariants(), activityToneVariants({ tone }))}>
      {icon}
    </div>
  );
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  const tone = resolveTone(event);

  return (
    <Stack direction="row" gap="tight" align="start" as="article">
      <ActivityAvatar icon={event.icon} tone={tone} />

      {/* Content block — 16px gap between heading/body/action tiers */}
      <Stack gap="tight" style={{ flex: 1, minWidth: 0 }}>
        {/* Title + timestamp row — 8px gap for the icon/label cluster */}
        <Stack direction="row" gap="gap" align="start" justify="space-between">
          <Stack gap="gap">
            <span className={cn('text-foreground', HEADING3_TYPE_CLASSES)}>{event.title}</span>
            <span className={cn(activityToneVariants({ tone }), UI_TYPE_CLASSES)}>
              {event.category}
            </span>
          </Stack>
          <span
            className={cn(
              'shrink-0 whitespace-nowrap text-muted-foreground',
              TECHNICAL_TYPE_CLASSES,
            )}
          >
            {event.timestamp}
          </span>
        </Stack>

        {/* Description — body, 1.5 line-height from token */}
        <p className={cn('m-0 text-muted-foreground', BODY_TYPE_CLASSES)}>{event.description}</p>

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
    tone: 'neutral',
  },
  {
    id: 'evt-002',
    title: 'Policy Updated',
    description:
      'Access control policy "eng-prod-write" was modified. Three permission groups were added; two removed. Change authored by sys-admin.',
    timestamp: '2026-04-22 · 07:52',
    category: 'Security',
    icon: <Icon icon={ShieldCheck} size="medium" />,
    tone: 'info',
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
    tone: 'danger',
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
    tone: 'success',
  },
  {
    id: 'evt-005',
    title: 'Access Revoked',
    description:
      'SSH access for contractor account "contractor-j.reed" was revoked following project completion. Token invalidated and session terminated.',
    timestamp: '2026-04-21 · 18:41',
    category: 'Security',
    icon: <Icon icon={Lock} size="medium" />,
    tone: 'warning',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function ActivityFeed({ events = defaultActivityEvents }: ActivityFeedProps) {
  return (
    <Stack gap="spacious" as="ol" className="m-0 list-none p-0">
      {events.map((event) => (
        <li key={event.id}>
          <ActivityItem event={event} />
        </li>
      ))}
    </Stack>
  );
}

/** @internal — CVA variant helpers; compose via ActivityFeed/ActivityEvent props instead. */
export { activityToneVariants, activityAvatarVariants };
