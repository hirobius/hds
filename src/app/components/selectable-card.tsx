/**
 * SelectableCard — a full-surface card that behaves as a single checkbox-like
 * selectable option, with native aria-checked semantics and full keyboard support.
 * @category Actions
 * @tier pattern
 *
 *   <SelectableCard selected={selected} onSelectedChange={setSelected}>
 *     Plan A
 *   </SelectableCard>
 */
// motion-ok: transition-colors carries the selected/unselected border and background feedback; no separate motion primitive needed.

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

const selectableCardVariants = cva(
  'w-full text-left rounded-lg border bg-card p-4 text-foreground transition-colors hds-focus disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      selected: {
        true: 'border-ring ring-2 ring-ring ring-offset-2 ring-offset-background bg-accent',
        false: 'border-border hover:border-ring',
      },
    },
    defaultVariants: { selected: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type SelectableCardVariantProps = VariantProps<typeof selectableCardVariants>;

/** @public */
export interface SelectableCardProps
  extends
    Omit<React.HTMLAttributes<HTMLButtonElement>, 'onSelect'>,
    Omit<SelectableCardVariantProps, 'selected'> {
  /** Whether this card is currently selected. */
  selected?: boolean;
  /** Called with the toggled selection state when the card is activated. */
  onSelectedChange?: (selected: boolean) => void;
  /** Disable interaction. */
  disabled?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A card-shaped single checkbox — click or activate to toggle selection. */
export const SelectableCard = React.forwardRef<HTMLButtonElement, SelectableCardProps>(
  function SelectableCard(
    { className, selected = false, onSelectedChange, disabled, onClick, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={selected}
        data-state={selected ? 'checked' : 'unchecked'}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          onSelectedChange?.(!selected);
        }}
        className={cn(selectableCardVariants({ selected }), className)}
        {...props}
      />
    );
  },
);

/** @internal — CVA variant helper; compose via SelectableCard props instead. */
export { selectableCardVariants };
