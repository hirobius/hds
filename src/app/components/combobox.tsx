/**
 * Combobox — searchable single-select (Popover + filtered listbox).
 * @category Inputs
 * @tier pattern
 * @usage Pick one value from a long list of options, with a search field that filters as you type.
 * @whenNot A short list that needs no search, or an action list.
 * @useInstead Select a short list without search
 * @useInstead Menu firing actions from a trigger
 * @keyboard Enter/Space Opens the list from the trigger and moves focus to the search field.
 * @keyboard ArrowDown/ArrowUp Moves the active option and wraps at the ends.
 * @keyboard Character Filters the options to those matching the typed text.
 * @keyboard Enter Commits the active option and closes the list.
 * @keyboard Escape Closes the list.
 * @keyboard Tab Stays inside the open list.
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-237
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
  /**
   * Id of the trigger, so a `<label for>` names it. `FormField` sets it, with
   * `aria-describedby` and `aria-invalid`.
   */
  id?: string;
  /** Ids of the elements that describe the trigger (helper text, error). */
  'aria-describedby'?: string;
  /** Marks the trigger invalid, for example while the field shows an error. */
  'aria-invalid'?: boolean;
  className?: string;
  disabled?: boolean;
}

/** @public */
export const Combobox = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ComboboxProps>(
  function Combobox(
    {
      options,
      value,
      onChange,
      placeholder = 'Select…',
      searchPlaceholder = 'Search…',
      emptyMessage = 'No results',
      'aria-label': ariaLabel,
      id,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
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
    // Names the open popover and the listbox inside it (hds#399): the field
    // label, or the placeholder when the field has none or it is empty (hds#408).
    const popupName = ariaLabel || placeholder;

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

    const activeOptionId = filtered[activeIndex]
      ? `${baseId}-opt-${filtered[activeIndex].value}`
      : undefined;

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
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={open ? listId : undefined}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
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
            <Icon
              icon={ChevronsUpDown}
              size="small"
              color="var(--semantic-color-content-secondary)"
              aria-hidden
            />
          </button>
        </Popover.Anchor>

        <Popover.Content
          aria-label={popupName}
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
          {/* Each <li> is role="none": the listbox, not a list item, is the
              accessibility-tree parent of every option, so options carry their
              real position and set size (hds#407). */}
          <ul
            id={listId}
            role="listbox"
            aria-label={popupName}
            className={cn('max-h-60 overflow-y-auto', filtered.length > 0 && 'p-1')}
          >
            {filtered.map((option, i) => {
              const isSelected = option.value === value;
              const isActive = i === activeIndex;
              return (
                <li key={option.value} role="none">
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
                      'data-[active=true]:ring-2 data-[active=true]:ring-inset data-[active=true]:ring-ring',
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
            })}
          </ul>
          {/* Beside the listbox, not in it: a listbox holding text but no
              option fails axe aria-required-children (hds#407). m-1 stands in
              for the empty listbox's padding, so the box is unchanged. */}
          {filtered.length === 0 ? (
            <p className="m-1 px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
        </Popover.Content>
      </Popover>
    );
  },
);
