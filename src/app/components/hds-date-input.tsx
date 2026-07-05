/**
 * HdsDateInput — single-date text field with a calendar popover picker, so
 * typing a date and picking one from a grid read as one input rather than
 * two disconnected controls glued together by a consuming app.
 * @category Inputs
 * @tier pattern
 * @public
 *
 * Composes the HDS Popover (trigger = calendar icon button) with HdsCalendar
 * for the grid, and date-fns for parse/format of the free-typed text. The
 * text field and the picker stay in sync in both directions.
 *
 *   <HdsDateInput value={date} onChange={setDate} />
 */
// motion-ok: Popover owns overlay motion; the calendar is a token-skinned passthrough.

import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HdsCalendar } from './hds-calendar';
import { Popover } from './popover';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface HdsDateInputProps {
  /** Currently selected date, or undefined when empty. */
  value?: Date;
  /** Fired with the next date, or undefined when the field is cleared/invalid. */
  onChange?: (date: Date | undefined) => void;
  /** date-fns format string used to display and parse the text value. */
  displayFormat?: string;
  /** Placeholder shown when the field is empty; defaults to the display format. */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Text field + calendar popover for picking a single date. */
export const HdsDateInput = React.forwardRef<HTMLInputElement, HdsDateInputProps>(
  function HdsDateInput(
    {
      value,
      onChange,
      displayFormat = 'yyyy-MM-dd',
      placeholder,
      disabled = false,
      id,
      'aria-label': ariaLabel,
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState(() => (value ? format(value, displayFormat) : ''));

    React.useEffect(() => {
      setText(value ? format(value, displayFormat) : '');
    }, [value, displayFormat]);

    function handleBlur() {
      if (text === '') {
        onChange?.(undefined);
        return;
      }
      const parsed = parse(text, displayFormat, new Date());
      if (isValid(parsed)) {
        onChange?.(parsed);
      }
    }

    return (
      <div
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3',
          'transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
          disabled && 'cursor-not-allowed opacity-70',
        )}
      >
        <input
          ref={ref}
          id={id}
          aria-label={ariaLabel}
          type="text"
          value={text}
          placeholder={placeholder ?? displayFormat.toLowerCase()}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onBlur={handleBlur}
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
              onSelect={(date) => {
                onChange?.(date);
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover>
      </div>
    );
  },
);
