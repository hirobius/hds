/**
 * @internal — not part of @hirobius/design-system public API surface.
 * @doc-ignore  option row shared by the two Combobox files, not an HDS component
 */
/**
 * One Combobox option row (hds#1145). Memoized, and its handlers take the row
 * index, so a caller passes stable callbacks (useLatestCallback) and moving the
 * active row re-renders only the row that loses it and the row that gets it.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { OptionCheck } from './combobox-list';
import { ACTIVE_OPTION_CLASS } from './listbox-nav';

interface ListboxOptionProps {
  id: string;
  index: number;
  label: string;
  selected: boolean;
  active: boolean;
  disabled?: boolean;
  /** Keep focus in the search field when the row is pressed. */
  keepFocus?: boolean;
  onActivate: (index: number) => void;
  onPick: (index: number) => void;
}

const keepFocusOnPress = (e: React.MouseEvent) => e.preventDefault();

export const ListboxOption = /* @__PURE__ */ React.memo(function ListboxOption({
  id,
  index,
  label,
  selected,
  active,
  disabled,
  keepFocus,
  onActivate,
  onPick,
}: ListboxOptionProps) {
  return (
    <li role="none">
      <button // audit-ok: never focused; the search field keeps focus and shows the active row via data-active ring
        type="button"
        id={id}
        role="option"
        tabIndex={-1}
        aria-selected={selected}
        data-active={active ? 'true' : undefined}
        disabled={disabled}
        onMouseDown={keepFocus ? keepFocusOnPress : undefined}
        onMouseEnter={() => onActivate(index)}
        onClick={() => onPick(index)}
        className={cn(
          'flex w-full items-center gap-scale-xs rounded-sm px-scale-xs py-1.5 text-left hds-type-ui hds-touch-row outline-none transition-colors duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)]',
          ACTIVE_OPTION_CLASS,
          'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
        )}
      >
        <OptionCheck selected={selected} />
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
});
