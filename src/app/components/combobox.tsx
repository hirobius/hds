/**
 * Combobox — searchable single- or multi-select (Popover + filtered listbox).
 * @category Inputs
 * @tier pattern
 * @usage Pick one value, or several with `multiple`, from a long list of options, with a search field that filters as you type.
 * @whenNot A short list that needs no search, or an action list.
 * @useInstead Select a short list without search
 * @useInstead Menu firing actions from a trigger
 * @keyboard Enter/Space Opens the list from the trigger and moves focus to the search field.
 * @keyboard ArrowDown/ArrowUp Moves the active option and wraps at the ends.
 * @keyboard Character Filters the options to those matching the typed text.
 * @keyboard Enter Commits the active option and closes the list; with `multiple`, toggles it and keeps the list open.
 * @keyboard Escape Closes the list.
 * @keyboard Tab Stays inside the open list.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=82-237
 * @doc-exempt: no Inputs-overlay doc page yet — add demo when created
 *
 * A select-with-search built on the HDS Popover. The trigger shows the current
 * selection (with `multiple`, a count and a removable chip per value); opening
 * reveals a search field that filters the option list.
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
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Popover } from './popover';
import { FORM_CONTROL_WIDTH } from './form-control';

/** @public */
export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Props both arms share; consumers name an arm or `ComboboxAnyProps`. */
interface ComboboxBaseProps {
  /** Selectable options. */
  options: ComboboxOption[];
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

/**
 * Single-select: one value, or none.
 * @public
 */
export interface ComboboxProps extends ComboboxBaseProps {
  /** Leave unset (or false) to pick one value. */
  multiple?: false;
  /** Currently selected value, or null when nothing is chosen. */
  value: string | null;
  /** Fired with the chosen option's value. */
  onChange: (value: string) => void;
}

/**
 * Multi-select (`multiple`): any number of values.
 * @public
 */
export interface ComboboxMultipleProps extends ComboboxBaseProps {
  /** Pick any number of values. */
  multiple: true;
  /** Currently selected values, in the order they were picked. */
  value: readonly string[];
  /** Fired with the next selected values whenever one is added or removed. */
  onChange: (value: string[]) => void;
}

/**
 * Either arm: single-select `ComboboxProps` or `ComboboxMultipleProps`.
 * @public
 */
export type ComboboxAnyProps = ComboboxProps | ComboboxMultipleProps;

/** @public */
export const Combobox = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ComboboxAnyProps>(
  function Combobox(
    {
      options,
      placeholder = 'Select…',
      searchPlaceholder = 'Search…',
      emptyMessage = 'No results',
      'aria-label': ariaLabel,
      id,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      className,
      disabled = false,
      // The arm-specific trio (multiple, value, onChange), still discriminated.
      ...selection
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

    const values: readonly string[] = selection.multiple
      ? selection.value
      : selection.value === null
        ? []
        : [selection.value];
    // Multi-select: one chip per picked value, in the order they were picked.
    const chips = selection.multiple
      ? values.flatMap((v) => options.find((o) => o.value === v) ?? [])
      : [];
    // Trigger text: the chosen label, or with `multiple` a count of the chips.
    const count = chips.length > 0 ? `${chips.length} selected` : undefined;
    const summary = selection.multiple
      ? count
      : options.find((o) => o.value === selection.value)?.label;
    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    // Reset the active row when the query changes (handled in the search field's
    // onChange — no effect needed, keeps activeIndex in range as results narrow).

    function commit(option: ComboboxOption) {
      if (option.disabled) return;
      if (selection.multiple) {
        // Add or remove it; the list stays open so several can be picked.
        selection.onChange(
          values.includes(option.value)
            ? values.filter((v) => v !== option.value)
            : [...values, option.value],
        );
        return;
      }
      selection.onChange(option.value);
      setOpen(false);
      setQuery('');
    }

    // After a chip removes its value, focus goes to the chip that takes its
    // place (or the one before it, or the trigger once none are left) rather
    // than falling to the page.
    const rootRef = React.useRef<HTMLDivElement>(null);
    // The trigger is a Popover.Anchor, not a Popover.Trigger, so Radix has no
    // trigger to hand focus back to: Escape (or a pick) dropped it on <body>.
    // Keep our own ref and return focus there unless the person clicked elsewhere (hds#522).
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const interactedOutside = React.useRef(false);
    const setTriggerRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    const refocus = React.useRef<{ index: number; count: number } | null>(null);
    React.useEffect(() => {
      const pending = refocus.current;
      if (!pending || chips.length === pending.count) return;
      refocus.current = null;
      if (chips.length > pending.count) return;
      const root = rootRef.current;
      const rest = root?.querySelectorAll<HTMLElement>('li button:not(:disabled)') ?? [];
      const next = rest[Math.min(pending.index, rest.length - 1)];
      (next ?? root?.querySelector<HTMLElement>('[role="combobox"]'))?.focus();
    }, [chips.length]);

    function remove(option: ComboboxOption, index: number) {
      if (!selection.multiple) return;
      refocus.current = { index, count: chips.length };
      selection.onChange(values.filter((v) => v !== option.value));
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

    const popover = (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
      >
        <Popover.Anchor asChild>
          <button
            ref={setTriggerRef}
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
              'hds-focus flex h-10 items-center justify-between gap-2 rounded-md border border-input',
              FORM_CONTROL_WIDTH,
              'bg-background px-3 hds-type-ui text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
          >
            <span className={cn('truncate', !summary && 'text-muted-foreground')}>
              {summary || placeholder}
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
          onInteractOutside={() => {
            interactedOutside.current = true;
          }}
          onCloseAutoFocus={(event) => {
            if (!interactedOutside.current) {
              event.preventDefault();
              triggerRef.current?.focus();
            }
            interactedOutside.current = false;
          }}
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
              'hds-focus h-10 w-full border-b border-border bg-transparent px-3 hds-type-ui text-foreground',
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
            aria-multiselectable={selection.multiple || undefined}
            className={cn('max-h-60 overflow-y-auto', filtered.length > 0 && 'p-1')}
          >
            {filtered.map((option, i) => {
              const isSelected = values.includes(option.value);
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
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hds-type-ui outline-none',
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
            <p className="m-1 px-2 py-6 text-center hds-type-ui text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
        </Popover.Content>
      </Popover>
    );

    if (!selection.multiple) return popover;

    // Chips sit beside the trigger, not in it: a button cannot hold buttons.
    return (
      <div ref={rootRef} className={cn('flex flex-col gap-2', FORM_CONTROL_WIDTH)}>
        {popover}
        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {chips.map((option, i) => (
              <li key={option.value}>
                <button
                  type="button"
                  aria-label={`Remove ${option.label}`}
                  disabled={disabled || option.disabled}
                  onClick={() => remove(option, i)}
                  className={cn(
                    'hds-focus inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-muted pl-2 pr-1',
                    'hds-type-caption text-foreground hover:bg-accent hover:text-accent-foreground',
                    'disabled:pointer-events-none disabled:opacity-50',
                  )}
                >
                  {option.label}
                  <Icon icon={X} size="small" color="currentColor" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
);
