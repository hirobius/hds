// motion-ok: textarea field — focus ring + transition via Tailwind utilities (gate accepts only hds.duration refs)
/**
 * Textarea — multi-line text field primitive with label, helper, and error slots.
 * @category Inputs
 * @tier primitive
 * @usage Collect multi-line free text such as a message, note or description.
 * @whenNot A single line of text, or choosing from a list.
 * @useInstead Input a single line of text
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=85-14
 *
 * Mirrors Input's shell + token skin as a native `<textarea>`. Figma parity:
 * the four states Default / Focus / Error / Disabled map to the focus-ring,
 * `error`, and `disabled` treatments below.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { FORM_CONTROL_WIDTH } from './form-control';

// ── Variants ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- content-disabled has no named Tailwind-theme utility; var()-based so still token-driven (matches button/segmented disabled)
const textareaVariants = /* @__PURE__ */ cva(
  'flex w-full rounded-md border bg-background px-3 py-2 hds-type-ui text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-[var(--semantic-color-content-disabled)]',
  {
    variants: {
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        both: 'resize',
      },
      invalid: {
        true: 'border-destructive focus-visible:ring-destructive',
        false: 'border-input',
      },
    },
    defaultVariants: {
      resize: 'vertical',
      invalid: false,
    },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type TextareaResize = NonNullable<VariantProps<typeof textareaVariants>['resize']>;

export interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'disabled'
> {
  /** Field label rendered above the textarea. */
  label?: string;
  /** Supporting helper text rendered below when not in error. */
  helperText?: string;
  /** Disable interaction. */
  disabled?: boolean;
  /** Mark the field as invalid (sets aria-invalid + destructive border). */
  error?: boolean;
  /** Error message rendered below the textarea when `error` is true. */
  errorMessage?: string;
  /** User resize affordance. Defaults to vertical-only. */
  resize?: TextareaResize;
  /** Class hook for the outer wrapper. */
  className?: string;
  /** Class hook for the textarea element itself. */
  textareaClassName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const Textarea = /* @__PURE__ */ React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id: providedId,
      label,
      helperText,
      error,
      errorMessage,
      disabled,
      resize = 'vertical',
      rows = 4,
      className,
      textareaClassName,
      ...rest
    },
    ref,
  ) {
    const generatedId = React.useId();
    const id = providedId ?? generatedId;

    const hasError = Boolean(error);
    const errorTextId = hasError && errorMessage ? `${id}-error` : undefined;
    // The helper only renders while no error is shown, so only reference it then.
    const helperTextId = helperText && !errorTextId ? `${id}-hint` : undefined;
    const describedBy = [helperTextId, errorTextId].filter(Boolean).join(' ') || undefined;
    const state = disabled ? 'disabled' : hasError ? 'error' : 'default';

    return (
      <div className={cn('flex flex-col gap-1.5', FORM_CONTROL_WIDTH, className)}>
        {label && (
          <label htmlFor={id} className="hds-type-ui text-foreground">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          aria-disabled={disabled || undefined}
          aria-describedby={describedBy}
          aria-errormessage={errorTextId}
          aria-invalid={hasError || undefined}
          data-state={state}
          className={cn(textareaVariants({ resize, invalid: hasError }), textareaClassName)}
          {...rest}
        />

        {helperTextId && (
          <span id={helperTextId} className="hds-type-caption text-muted-foreground">
            {helperText}
          </span>
        )}

        {hasError && errorMessage && (
          <span id={errorTextId} role="alert" className="hds-type-caption text-destructive">
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);
