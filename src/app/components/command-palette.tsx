/**
 * CommandPalette — ⌘K search and command box: a modal search field over grouped results.
 * @category Overlays
 * @tier pattern
 * @usage Let people jump to a page or run a command from anywhere by typing, opened with ⌘K or Ctrl+K.
 * @whenNot Picking a value for a form field, or a short action list on a button.
 * @useInstead Combobox picking a value for a form field
 * @useInstead Menu a short action list from a trigger
 * @keyboard Cmd+K/Ctrl+K Opens or closes the palette from anywhere on the page.
 * @keyboard Character Filters the items by label, keywords and group.
 * @keyboard ArrowDown/ArrowUp Moves the active item, skipping disabled ones, and wraps at the ends.
 * @keyboard Enter Runs the active item and closes the palette.
 * @keyboard Escape Closes the palette and returns focus to where it was.
 * @a11y component required a11y:command-palette.dialog-named The palette is a modal dialog named by its label, which also names the search field.
 * @a11y component required a11y:command-palette.hotkey-focus Cmd+K or Ctrl+K opens the palette with focus in the search field.
 * @a11y component required a11y:command-palette.combobox-state The search field is an expanded combobox that controls the listbox and exposes the active option through aria-activedescendant.
 * @a11y component required a11y:command-palette.groups-named Each group of results is a group named by its heading.
 * @a11y component required a11y:command-palette.options-not-tabbable Options stay out of the tab order and Tab stays inside the dialog.
 * @a11y component required a11y:command-palette.arrow-keys ArrowDown and ArrowUp move the active option, skip disabled ones and wrap at the ends.
 * @a11y component required a11y:command-palette.option-state The active option reports aria-selected and a disabled one reports aria-disabled.
 * @a11y component required a11y:command-palette.shortcut-described An option is named by its label and described by its shortcut keys.
 * @a11y component required a11y:command-palette.result-count-announced The match count is announced in a polite status as the list filters (4.1.3).
 * @a11y component required a11y:command-palette.escape-returns-focus Escape closes the palette and returns focus to the element that had it.
 * @a11y component required a11y:command-palette.axe-clean The open palette has no axe violations, with results or empty.
 * @a11y consumer required Pass a label that says what the palette searches when it is not a general command palette.
 *
 * Built from Dialog, Kbd and the Combobox listbox pattern. Items are plain data;
 * the palette filters, groups (in first-seen order) and navigates them, and calls
 * `onSelect` with the chosen item. `open` is controlled; the ⌘K / Ctrl+K hotkey
 * calls `onOpenChange` unless `hotkey={false}`. Argument chips for multi-step
 * commands are a follow-up (hds#962).
 *
 *   <CommandPalette open={open} onOpenChange={setOpen} items={commands}
 *     onSelect={(item) => run(item.id)} />
 */
// motion-ok: open/close motion is owned by the underlying Dialog (Radix); rows use
// token colour utilities only.

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Dialog } from './dialog';
import { Icon } from './icon';
import { Kbd } from './kbd';
import { ACTIVE_OPTION_CLASS, firstEnabledIndex, nextEnabledIndex } from './listbox-nav';

// ── Types ──────────────────────────────────────────────────────────────────────

/** One command or destination in the palette. */
export interface CommandPaletteItem {
  /** Stable id, passed back through `onSelect`. */
  id: string;
  /** Text shown on the row and matched by the search. */
  label: string;
  /** Group heading the row sits under. Rows without one share an unheaded group. */
  group?: string;
  /** Extra words the search matches that are not shown (synonyms, ids). */
  keywords?: readonly string[];
  /** Keys shown as a shortcut hint, one Kbd each, e.g. `['G', 'I']`. Display only. */
  shortcut?: readonly string[];
  /** Shown but not runnable. */
  disabled?: boolean;
}

/** @public */
export interface CommandPaletteProps {
  /** Whether the palette is open. */
  open: boolean;
  /** Called to open or close: Escape, a click outside, a run item, or the hotkey. */
  onOpenChange: (open: boolean) => void;
  /** Every item the palette can show; the search filters them. */
  items: readonly CommandPaletteItem[];
  /** Called with the item Enter or a click runs. The palette closes itself after. */
  onSelect: (item: CommandPaletteItem) => void;
  /** Names the dialog, the search field and the listbox. Defaults to "Command palette". */
  label?: string;
  /** Placeholder for the search field. */
  placeholder?: string;
  /** Shown when the search matches nothing. */
  emptyMessage?: string;
  /** Bind ⌘K / Ctrl+K on the page to toggle the palette. Defaults to true. */
  hotkey?: boolean;
  /** Class hook for the dialog surface. */
  className?: string;
}

interface Group {
  name: string | undefined;
  rows: { item: CommandPaletteItem; index: number }[];
}

function matches(item: CommandPaletteItem, q: string): boolean {
  if (!q) return true;
  const haystack = [item.label, item.group ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase();
  return haystack.includes(q);
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const CommandPalette = /* @__PURE__ */ React.forwardRef<HTMLDivElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open,
      onOpenChange,
      items,
      onSelect,
      label = 'Command palette',
      placeholder = 'Type a command or search…',
      emptyMessage = 'No results',
      hotkey = true,
      className,
    },
    ref,
  ) {
    const [query, setQuery] = React.useState('');
    const [activeIndex, setActiveIndex] = React.useState(0);
    const baseId = React.useId();
    const listId = `${baseId}-list`;

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      return items.filter((item) => matches(item, q));
    }, [items, query]);

    // Groups keep first-seen order; each row keeps its index in the flat list,
    // which is what the arrow keys and aria-activedescendant walk.
    const groups = React.useMemo(() => {
      const byName = new Map<string | undefined, Group>();
      filtered.forEach((item, index) => {
        const group = byName.get(item.group) ?? { name: item.group, rows: [] };
        group.rows.push({ item, index });
        byName.set(item.group, group);
      });
      return [...byName.values()];
    }, [filtered]);

    // Reopening starts from an empty search; a new result list starts on its
    // first enabled row. Adjusted during render, the React-endorsed alternative
    // to a setState effect (same as Combobox).
    const [prevOpen, setPrevOpen] = React.useState(open);
    if (prevOpen !== open) {
      setPrevOpen(open);
      if (open) setQuery('');
    }
    const listKey = `${open}|${filtered.map((i) => `${i.id}:${i.disabled ? 1 : 0}`).join('\u0000')}`;
    const [prevListKey, setPrevListKey] = React.useState(listKey);
    if (prevListKey !== listKey) {
      setPrevListKey(listKey);
      setActiveIndex(firstEnabledIndex(filtered));
    }

    React.useEffect(() => {
      if (!hotkey) return;
      function onKeyDown(e: KeyboardEvent) {
        // Skip a held key and a ⌘K something on the page already handled.
        if (e.repeat || e.defaultPrevented) return;
        if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          onOpenChange(!open);
        }
      }
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [hotkey, open, onOpenChange]);

    // Ids come from the index: an item id may hold characters invalid in an id reference.
    const optionId = (i: number) => `${baseId}-opt-${i}`;
    const active = filtered[activeIndex];
    const activeOptionId = active && !active.disabled ? optionId(activeIndex) : undefined;

    // Keyboard moves bring the active row into view; mouse hover must not scroll.
    const scrollActiveIntoView = React.useRef(false);
    React.useEffect(() => {
      if (!scrollActiveIntoView.current) return;
      scrollActiveIntoView.current = false;
      if (activeOptionId)
        document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
    }, [activeOptionId]);

    // There is no Dialog.Trigger (the hotkey or any button opens it), so Radix has
    // nothing to hand focus back to: keep the element that had focus on open.
    const returnFocus = React.useRef<HTMLElement | null>(null);

    function run(item: CommandPaletteItem) {
      if (item.disabled) return;
      onSelect(item);
      onOpenChange(false);
    }

    function move(next: number) {
      if (next === activeIndex) return;
      scrollActiveIntoView.current = true;
      setActiveIndex(next);
    }

    function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        move(nextEnabledIndex(filtered, activeIndex, e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active) run(active);
      }
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Content
          ref={ref}
          hideClose
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            const el = document.activeElement;
            returnFocus.current = el instanceof HTMLElement && el !== document.body ? el : null;
          }}
          onCloseAutoFocus={(event) => {
            const el = returnFocus.current;
            returnFocus.current = null;
            if (el?.isConnected) {
              event.preventDefault();
              el.focus();
            }
          }}
          className={cn(
            // A palette sits near the top so the field stays put as results grow and shrink.
            'top-scale-xl translate-y-0 gap-0 overflow-hidden p-0',
            className,
          )}
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <div className="flex items-center gap-scale-xs border-b border-border px-fixed-sm">
            <Icon
              icon={Search}
              size="small"
              color="var(--semantic-color-content-secondary)"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              aria-label={label}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              className="h-12 min-w-0 flex-1 bg-transparent hds-type-ui text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Kbd size="sm" aria-hidden>
              Esc
            </Kbd>
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label={label}
            className={cn('max-h-80 overflow-y-auto', filtered.length > 0 && 'p-fixed-2xs')}
          >
            {groups.map((group, g) => {
              const headingId = `${baseId}-group-${g}`;
              return (
                <div
                  key={group.name ?? `\u0000${g}`}
                  role="group"
                  aria-labelledby={group.name ? headingId : undefined}
                  aria-label={group.name ? undefined : label}
                >
                  {group.name ? (
                    <div
                      id={headingId}
                      role="presentation"
                      className="px-scale-xs pb-fixed-2xs pt-scale-xs hds-type-caption text-muted-foreground"
                    >
                      {group.name}
                    </div>
                  ) : null}
                  {group.rows.map(({ item, index }) => {
                    const isActive = index === activeIndex && !item.disabled;
                    const labelId = `${optionId(index)}-label`;
                    const keysId = `${optionId(index)}-keys`;
                    return (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled on the search field, which owns focus (aria-activedescendant)
                      <div
                        key={item.id}
                        id={optionId(index)}
                        role="option"
                        tabIndex={-1}
                        aria-selected={isActive}
                        aria-disabled={item.disabled || undefined}
                        aria-labelledby={labelId}
                        aria-describedby={item.shortcut?.length ? keysId : undefined}
                        data-active={isActive ? 'true' : undefined}
                        onMouseMove={() => {
                          if (!item.disabled && index !== activeIndex) setActiveIndex(index);
                        }}
                        onClick={() => run(item)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-scale-xs rounded-sm px-scale-xs py-fixed-2xs hds-type-ui hds-touch-row text-foreground outline-none',
                          ACTIVE_OPTION_CLASS,
                          'aria-disabled:cursor-not-allowed aria-disabled:text-[var(--semantic-color-content-disabled)]',
                        )}
                      >
                        <span id={labelId} className="truncate">
                          {item.label}
                        </span>
                        {item.shortcut?.length ? (
                          <span id={keysId} className="flex shrink-0 items-center gap-fixed-2xs">
                            {item.shortcut.map((key, k) => (
                              <React.Fragment key={k}>
                                {k > 0 ? ' ' : null}
                                <Kbd size="sm">{key}</Kbd>
                              </React.Fragment>
                            ))}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Beside the listbox, not in it: a listbox holding text but no option
            fails axe aria-required-children (hds#407, as in Combobox). */}
          {filtered.length === 0 ? (
            <p className="px-scale-xs py-scale-md text-center hds-type-ui text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
          <div role="status" aria-live="polite" className="sr-only">
            {`${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}`}
          </div>
        </Dialog.Content>
      </Dialog>
    );
  },
);
