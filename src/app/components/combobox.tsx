/**
 * Combobox — searchable single-select (Popover + filtered listbox).
 * @category Inputs
 * @tier pattern
 * @doc-exempt: no Inputs-overlay doc page yet — add demo when created
 *
 * A select-with-search built on the HDS Popover. The trigger shows the current
 * selection; opening reveals a search field that filters the option list.
 * Full keyboard support (↑/↓ to move, Enter to choose, Esc/outside-click to
 * close) and listbox/option ARIA. Controlled via `value` + `onChange`.
 *
 *   <Combobox
 *     options={[{ value: 'us', label: 'United States' }, …]}
 *     value={country}
 *     onChange={setCountry}
 *     placeholder="Select a country"
 *   />
 */
// motion-ok: open/close motion is owned by the underlying Popover (Radix); the
// trigger and options use token color transitions via their utility classes.

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Popover } from './popover';

/** @public */
export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** @public */
export interface ComboboxProps {
  /** Selectable options. */
  options: ComboboxOption[];
  /** Currently selected value, or null when nothing is chosen. */
  value: string | null;
  /** Fired with the chosen option's value. */
  onChange: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Placeholder for the search field. */
  searchPlaceholder?: string;
  /** Shown when the filter matches no options. */
  emptyMessage?: string;
  /** Accessible label for the trigger (when not labelled by a <Field>). */
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
}

/** @public */
export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
  {
    options,
    value,
    onChange,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    emptyMessage = 'No results',
    'aria-label': ariaLabel,
    className,
    disabled = false,
  },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const baseId = React.useId();
  const listId = `${baseId}-list`;

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Reset the active row when the query changes (handled in the search field's
  // onChange — no effect needed, keeps activeIndex in range as results narrow).

  function commit(option: ComboboxOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filtered[activeIndex];
      if (option) commit(option);
    }
  }

  const activeOptionId = filtered[activeIndex] ? `${baseId}-opt-${filtered[activeIndex].value}` : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <Popover.Anchor asChild>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'hds-focus flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input',
            'bg-background px-3 text-sm text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <Icon icon={ChevronsUpDown} size="small" color="var(--semantic-color-content-secondary)" aria-hidden />
        </button>
      </Popover.Anchor>

      <Popover.Content
        align="start"
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <input
          type="text"
          value={query}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- combobox search field is the expected focus target on open
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          className={cn(
            'hds-focus h-10 w-full border-b border-border bg-transparent px-3 text-sm text-foreground',
            'outline-none placeholder:text-muted-foreground',
          )}
        />
        <ul id={listId} role="listbox" aria-label={ariaLabel ?? placeholder} className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</li>
          ) : (
            filtered.map((option, i) => {
              const isSelected = option.value === value;
              const isActive = i === activeIndex;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    id={`${baseId}-opt-${option.value}`}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive ? 'true' : undefined}
                    disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(option)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                      'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
                      'disabled:pointer-events-none disabled:opacity-50',
                    )}
                  >
                    <span className="flex size-4 items-center justify-center">
                      {isSelected ? (
                        <Icon icon={Check} size="small" color="currentColor" aria-hidden />
                      ) : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </Popover.Content>
    </Popover>
  );
});
