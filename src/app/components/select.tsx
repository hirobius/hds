// motion-ok: interaction feedback (open/close, chevron rotate, item highlight) is
// provided by Radix Select + CSS transitions, not motion/react.
/**
 * Select — dropdown selector built on Radix Select.
 * @category Inputs
 * @tier primitive
 * @usage Choose one value from a short list of options in a form field.
 * @whenNot Firing actions, or choosing from a list long enough to need search.
 * @useInstead Menu firing actions from a trigger
 * @useInstead Combobox a long list that needs search
 * @keyboard Enter/Space/ArrowDown Opens the listbox from the trigger with the selected option highlighted.
 * @keyboard ArrowDown/ArrowUp Moves the highlight.
 * @keyboard Home/End Jumps to the first or last option.
 * @keyboard Character Highlights the option that matches the typed letters.
 * @keyboard Enter Commits the highlighted option and returns focus to the trigger.
 * @keyboard Escape Closes the listbox and returns focus to the trigger.
 * @keyboard Tab Does not leave the open listbox.
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-49
 */

import { forwardRef, useId } from 'react';
import * as RSelect from '@radix-ui/react-select';
import { ChevronsUpDown, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { withHdsPortal } from '../context/hds-portal';
import { Icon } from './icon';
import { FORM_CONTROL_WIDTH } from './form-control';

const SelectPortal = /* @__PURE__ */ withHdsPortal(RSelect.Portal);

/**
 * Select — dropdown selector built on Radix Select (ADR-001 Radix convention).
 * Radix owns the listbox a11y contract: managed focus + active-descendant, typeahead,
 * full keyboard (Home/End/PageUp-Down/wrap), Popper collision/flip positioning, and
 * dismissal. The HDS surface is styled with the token-backed Tailwind idiom used by
 * tabs.tsx / command-palette.tsx; `ref` targets the trigger button.
 */
export interface SelectProps {
  /** Select label rendered above the control. It names the trigger, also when hidden. */
  label: string;
  /** Controls whether the label is rendered. */
  showLabel?: boolean;
  /** Select options displayed in the dropdown. */
  options: { value: string; label: string }[];
  /** Currently selected value. */
  value: string;
  /** Called when the user picks a different option. */
  onChange: (v: string) => void;
  /**
   * Element to portal into. Defaults to the nearest `data-hds` scope, so the
   * overlay inherits its theme; pass `null` to use `document.body`.
   */
  container?: HTMLElement | null;
  /**
   * Id of the trigger, so a `<label for>` names it. `FormField` sets it, with
   * `aria-describedby` and `aria-invalid`.
   */
  id?: string;
  /** Ids of the elements that describe the trigger (helper text, error). */
  'aria-describedby'?: string;
  /** Marks the trigger invalid, for example while the field shows an error. */
  'aria-invalid'?: boolean;
}

export const Select = /* @__PURE__ */ forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    showLabel = true,
    options,
    value,
    onChange,
    container,
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  },
  ref,
) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  const labelId = useId();
  const labelShown = showLabel && Boolean(label);

  return (
    <div className={cn('flex flex-col', FORM_CONTROL_WIDTH)}>
      {showLabel ? (
        <span
          id={labelId}
          // Same label as Input, Textarea and FormField: 14px ui, foreground (hds#522).
          className="hds-type-ui text-foreground"
          style={{ marginBottom: hds.semantic.space.scale.xs }}
        >
          {label}
        </span>
      ) : null}

      <RSelect.Root value={value} onValueChange={onChange}>
        <RSelect.Trigger
          ref={ref}
          id={id}
          // The field label and the value, also with the label hidden, so the
          // closed trigger is read as the field and not only its value (hds#408).
          aria-label={label ? `${label}: ${selected.label}` : selected.label}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            // h-10 is the one md control height shared with Input, Combobox and Button;
            // the trigger had py-2 and rendered 38px (hds#522). bg-background matches Input.
            'hds-focus group flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 hds-type-ui',
            'border-input bg-background text-foreground transition-colors',
            'hover:border-ring data-[state=open]:border-ring',
          )}
        >
          <RSelect.Value />
          <RSelect.Icon className="flex shrink-0 text-muted-foreground">
            <Icon icon={ChevronsUpDown} size="small" color="currentColor" />
          </RSelect.Icon>
        </RSelect.Trigger>

        <SelectPortal container={container}>
          <RSelect.Content
            position="popper"
            sideOffset={4}
            // Radix gives the listbox no name (hds#398). Point it at the visible
            // label, as Radix points its other overlays at what names them; with
            // the label hidden, carry its text; with no label text at all, fall
            // back to the trigger's own name.
            aria-labelledby={labelShown ? labelId : undefined}
            aria-label={labelShown ? undefined : label || selected.label}
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
                    'relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 hds-type-ui outline-none',
                    'text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                    'data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-ring',
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
        </SelectPortal>
      </RSelect.Root>
    </div>
  );
});
