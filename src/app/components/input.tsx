// motion-ok: input field — focus ring + transition via Tailwind utilities (gate accepts only hds.duration refs)
/**
 * Input — text field primitive with label, helper, and error slots.
 * @category Inputs
 * @tier primitive
 */

import * as React from 'react';
import { Loader2, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useFrozenState } from '../context/DemoStateContext';

// ── Variants ───────────────────────────────────────────────────────────────────

const inputVariants = cva(
  'flex w-full rounded-md border bg-background text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70',
  {
    variants: {
      size: {
        sm: 'h-8 text-xs',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
      textStyle: {
        body: 'font-sans',
        mono: 'font-mono',
      },
      invalid: {
        true: 'border-destructive focus-visible:ring-destructive',
        false: 'border-input',
      },
    },
    defaultVariants: {
      size: 'md',
      textStyle: 'body',
      invalid: false,
    },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type InputFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
/** @public */
export type InputSize = NonNullable<VariantProps<typeof inputVariants>['size']>;

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'disabled' | 'size'
> {
  /** Native input type. */
  type?: InputFieldType;
  /** Field height tier. */
  size?: InputSize;
  /** Body (sans) or mono text style for the value. */
  textStyle?: 'body' | 'mono';
  /** Field label rendered above the input. */
  label?: string;
  /** Supporting helper text rendered below the input when not in error. */
  helperText?: string;
  /** Optional leading visual rendered inside the input shell. */
  leadingVisual?: React.ReactNode;
  /** Optional trailing visual rendered inside the input shell. */
  trailingVisual?: React.ReactNode;
  /** Disable interaction. */
  disabled?: boolean;
  /** Mark the field as invalid (sets aria-invalid + destructive border). */
  error?: boolean;
  /** Error message rendered below the input when `error` is true. */
  errorMessage?: string;
  /** Show busy indicator and disable interaction. */
  loading?: boolean;
  /** Class hook for the outer wrapper. */
  className?: string;
  /** Class hook for the input element itself. */
  inputClassName?: string;
}

// ── Per-size adornment + padding (full literal class names for Tailwind JIT) ──

const ADORNMENT_BY_SIZE = {
  sm: {
    restPad: 'px-2',
    leadPad: 'pl-7',
    trailPad: 'pr-7',
    inset: 'inset-y-0 px-2',
    iconClass: 'size-3.5',
    iconWrap: '[&_svg]:size-3.5',
  },
  md: {
    restPad: 'px-3',
    leadPad: 'pl-9',
    trailPad: 'pr-9',
    inset: 'inset-y-0 px-2.5',
    iconClass: 'size-4',
    iconWrap: '[&_svg]:size-4',
  },
  lg: {
    restPad: 'px-4',
    leadPad: 'pl-11',
    trailPad: 'pr-11',
    inset: 'inset-y-0 px-3',
    iconClass: 'size-5',
    iconWrap: '[&_svg]:size-5',
  },
} as const;

// ── Component ──────────────────────────────────────────────────────────────────

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    type = 'text',
    size = 'md',
    textStyle = 'body',
    id: providedId,
    label,
    helperText,
    leadingVisual,
    trailingVisual,
    error,
    errorMessage,
    disabled,
    loading = false,
    className,
    inputClassName,
    onChange,
    ...rest
  },
  ref,
) {
  const generatedId = React.useId();
  const id = providedId ?? generatedId;
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const frozenState = useFrozenState();
  const effectiveDemoState = frozenState as
    | 'rest'
    | 'focused'
    | 'filled'
    | 'error'
    | 'disabled'
    | 'loading'
    | null;

  const hasError = Boolean(error) || effectiveDemoState === 'error';
  const isLoading = loading || effectiveDemoState === 'loading';
  const isDisabled = Boolean(disabled) || isLoading || effectiveDemoState === 'disabled';

  const helperTextId = helperText ? `${id}-hint` : undefined;
  const errorTextId =
    hasError && (errorMessage || effectiveDemoState === 'error') ? `${id}-error` : undefined;
  const describedBy = [helperTextId, errorTextId].filter(Boolean).join(' ') || undefined;

  const [uncontrolledValue, setUncontrolledValue] = React.useState(() => {
    if (typeof rest.defaultValue === 'string') return rest.defaultValue;
    if (typeof rest.defaultValue === 'number') return String(rest.defaultValue);
    return '';
  });
  const controlledValue =
    typeof rest.value === 'string'
      ? rest.value
      : typeof rest.value === 'number'
        ? String(rest.value)
        : undefined;
  const currentValue = controlledValue ?? uncontrolledValue;

  const padCfg = ADORNMENT_BY_SIZE[size];
  const hasLeading = Boolean(leadingVisual);
  const hasTrailing = Boolean(trailingVisual);
  const showClearButton = type !== 'number' && currentValue.length > 0 && !isDisabled && !isLoading;
  const trailingActive = isLoading || hasTrailing || showClearButton;

  function assignInputRef(node: HTMLInputElement | null) {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
      return;
    }
    if (ref) {
      ref.current = node;
    }
  }

  function handleClear() {
    const node = inputRef.current;
    if (!node) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    nativeSetter?.call(node, '');
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.focus();
  }

  const inputState = effectiveDemoState
    ? effectiveDemoState
    : isLoading
      ? 'loading'
      : isDisabled
        ? 'disabled'
        : hasError
          ? 'error'
          : currentValue.length > 0
            ? 'filled'
            : 'default';

  const padLeft = hasLeading ? padCfg.leadPad : padCfg.restPad;
  const padRight = trailingActive ? padCfg.trailPad : padCfg.restPad;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}

      <div className="relative w-full">
        {hasLeading && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-0 flex items-center text-muted-foreground',
              padCfg.inset,
              padCfg.iconWrap,
            )}
          >
            {leadingVisual}
          </span>
        )}

        <input
          ref={assignInputRef}
          id={id}
          type={type}
          disabled={isDisabled}
          aria-disabled={isDisabled || undefined}
          aria-busy={isLoading || undefined}
          aria-describedby={describedBy}
          aria-errormessage={errorTextId}
          aria-invalid={hasError || undefined}
          data-state={inputState}
          data-size={size}
          data-search-input={type === 'search' ? 'true' : undefined}
          className={cn(
            inputVariants({ size, textStyle, invalid: hasError }),
            padLeft,
            padRight,
            inputClassName,
          )}
          onChange={(event) => {
            if (controlledValue === undefined) {
              setUncontrolledValue(event.target.value);
            }
            onChange?.(event);
          }}
          {...rest}
        />

        {isLoading && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-0 flex items-center text-muted-foreground',
              padCfg.inset,
            )}
          >
            <Loader2 className={cn('animate-spin', padCfg.iconClass)} />
          </span>
        )}

        {!isLoading && hasTrailing && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-0 flex items-center text-muted-foreground',
              padCfg.inset,
              padCfg.iconWrap,
            )}
          >
            {trailingVisual}
          </span>
        )}

        {!isLoading && !hasTrailing && showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={type === 'search' ? 'Clear search' : 'Clear input'}
            className={cn(
              'absolute right-0 flex items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
              padCfg.inset,
            )}
          >
            <X className={padCfg.iconClass} aria-hidden="true" />
          </button>
        )}
      </div>

      {helperText && !errorTextId && (
        <span id={helperTextId} className="text-xs text-muted-foreground">
          {helperText}
        </span>
      )}

      {hasError && (errorMessage || effectiveDemoState === 'error') && (
        <span id={errorTextId} role="alert" className="text-xs text-destructive">
          {errorMessage || 'Field error'}
        </span>
      )}
    </div>
  );
});

/** @internal — CVA variant helper; compose via Input props instead. */
export { inputVariants };
