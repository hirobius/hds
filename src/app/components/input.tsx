// motion-ok: input field — focus ring + transition via Tailwind utilities (gate accepts only hds.duration refs)
/**
 * Input — text field primitive with label, helper, and error slots.
 * @category Inputs
 * @tier primitive
 * @usage Collect a single line of text, a number, an email, a password, a date or a time, with label, helper and error slots.
 * @whenNot Multi-line text, or choosing from a fixed list of options.
 * @useInstead Textarea multi-line text
 * @useInstead Select a short fixed list
 * @useInstead Combobox a long fixed list that needs search
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=38-20
 */

import * as React from 'react';
import { Loader2, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useFrozenState } from '../context/DemoStateContext';

// ── Variants ───────────────────────────────────────────────────────────────────

const inputVariants = /* @__PURE__ */ cva(
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

// With a `prefix` or `suffix` the field chrome (border, surface, focus ring)
// moves from the <input> to this shell, so the slots sit in flow inside one
// frame. The ring follows keyboard focus on the input only, as it does without
// slots; a focused clear button keeps its own ring.
const inputShellVariants = /* @__PURE__ */ cva(
  'relative flex w-full items-center rounded-md border bg-background text-foreground ring-offset-background transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-offset-2 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-muted has-[input:disabled]:opacity-70',
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
        true: 'border-destructive has-[input:focus-visible]:ring-destructive',
        false: 'border-input has-[input:focus-visible]:ring-ring',
      },
    },
    defaultVariants: {
      size: 'md',
      textStyle: 'body',
      invalid: false,
    },
  },
);

// The <input> inside a shell drops its own chrome; the shell draws it.
const SHELLED_INPUT =
  'h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:bg-transparent disabled:opacity-100';

// ── Types ──────────────────────────────────────────────────────────────────────

type InputFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local';
/** @public */
export type InputSize = NonNullable<VariantProps<typeof inputVariants>['size']>;

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'disabled' | 'size' | 'prefix'
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
  /** In-flow content before the value, e.g. `https://` or `$`. Not part of the accessible name. */
  prefix?: React.ReactNode;
  /** In-flow content after the value, e.g. a unit such as `kg`. Not part of the accessible name. */
  suffix?: React.ReactNode;
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

// Types whose native control owns its own value UI (a stepper or a picker), so
// the clear button would crowd it. hds#393 added the date and time types.
const TYPES_WITHOUT_CLEAR: ReadonlySet<InputFieldType> = new Set<InputFieldType>([
  'number',
  'date',
  'time',
  'datetime-local',
]);

// ── Per-size adornment + padding (full literal class names for Tailwind JIT) ──

const ADORNMENT_BY_SIZE = {
  sm: {
    restPad: 'px-2',
    leadPad: 'pl-7',
    trailPad: 'pr-7',
    inset: 'inset-y-0 px-2',
    iconClass: 'size-3.5',
    iconWrap: '[&_svg]:size-3.5',
    prefixPad: 'pl-2',
    suffixPad: 'pr-2',
    prefixGap: 'pl-1.5',
    suffixGap: 'pr-1.5',
  },
  md: {
    restPad: 'px-3',
    leadPad: 'pl-9',
    trailPad: 'pr-9',
    inset: 'inset-y-0 px-2.5',
    iconClass: 'size-4',
    iconWrap: '[&_svg]:size-4',
    prefixPad: 'pl-3',
    suffixPad: 'pr-3',
    prefixGap: 'pl-2',
    suffixGap: 'pr-2',
  },
  lg: {
    restPad: 'px-4',
    leadPad: 'pl-11',
    trailPad: 'pr-11',
    inset: 'inset-y-0 px-3',
    iconClass: 'size-5',
    iconWrap: '[&_svg]:size-5',
    prefixPad: 'pl-4',
    suffixPad: 'pr-4',
    prefixGap: 'pl-2.5',
    suffixGap: 'pr-2.5',
  },
} as const;

// ── Component ──────────────────────────────────────────────────────────────────

export const Input = /* @__PURE__ */ React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    type = 'text',
    size = 'md',
    textStyle = 'body',
    id: providedId,
    label,
    helperText,
    leadingVisual,
    trailingVisual,
    prefix,
    suffix,
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
  const hasPrefix = Boolean(prefix);
  const hasSuffix = Boolean(suffix);
  const inShell = hasPrefix || hasSuffix;
  const showClearButton =
    !TYPES_WITHOUT_CLEAR.has(type) && currentValue.length > 0 && !isDisabled && !isLoading;
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

  const padLeft = hasLeading ? padCfg.leadPad : hasPrefix ? padCfg.prefixGap : padCfg.restPad;
  const padRight = trailingActive ? padCfg.trailPad : hasSuffix ? padCfg.suffixGap : padCfg.restPad;
  const slotClass = cn(
    'flex shrink-0 items-center whitespace-nowrap text-muted-foreground',
    padCfg.iconWrap,
  );

  const field = (
    <div className={inShell ? 'relative min-w-0 flex-1 self-stretch' : 'relative w-full'}>
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
          inShell && SHELLED_INPUT,
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
  );

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}

      {inShell ? (
        <div className={inputShellVariants({ size, textStyle, invalid: hasError })}>
          {hasPrefix && <span className={cn(slotClass, padCfg.prefixPad)}>{prefix}</span>}
          {field}
          {hasSuffix && <span className={cn(slotClass, padCfg.suffixPad)}>{suffix}</span>}
        </div>
      ) : (
        field
      )}

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
