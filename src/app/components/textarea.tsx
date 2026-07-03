// motion-ok: textarea field — focus ring + transition via Tailwind utilities (gate accepts only hds.duration refs)
/**
 * Textarea — multi-line text field primitive with label, helper, and error slots.
 * @category Inputs
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

const textareaVariants = cva(
  'flex w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70',
  {
    variants: {
      textStyle: {
        body: 'font-sans text-sm',
        mono: 'font-mono text-sm',
      },
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
      textStyle: 'body',
      resize: 'vertical',
      invalid: false,
    },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type TextareaResize = NonNullable<VariantProps<typeof textareaVariants>['resize']>;

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'disabled'> {
  /** Body (sans) or mono text style for the value. */
  textStyle?: 'body' | 'mono';
  /** Resize affordance exposed to the user. */
  resize?: TextareaResize;
  /** Field label rendered above the textarea. */
  label?: string;
  /** Supporting helper text rendered below the textarea when not in error. */
  helperText?: string;
  /** Disable interaction. */
  disabled?: boolean;
  /** Mark the field as invalid (sets aria-invalid + destructive border). */
  error?: boolean;
  /** Error message rendered below the textarea when `error` is true. */
  errorMessage?: string;
  /** Class hook for the outer wrapper. */
  className?: string;
  /** Class hook for the textarea element itself. */
  textareaClassName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    id: providedId,
    textStyle = 'body',
    resize = 'vertical',
    label,
    helperText,
    error,
    errorMessage,
    disabled,
    className,
    textareaClassName,
    ...rest
  },
  ref,
) {
  const generatedId = React.useId();
  const id = providedId ?? generatedId;

  const hasError = Boolean(error);
  const isDisabled = Boolean(disabled);

  const helperTextId = helperText ? `${id}-hint` : undefined;
  const errorTextId = hasError && errorMessage ? `${id}-error` : undefined;
  const describedBy = [helperTextId, errorTextId].filter(Boolean).join(' ') || undefined;

  const textareaState = isDisabled ? 'disabled' : hasError ? 'error' : 'default';

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={id}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-describedby={describedBy}
        aria-errormessage={errorTextId}
        aria-invalid={hasError || undefined}
        data-state={textareaState}
        className={cn(textareaVariants({ textStyle, resize, invalid: hasError }), textareaClassName)}
        {...rest}
      />

      {helperText && !errorTextId && (
        <span id={helperTextId} className="text-xs text-muted-foreground">
          {helperText}
        </span>
      )}

      {hasError && errorMessage && (
        <span id={errorTextId} role="alert" className="text-xs text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
});

/** @internal — CVA variant helper; compose via Textarea props instead. */
export { textareaVariants };
