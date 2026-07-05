/**
 * HdsDateRangeInput — date-range field composing the existing Popover with
 * HdsCalendar in range mode, so picking a start/end date reads as one overlay
 * pattern with Combobox and Menu rather than a bespoke widget.
 * @category Inputs
 * @tier pattern
 * @public
 *
 * No new primitive — built entirely on the HDS Popover + HdsCalendar. The
 * trigger reads like a secondary input, showing a placeholder or the
 * formatted `from – to` range; the content is a two-month range calendar.
 *
 *   <HdsDateRangeInput value={range} onChange={setRange} />
 */
// motion-ok: Popover owns overlay motion; the calendar is a token-skinned passthrough.

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Popover } from './popover';
import { HdsCalendar } from './hds-calendar';

/** @public */
export interface HdsDateRangeInputProps {
  /** Currently selected range. */
  value?: DateRange;
  /** Fired with the next range whenever the calendar selection changes. */
  onChange?: (range: DateRange | undefined) => void;
  /** date-fns format string used to render the selected range on the trigger. */
  displayFormat?: string;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  /** Number of months rendered side by side in the calendar. */
  numberOfMonths?: number;
  id?: string;
  'aria-label'?: string;
}

/** @public */
export const HdsDateRangeInput = React.forwardRef<HTMLButtonElement, HdsDateRangeInputProps>(
  function HdsDateRangeInput(
    {
      value,
      onChange,
      displayFormat = 'yyyy-MM-dd',
      placeholder = 'Select date range',
      disabled = false,
      numberOfMonths = 2,
      id,
      'aria-label': ariaLabel,
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);

    const label = value?.from
      ? `${format(value.from, displayFormat)}${value.to ? ` – ${format(value.to, displayFormat)}` : ''}`
      : null;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              'inline-flex items-center gap-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-left transition-colors hds-focus disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className={cn('truncate', !label && 'text-muted-foreground')}>
              {label ?? placeholder}
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Content align="start" className="w-auto p-0">
          <HdsCalendar
            mode="range"
            numberOfMonths={numberOfMonths}
            selected={value}
            onSelect={(range) => onChange?.(range)}
            defaultMonth={value?.from}
          />
        </Popover.Content>
      </Popover>
    );
  },
);
