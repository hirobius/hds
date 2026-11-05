/**
 * CreatableCombobox — the chip-input arm of Combobox (`multiple creatable`).
 * Internal: consumers reach it through `<Combobox multiple creatable>`.
 *
 * The field is the combobox: removable chips sit inline before a text input, the
 * suggestions open in a Popover under the field while the input keeps focus, and
 * Enter adds the typed text through `onCreate`.
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ACTIVE_OPTION_CLASS } from './listbox-nav';
import { Icon } from './icon';
import { Popover } from './popover';
import { FORM_CONTROL_WIDTH } from './form-control';
import type { ComboboxOption } from './combobox';
import {
  ListboxFooter,
  OptionCheck,
  outsideTarget,
  resultCount,
  useComboboxList,
  useForwardedRef,
  useScrollActiveIntoView,
} from './combobox-list';

interface CreatableComboboxProps {
  options: ComboboxOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  onCreate: (text: string) => void;
  placeholder: string;
  emptyMessage: string;
  ariaLabel?: string;
  id?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  className?: string;
  disabled: boolean;
}

/** A row in the list: a real option, or the "Add “text”" row for free text. */
type Row = { kind: 'option'; option: ComboboxOption } | { kind: 'create'; text: string };

function nextEnabled(rows: readonly Row[], from: number, dir: 1 | -1): number {
  const n = rows.length;
  // From "nothing highlighted" ArrowDown lands on the first row, ArrowUp on the last.
  if (from === -1) from = dir === 1 ? -1 : 0;
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    const row = rows[i];
    if (row.kind === 'create' || !row.option.disabled) return i;
  }
  return from;
}

export const CreatableCombobox = /* @__PURE__ */ React.forwardRef<
  HTMLInputElement,
  CreatableComboboxProps
>(function CreatableCombobox(
  {
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    emptyMessage,
    ariaLabel,
    id,
    ariaDescribedBy,
    ariaInvalid,
    className,
    disabled,
  },
  forwardedRef,
) {
  const {
    open,
    setOpen,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    listId,
    optionId: rowId,
    moveActive,
    scrollActiveIntoView,
  } = useComboboxList();
  const [inputRef, setInputRef] = useForwardedRef(forwardedRef);
  const popupName = ariaLabel || placeholder;

  // A created value has no option; its chip reads as the value itself.
  const chips: ComboboxOption[] = value.map(
    (v) => options.find((o) => o.value === v) ?? { value: v, label: v },
  );

  const text = query.trim();
  const rows = React.useMemo<Row[]>(() => {
    const q = text.toLowerCase();
    const matches = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    const list: Row[] = matches.map((option) => ({ kind: 'option', option }));
    // Offer to create only text that is not already an option or a chip.
    const known =
      options.some((o) => o.label.toLowerCase() === q) || value.some((v) => v.toLowerCase() === q);
    if (q && !known) list.push({ kind: 'create', text });
    return list;
  }, [options, text, value]);
  const suggestionCount = rows.filter((r) => r.kind === 'option').length;
  const addRow = rows.find((r) => r.kind === 'create');

  // Typed text wins Enter: an exact (case-insensitive) match first, else the Add
  // row, else the first selectable suggestion. With an empty field nothing is
  // highlighted until an arrow key, so a stray Enter cannot toggle a chip.
  // Adjusted during render, as Combobox does for its list.
  const rowsKey = `${open}|${rows
    .map((r) =>
      r.kind === 'create' ? `+${r.text}` : `${r.option.value}:${r.option.disabled ? 1 : 0}`,
    )
    .join('\u0000')}`;
  const [prevRowsKey, setPrevRowsKey] = React.useState(rowsKey);
  if (prevRowsKey !== rowsKey) {
    setPrevRowsKey(rowsKey);
    const q = text.toLowerCase();
    const exact = rows.findIndex(
      (r) => r.kind === 'option' && !r.option.disabled && r.option.label.toLowerCase() === q,
    );
    const create = rows.findIndex((r) => r.kind === 'create');
    const first = rows.findIndex((r) => r.kind === 'option' && !r.option.disabled);
    setActiveIndex(
      !q ? -1 : exact !== -1 ? exact : create !== -1 ? create : first === -1 ? -1 : first,
    );
  }

  const activeId = open && rows[activeIndex] ? rowId(activeIndex) : undefined;
  useScrollActiveIntoView(scrollActiveIntoView, activeId);

  function commit(row: Row | undefined) {
    if (!row) return;
    if (row.kind === 'create') {
      onCreate(row.text);
    } else if (!row.option.disabled) {
      onChange(
        value.includes(row.option.value)
          ? value.filter((v) => v !== row.option.value)
          : [...value, row.option.value],
      );
    } else {
      return;
    }
    setQuery('');
    inputRef.current?.focus();
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (rows.length === 0) return;
      moveActive(nextEnabled(rows, activeIndex, e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Closed (after Escape) with text typed, Enter still adds it.
      commit(rows[activeIndex]);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === 'Backspace' && query === '' && chips.length > 0) {
      const last = chips[chips.length - 1];
      if (!last.disabled) onChange(value.slice(0, -1));
    }
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div // eslint-disable-line jsx-a11y/no-noninteractive-element-interactions -- pointer convenience; the input is the keyboard target
          role="group"
          aria-label={popupName}
          data-invalid={ariaInvalid || undefined}
          // Clicking the padding or a chip's gutter lands the caret in the input; the input is the keyboard target.
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !disabled) {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
          className={cn(
            'flex min-h-10 flex-wrap items-center gap-fixed-2xs rounded-md border bg-background px-scale-xs py-fixed-2xs',
            'focus-within:ring-2 focus-within:ring-ring',
            ariaInvalid ? 'border-destructive' : 'border-input',
            disabled && 'cursor-not-allowed',
            FORM_CONTROL_WIDTH,
            className,
          )}
        >
          {chips.map((option, i) => (
            <button
              key={option.value}
              type="button"
              aria-label={`Remove ${option.label}`}
              disabled={disabled || option.disabled}
              onClick={() => removeAt(i)}
              className={cn(
                'hds-focus hds-touch-row inline-flex h-7 items-center gap-fixed-2xs rounded-sm bg-muted pl-scale-xs pr-fixed-2xs transition-colors duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)]',
                // Hover steps to surface.softHover: `hover:bg-accent` equalled the `bg-muted` rest fill (1.01:1), and sunken is only 1.1:1 past muted once the light ladder was re-spaced (hds#522).
                'hds-type-caption text-foreground hover:bg-[var(--semantic-color-surface-softHover)]',
                'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
              )}
            >
              {option.label}
              <Icon icon={X} size="small" color="currentColor" aria-hidden />
            </button>
          ))}
          <input
            ref={setInputRef}
            id={id}
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            autoComplete="off"
            disabled={disabled}
            placeholder={chips.length === 0 ? placeholder : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className={cn(
              'h-7 min-w-24 flex-1 bg-transparent px-fixed-2xs hds-type-ui hds-touch-text text-foreground outline-none',
              'placeholder:text-muted-foreground disabled:cursor-not-allowed',
            )}
          />
        </div>
      </Popover.Anchor>

      <Popover.Content
        aria-label={popupName}
        align="start"
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        // Focus stays in the input: the list is a popup of the field, not a dialog to enter.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = outsideTarget(e);
          if (target && inputRef.current?.parentElement?.contains(target)) e.preventDefault();
        }}
      >
        <ul
          id={listId}
          role="listbox"
          aria-label={popupName}
          aria-multiselectable
          className={cn('max-h-60 overflow-y-auto', rows.length > 0 && 'p-fixed-2xs')}
        >
          {rows.map((row, i) => {
            const isActive = i === activeIndex;
            const isSelected = row.kind === 'option' && value.includes(row.option.value);
            return (
              <li key={row.kind === 'create' ? '__create__' : row.option.value} role="none">
                <button // audit-ok: never focused; the input keeps focus and shows the active row via data-active ring
                  type="button"
                  id={rowId(i)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={isSelected}
                  data-active={isActive ? 'true' : undefined}
                  disabled={row.kind === 'option' ? row.option.disabled : undefined}
                  // Keep focus in the input when a row is pressed.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(row)}
                  className={cn(
                    'flex w-full items-center gap-scale-xs rounded-sm px-scale-xs py-1.5 text-left hds-type-ui hds-touch-row outline-none transition-colors duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)]',
                    ACTIVE_OPTION_CLASS,
                    'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
                  )}
                >
                  <OptionCheck selected={isSelected} />
                  <span className="truncate">
                    {row.kind === 'create' ? `Add “${row.text}”` : row.option.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <ListboxFooter
          empty={rows.length === 0}
          emptyMessage={emptyMessage}
          status={
            suggestionCount === 0 && addRow ? `Add “${addRow.text}”` : resultCount(suggestionCount)
          }
        />
      </Popover.Content>
    </Popover>
  );
});
