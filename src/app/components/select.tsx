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
 * @a11y component required a11y:select.open-keys Enter, Space and ArrowDown on the trigger open the listbox.
 * @a11y component required a11y:select.trigger-expanded The trigger exposes aria-expanded, false while closed and true while open.
 * @a11y component required a11y:select.trigger-controls The trigger points aria-controls at the open listbox.
 * @a11y component required a11y:select.escape-returns-focus Escape closes the listbox and returns focus to the trigger.
 * @a11y component required a11y:select.tab-contained Tab does not move focus out of the open listbox.
 * @a11y component required a11y:select.selected-highlighted The selected option is highlighted and focused when the listbox opens.
 * @a11y component required a11y:select.arrow-keys ArrowDown and ArrowUp move the highlight.
 * @a11y component required a11y:select.home-end Home and End jump to the first and last option.
 * @a11y component required a11y:select.typeahead Typing letters highlights the matching option.
 * @a11y component required a11y:select.commit-returns-focus Enter commits the highlighted option and returns focus to the trigger.
 * @a11y component required a11y:select.trigger-name-with-value The trigger is a combobox named "Label: value".
 * @a11y component required a11y:select.hidden-label-named The trigger keeps the field label in its name when showLabel is false.
 * @a11y component required a11y:select.listbox-named The open listbox is named by the field label.
 * @a11y component required a11y:select.option-state-position Each option reports whether it is selected, its position and set size.
 * @a11y component required a11y:select.label-wired The visible label is a real label wired to the trigger.
 * @a11y component required a11y:select.form-field-label Inside FormField the field label names the trigger.
 * @a11y component required a11y:select.form-field-error Inside FormField an error sets aria-invalid and describes the trigger by the message.
 * @a11y consumer required Always pass label, even with showLabel={false}; it names the trigger and the listbox.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=82-49
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
  /** Text shown in the trigger while `value` matches no option. Defaults to "Select…", like Combobox. */
  placeholder?: string;
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
    placeholder = 'Select…',
  },
  ref,
) {
  // May be undefined: options can be empty while an async list loads, or `value`
  // can match nothing. Guard it — dereferencing `options[0]` here crashed the
  // whole page on an empty list (hds#—), and mislabeled the trigger on a miss.
  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? '';
  const labelId = useId();
  const generatedId = useId();
  // One id for the trigger and the label's htmlFor, so clicking the label focuses it.
  const triggerId = id ?? generatedId;
  const labelShown = showLabel && Boolean(label);

  return (
    <div className={cn('flex flex-col', FORM_CONTROL_WIDTH)}>
      {showLabel ? (
        <label
          id={labelId}
          htmlFor={triggerId}
          // Same label as Input, Textarea and FormField: 16px ui, foreground (hds#522).
          className="hds-type-ui text-foreground"
          style={{ marginBottom: hds.semantic.space.scale.xs }}
        >
          {label}
        </label>
      ) : null}

      <RSelect.Root value={value} onValueChange={onChange}>
        <RSelect.Trigger
          ref={ref}
          id={triggerId}
          // The field label and the value, also with the label hidden, so the
          // closed trigger is read as the field and not only its value (hds#408).
          aria-label={
            label
              ? selectedLabel
                ? `${label}: ${selectedLabel}`
                : label
              : selectedLabel || undefined
          }
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            // h-10 is the one md control height shared with Input, Combobox and Button;
            // the trigger had py-2 and rendered 38px (hds#522). bg-background matches Input.
            'hds-focus group flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 hds-type-ui',
            'bg-background text-foreground transition-colors',
            // aria-invalid (set by FormField or the caller) draws the same red border as Input.
            ariaInvalid
              ? 'border-destructive'
              : 'border-input hover:border-ring data-[state=open]:border-ring',
          )}
        >
          <RSelect.Value placeholder={placeholder} />
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
            aria-label={labelShown ? undefined : label || selectedLabel || undefined}
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
                    'relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 hds-type-ui hds-touch-row outline-none',
                    'text-foreground data-[highlighted]:bg-[var(--semantic-color-surface-sunken)] data-[highlighted]:text-[var(--semantic-color-content-primary)]',
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
