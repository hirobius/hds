/**
 * MultiSelector — multi-select dropdown composing the existing Popover with
 * a checkbox option list, so choosing several values from a fixed set reads
 * as one overlay pattern with Combobox and Menu rather than a bespoke widget.
 * @category Inputs
 * @tier pattern
 * @public
 *
 * No new dependency — built entirely on the HDS Popover. The trigger reads
 * like a secondary Button, showing a placeholder or a `${n} selected` count;
 * the content is a token-skinned list where each row is a checkbox toggling
 * membership in `value`.
 *
 *   <MultiSelector
 *     options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]}
 *     value={fruits}
 *     onChange={setFruits}
 *   />
 */
// motion-ok: open/close motion is owned by the underlying Popover (Radix); rows
// use token color transitions via utility classes only, no motion of their own.

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Popover } from './popover';

/** @public */
export interface MultiSelectorOption {
  value: string;
  label: string;
}

/** @public */
export interface MultiSelectorProps {
  /** Selectable options. */
  options: MultiSelectorOption[];
  /** Currently selected values. */
  value: string[];
  /** Fired with the next selected-values array whenever an option is toggled. */
  onChange: (next: string[]) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const ITEM =
  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hds-focus hover:bg-accent hover:text-accent-foreground focus-within:bg-accent focus-within:text-accent-foreground';

/** @public */
export const MultiSelector = React.forwardRef<HTMLButtonElement, MultiSelectorProps>(
  function MultiSelector(
    { options, value, onChange, placeholder = 'Select…', disabled = false, className },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);
    const baseId = React.useId();

    function toggle(optionValue: string) {
      const next = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(next);
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            className={cn(
              'hds-focus inline-flex h-10 items-center justify-between gap-2 rounded-md border border-input',
              'bg-background px-3 text-sm text-foreground hover:bg-accent hover:border-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              className,
            )}
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {value.length === 0 ? placeholder : `${value.length} selected`}
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Content align="start" className="w-64 p-1">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => {
              const checked = value.includes(option.value);
              const inputId = `${baseId}-${option.value}`;
              return (
                <label key={option.value} htmlFor={inputId} className={ITEM}>
                  <span className="pointer-events-none absolute left-2 inline-flex items-center justify-center">
                    {checked ? (
                      <Icon icon={Check} size={14} color="currentColor" aria-hidden />
                    ) : null}
                  </span>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(option.value)}
                    className="sr-only"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              );
            })}
          </div>
        </Popover.Content>
      </Popover>
    );
  },
);
