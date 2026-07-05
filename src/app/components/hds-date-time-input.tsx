/**
 * HdsDateTimeInput — combined date + time field pairing a text date input with
 * a calendar popover and a native time field, so picking a moment in time
 * reads as one control instead of two disconnected inputs glued together by
 * a consuming app.
 * @category Inputs
 * @tier pattern
 * @public
 *
 * Composes the HDS Popover (trigger = calendar icon button) with HdsCalendar
 * for the date grid, and HdsTimeInput for the time-of-day, keeping both parts
 * in sync with a single `Date` value via date-fns.
 *
 *   <HdsDateTimeInput value={date} onChange={setDate} />
 */
// motion-ok: Popover owns overlay motion; calendar + native time control are token-skinned passthroughs.

import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HdsCalendar } from './hds-calendar';
import { HdsTimeInput } from './hds-time-input';
import { Popover } from './popover';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface HdsDateTimeInputProps {
  /** Currently selected date + time, or undefined when empty. */
  value?: Date;
  /** Fired with the next combined date/time, or undefined when cleared. */
  onChange?: (date: Date | undefined) => void;
  /** date-fns format string used to display and parse the date portion. */
  dateFormat?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Combine a calendar day with an `HH:mm` time string into one Date. */
function combine(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  const next = new Date(day);
  next.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return next;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Text date field + calendar popover, paired with a native time field, producing one Date. */
export const HdsDateTimeInput = React.forwardRef<HTMLInputElement, HdsDateTimeInputProps>(
  function HdsDateTimeInput(
    { value, onChange, dateFormat = 'yyyy-MM-dd', disabled = false, id, 'aria-label': ariaLabel },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);
    const [dateText, setDateText] = React.useState(() => (value ? format(value, dateFormat) : ''));
    // Held until a date exists so a time-only edit doesn't fire onChange prematurely.
    const [timeText, setTimeText] = React.useState(() => (value ? format(value, 'HH:mm') : ''));

    React.useEffect(() => {
      setDateText(value ? format(value, dateFormat) : '');
      setTimeText(value ? format(value, 'HH:mm') : '');
    }, [value, dateFormat]);

    function commit(day: Date | undefined, time: string) {
      if (!day) {
        onChange?.(undefined);
        return;
      }
      // A date without a time defaults to 00:00 rather than withholding onChange.
      onChange?.(combine(day, time || '00:00'));
    }

    function handleDatePick(day: Date | undefined) {
      commit(day, timeText);
      setOpen(false);
    }

    function handleDateTextBlur() {
      if (dateText === '') {
        onChange?.(undefined);
        return;
      }
      const parsed = parse(dateText, dateFormat, new Date());
      if (isValid(parsed)) {
        commit(parsed, timeText);
      }
    }

    function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
      const next = event.target.value;
      setTimeText(next);
      if (value) {
        commit(value, next);
      }
    }

    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3',
            'transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
            disabled && 'cursor-not-allowed opacity-70',
          )}
        >
          <input
            ref={ref}
            id={id}
            aria-label={ariaLabel}
            type="text"
            value={dateText}
            placeholder={dateFormat.toLowerCase()}
            disabled={disabled}
            onChange={(event) => setDateText(event.target.value)}
            onBlur={handleDateTextBlur}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />

          <Popover open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label="Open calendar"
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground hds-focus disabled:pointer-events-none disabled:opacity-50"
              >
                <Calendar className="size-4" aria-hidden="true" />
              </button>
            </Popover.Trigger>
            <Popover.Content align="start" className="w-auto p-0">
              <HdsCalendar
                mode="single"
                selected={value}
                defaultMonth={value}
                onSelect={handleDatePick}
              />
            </Popover.Content>
          </Popover>
        </div>

        <HdsTimeInput
          aria-label={ariaLabel ? `${ariaLabel} time` : 'Time'}
          value={timeText}
          disabled={disabled}
          onChange={handleTimeChange}
        />
      </div>
    );
  },
);
