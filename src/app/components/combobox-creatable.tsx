/**
 * CreatableCombobox — the chip-input arm of Combobox (`multiple creatable`).
 * Internal: consumers reach it through `<Combobox multiple creatable>`.
 *
 * The field is the combobox: removable chips sit inline before a text input, the
 * suggestions open in a Popover under the field while the input keeps focus, and
 * Enter adds the typed text through `onCreate`.
 */
// motion-ok: open/close motion is owned by the underlying Popover (Radix); chips
// and options use token color transitions via their utility classes.

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Popover } from './popover';
import { FORM_CONTROL_WIDTH } from './form-control';
import type { ComboboxOption } from './combobox';

export interface CreatableComboboxProps {
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
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    const row = rows[i];
    if (row.kind === 'create' || !row.option.disabled) return i;
  }
  return from;
}

export function CreatableCombobox({
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
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const baseId = React.useId();
  const listId = `${baseId}-list`;
  const inputRef = React.useRef<HTMLInputElement>(null);
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

  // Typed text wins Enter: land on the Add row when there is one, else the first
  // selectable suggestion. Adjusted during render, as Combobox does for its list.
  const rowsKey = `${open}|${rows
    .map((r) =>
      r.kind === 'create' ? `+${r.text}` : `${r.option.value}:${r.option.disabled ? 1 : 0}`,
    )
    .join('\u0000')}`;
  const [prevRowsKey, setPrevRowsKey] = React.useState(rowsKey);
  if (prevRowsKey !== rowsKey) {
    setPrevRowsKey(rowsKey);
    const create = rows.findIndex((r) => r.kind === 'create');
    const first = rows.findIndex((r) => r.kind === 'option' && !r.option.disabled);
    setActiveIndex(create !== -1 ? create : first === -1 ? 0 : first);
  }

  const scrollActiveIntoView = React.useRef(false);
  const rowId = (i: number) => `${baseId}-opt-${i}`;
  const activeId = open && rows[activeIndex] ? rowId(activeIndex) : undefined;
  React.useEffect(() => {
    if (!scrollActiveIntoView.current) return;
    scrollActiveIntoView.current = false;
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

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
      const next = nextEnabled(rows, activeIndex, e.key === 'ArrowDown' ? 1 : -1);
      if (next !== activeIndex) {
        scrollActiveIntoView.current = true;
        setActiveIndex(next);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open) commit(rows[activeIndex]);
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
            'flex min-h-10 flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1',
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
                'hds-focus hds-touch-row inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-muted pl-2 pr-1',
                'hds-type-caption text-foreground hover:bg-accent hover:text-accent-foreground',
                'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
              )}
            >
              {option.label}
              <Icon icon={X} size="small" color="currentColor" aria-hidden />
            </button>
          ))}
          <input
            ref={inputRef}
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
              'h-7 min-w-24 flex-1 bg-transparent px-1 hds-type-ui text-foreground outline-none',
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
          const oe = (e as { detail?: { originalEvent?: Event } }).detail?.originalEvent;
          const target = (oe?.target ?? (e as unknown as Event).target) as Node | null;
          if (target && inputRef.current?.parentElement?.contains(target)) e.preventDefault();
        }}
      >
        <ul
          id={listId}
          role="listbox"
          aria-label={popupName}
          aria-multiselectable
          className={cn('max-h-60 overflow-y-auto', rows.length > 0 && 'p-1')}
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
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hds-type-ui hds-touch-row outline-none',
                    'data-[active=true]:bg-[var(--semantic-color-surface-sunken)] data-[active=true]:text-[var(--semantic-color-content-primary)]',
                    'data-[active=true]:ring-2 data-[active=true]:ring-inset data-[active=true]:ring-ring',
                    'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
                  )}
                >
                  <span className="flex size-4 items-center justify-center">
                    {isSelected ? (
                      <Icon icon={Check} size="small" color="currentColor" aria-hidden />
                    ) : null}
                  </span>
                  <span className="truncate">
                    {row.kind === 'create' ? `Add “${row.text}”` : row.option.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 ? (
          <p className="m-1 px-2 py-6 text-center hds-type-ui text-muted-foreground">
            {emptyMessage}
          </p>
        ) : null}
        <div role="status" aria-live="polite" className="sr-only">
          {`${suggestionCount} ${suggestionCount === 1 ? 'result' : 'results'}`}
        </div>
      </Popover.Content>
    </Popover>
  );
}
