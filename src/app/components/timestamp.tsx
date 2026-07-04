/**
 * Timestamp — renders a date/time as a semantic <time> element.
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Coerce the accepted `date` inputs into a Date. */
function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

const REL_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

/** Format `target` relative to `now` picking the largest sensible unit. */
function formatRelative(target: Date, now: Date, locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const deltaSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(deltaSeconds);
  for (const [unit, secondsPerUnit] of REL_UNITS) {
    if (abs >= secondsPerUnit || unit === 'second') {
      return rtf.format(Math.round(deltaSeconds / secondsPerUnit), unit);
    }
  }
  return rtf.format(0, 'second');
}

const ABSOLUTE_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  time: { timeStyle: 'short' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
};

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type TimestampFormat = 'date' | 'time' | 'datetime' | 'relative';

/** @public */
export interface TimestampProps extends Omit<
  React.TimeHTMLAttributes<HTMLTimeElement>,
  'children'
> {
  /** The moment to render — a Date, epoch millis, or an ISO string. */
  date: Date | string | number;
  /** How to present it. Defaults to `datetime`. */
  format?: TimestampFormat;
  /** BCP-47 locale override; defaults to the runtime locale. */
  locale?: string;
  /**
   * Reference point for `relative` formatting. Defaults to the current time;
   * pass an explicit value for deterministic rendering/tests.
   */
  now?: Date | string | number;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Presents a date/time with a machine-readable `dateTime` for accessibility. */
export const Timestamp = React.forwardRef<HTMLTimeElement, TimestampProps>(function Timestamp(
  { className, date, format = 'datetime', locale, now, ...props },
  ref,
) {
  const target = toDate(date);
  const iso = Number.isNaN(target.getTime()) ? undefined : target.toISOString();

  let text: string;
  if (Number.isNaN(target.getTime())) {
    text = '';
  } else if (format === 'relative') {
    text = formatRelative(target, now != null ? toDate(now) : new Date(), locale);
  } else {
    text = new Intl.DateTimeFormat(locale, ABSOLUTE_OPTIONS[format]).format(target);
  }

  return (
    <time
      ref={ref}
      dateTime={iso}
      data-format={format}
      className={cn('tabular-nums', className)}
      {...props}
    >
      {text}
    </time>
  );
});
