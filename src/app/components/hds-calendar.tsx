/**
 * HdsCalendar — month calendar / date picker, HDS-skinned over react-day-picker.
 * @category Inputs
 * @tier primitive
 * @public
 *
 * A thin token-skin over react-day-picker's DayPicker (ADR-020). Passes through
 * every DayPicker prop — `mode` ('single' | 'range' | 'multiple'), `selected`,
 * `onSelect`, `disabled`, `month`, min/max, locale — and applies the HDS role
 * tokens via `classNames` so the grid matches the rest of the system. Correct
 * grid ARIA and keyboard navigation come from the underlying library.
 *
 *   <HdsCalendar mode="single" selected={date} onSelect={setDate} />
 */
// motion-ok: react-day-picker manages month transitions + day focus; classNames are token styling passthroughs.

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type HdsCalendarProps = React.ComponentProps<typeof DayPicker>;

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders an accessible month grid; compose it inside a Popover for the date inputs. */
export function HdsCalendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: HdsCalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-sm font-medium text-foreground',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hds-focus hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hds-focus hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-xs font-medium text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'h-9 w-9 p-0 text-center text-sm',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-md font-medium text-foreground hds-focus hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        range_start: '[&>button]:bg-primary [&>button]:text-primary-foreground',
        range_end: '[&>button]:bg-primary [&>button]:text-primary-foreground',
        range_middle: 'bg-accent [&>button]:bg-transparent [&>button]:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('size-4', chevronClass)} aria-hidden="true" />
          ) : (
            <ChevronRight className={cn('size-4', chevronClass)} aria-hidden="true" />
          ),
      }}
      {...props}
    />
  );
}
