// motion-ok: interaction feedback (open/close, chevron rotate, item highlight) is
// provided by Radix Select + CSS transitions, not motion/react.
/**
 * HdsSelect — dropdown selector built on Radix Select.
 * @category Inputs
 * @tier primitive
 */

import { forwardRef } from 'react';
import * as RSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

/**
 * HdsSelect — dropdown selector built on Radix Select (ADR-001 Radix convention).
 * Radix owns the listbox a11y contract: managed focus + active-descendant, typeahead,
 * full keyboard (Home/End/PageUp-Down/wrap), Popper collision/flip positioning, and
 * dismissal. The HDS surface is styled with the token-backed Tailwind idiom used by
 * tabs.tsx / command-palette.tsx; `ref` targets the trigger button.
 */
interface SelectProps {
  /** Select label rendered above the control. */
  label: string;
  /** Controls whether the label is rendered. */
  showLabel?: boolean;
  /** Select options displayed in the dropdown. */
  options: { value: string; label: string }[];
  /** Currently selected value. */
  value: string;
  /** Called when the user picks a different option. */
  onChange: (v: string) => void;
}

export const HdsSelect = forwardRef<HTMLButtonElement, SelectProps>(function HdsSelect(
  { label, showLabel = true, options, value, onChange },
  ref,
) {
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="flex flex-col">
      {showLabel ? (
        <span
          className="text-secondary"
          style={{ ...hds.typeStyles.caption, marginBottom: hds.semantic.space.component.gap }}
        >
          {label}
        </span>
      ) : null}

      <RSelect.Root value={value} onValueChange={onChange}>
        <RSelect.Trigger
          ref={ref}
          aria-label={showLabel && label ? `${label}: ${selected.label}` : selected.label}
          className={cn(
            'hds-focus group flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
            'border-input bg-muted text-foreground transition-colors',
            'hover:border-ring data-[state=open]:border-ring',
          )}
        >
          <RSelect.Value />
          <RSelect.Icon className="flex shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[state=open]:rotate-0">
            <Icon icon={ChevronDown} size="small" color="currentColor" />
          </RSelect.Icon>
        </RSelect.Trigger>

        <RSelect.Portal>
          <RSelect.Content
            position="popper"
            sideOffset={4}
            // Radix Popper vars: match trigger width and cap height to the
            // collision-aware available space (replaces the old fixed top:100% panel).
            style={{
              minWidth: 'var(--radix-select-trigger-width)',
              maxHeight: 'var(--radix-select-content-available-height)',
            }}
            className={cn(
              'z-50 overflow-hidden rounded-md border',
              'border-border bg-popover text-popover-foreground shadow-md',
            )}
          >
            <RSelect.Viewport className="p-1">
              {options.map((opt) => (
                <RSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'hds-focus relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                    'text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                  )}
                >
                  <RSelect.ItemText>{opt.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator className="flex shrink-0">
                    <Icon icon={Check} size="small" color="currentColor" />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </div>
  );
});
