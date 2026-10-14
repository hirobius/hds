/**
 * Timeline - dated events grouped by day along a vertical rail.
 * @category Display
 * @tier pattern
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Disclosure } from './disclosure';
import { Icon } from './icon';
import { Stack } from './stack';
import { Text } from './text';
import { Timestamp } from './timestamp';

/** @public */
export type TimelineTone = 'success' | 'danger' | 'warning' | 'info';

// Marker colour is `currentColor`; the tone only sets `text-*`. Danger reads the
// `error` feedback token, matching Alert.
const TONE_CLASS: Record<TimelineTone | 'neutral', string> = {
  success: 'text-[var(--semantic-color-feedback-success)]',
  danger: 'text-[var(--semantic-color-feedback-error)]',
  warning: 'text-[var(--semantic-color-feedback-warning)]',
  info: 'text-[var(--semantic-color-feedback-info)]',
  neutral: 'text-muted-foreground',
};

// ── TimelineItem ───────────────────────────────────────────────────────────────

/** @public */
export interface TimelineItemProps {
  /** When it happened: a Date, epoch millis, or an ISO string. Drives grouping and order. */
  date: Date | string | number;
  /** Short summary of the event. */
  title: React.ReactNode;
  /** Optional Lucide glyph drawn in the marker; without one the marker is a dot. */
  icon?: LucideIcon;
  /** Optional feedback tone for the marker. Omit for neutral. */
  tone?: TimelineTone;
  /** Detail revealed by expanding the item. Omit it and the item is not expandable. */
  children?: React.ReactNode;
  /** Whether the detail starts expanded. */
  defaultOpen?: boolean;
  /** BCP-47 locale for the time; Timeline fills this in. */
  locale?: string;
}

/** One event on a Timeline. Render it only as a child of Timeline. */
export const TimelineItem = /* @__PURE__ */ React.forwardRef<HTMLLIElement, TimelineItemProps>(
  function TimelineItem({ date, title, icon, tone, children, defaultOpen, locale }, ref) {
    const hasDetail = children != null && children !== false;
    return (
      <li ref={ref} className="group/item m-0 list-none p-0">
        <Stack direction="row" gap="normal" align="stretch">
          <Stack gap="xs" align="center" className="shrink-0">
            <span
              data-timeline-marker=""
              data-tone={tone ?? 'neutral'}
              className={cn(
                'inline-grid size-[var(--hds-icon-small)] place-items-center',
                TONE_CLASS[tone ?? 'neutral'],
              )}
            >
              {icon ? (
                <Icon icon={icon} size="small" color="currentColor" />
              ) : (
                <span aria-hidden="true" className="size-2 rounded-full bg-current" />
              )}
            </span>
            <span aria-hidden="true" className="w-px flex-1 bg-border group-last/item:hidden" />
          </Stack>
          <Stack gap="xs" className="min-w-0 flex-1">
            <Text variant="caption" as="span" className="text-muted-foreground">
              <Timestamp date={date} format="time" locale={locale} />
            </Text>
            {hasDetail ? (
              <Disclosure
                variant="nav"
                label={
                  <Text variant="ui" as="span">
                    {title}
                  </Text>
                }
                defaultOpen={defaultOpen}
              >
                <Text variant="body" as="div">
                  {children}
                </Text>
              </Disclosure>
            ) : (
              <Text variant="ui" as="span">
                {title}
              </Text>
            )}
          </Stack>
        </Stack>
      </li>
    );
  },
);

// ── Timeline ───────────────────────────────────────────────────────────────────

/** @public */
export interface TimelineProps {
  /** TimelineItem elements, in any order. */
  children: React.ReactNode;
  /** `desc` lists the newest day and event first (default); `asc` the oldest. */
  order?: 'asc' | 'desc';
  /** BCP-47 locale for day headings and times; defaults to the runtime locale. */
  locale?: string;
  /** Names the list for assistive tech. */
  'aria-label'?: string;
  /** Escape hatch for layout. */
  className?: string;
}

type ItemElement = React.ReactElement<TimelineItemProps>;

/** Local calendar day, used only to bucket items. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Groups TimelineItem children by calendar day and sorts days and items
 * chronologically. Items with an unparseable date are dropped.
 */
function groupByDay(children: React.ReactNode, order: 'asc' | 'desc') {
  const sign = order === 'asc' ? 1 : -1;
  const entries = React.Children.toArray(children)
    .filter((c): c is ItemElement => React.isValidElement<TimelineItemProps>(c))
    .map((el) => ({ el, time: new Date(el.props.date) }))
    .filter(({ time }) => !Number.isNaN(time.getTime()))
    .sort((a, b) => sign * (a.time.getTime() - b.time.getTime()));

  const days = new Map<string, { time: Date; items: ItemElement[] }>();
  for (const { el, time } of entries) {
    const key = dayKey(time);
    const day = days.get(key) ?? { time, items: [] };
    day.items.push(el);
    days.set(key, day);
  }
  return [...days.entries()].map(([key, day]) => ({ key, ...day }));
}

/**
 * The timeline itself. Tagged here rather than in the file block because
 * TimelineItem shares this module and is only ever rendered inside it.
 * @usage Show a dated history of events, such as shipped releases or client activity, grouped under day headings.
 * @whenNot A list with no dates, or steps someone completes in order.
 * @useInstead MetadataList term and value pairs about one object
 * @useInstead StatusListItem a status list with no time axis
 * @ai-rules Pass TimelineItem children with a `date`; Timeline groups and sorts them, so never pre-group or add your own day headings. Put optional detail in the item's children, not in `title`. Tone takes feedback tones only.
 */
export const Timeline = /* @__PURE__ */ React.forwardRef<HTMLOListElement, TimelineProps>(
  function Timeline({ children, order = 'desc', locale, className, ...rest }, ref) {
    const days = groupByDay(children, order);
    return (
      <ol
        ref={ref}
        aria-label={rest['aria-label']}
        data-hds-component="Timeline"
        className={cn(
          'm-0 flex list-none flex-col gap-[var(--semantic-space-scale-lg)] p-0',
          className,
        )}
      >
        {days.map((day) => (
          <li key={day.key} className="m-0 list-none p-0">
            <Stack gap="normal">
              <Text variant="ui" as="h3" className="text-muted-foreground">
                <Timestamp date={day.time} format="date" locale={locale} />
              </Text>
              <Stack as="ol" gap="tight" className="m-0 list-none p-0">
                {day.items.map((item, i) =>
                  React.cloneElement(item, {
                    key: item.key ?? i,
                    locale: item.props.locale ?? locale,
                  }),
                )}
              </Stack>
            </Stack>
          </li>
        ))}
      </ol>
    );
  },
);
