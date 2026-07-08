/**
 * FileInput — styled dropzone that wraps a real native file input for full
 * keyboard and screen-reader accessibility, with optional drag-and-drop.
 * @category Inputs
 * @tier pattern
 * @public
 */
// motion-ok: dropzone border/background feedback via Tailwind transition-colors (gate accepts only hds.duration refs)

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Decorative dropzone chrome only — `dragging` and `disabled` are the two
// boolean states the dropzone reacts to (not one of the contract's four
// axes; like Tag's `selected`, this is a component-specific state flag).
const fileInputVariants = cva(
  'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-accent hds-focus',
  {
    variants: {
      dragging: {
        true: 'border-ring bg-accent',
        false: '',
      },
      disabled: {
        true: 'pointer-events-none opacity-50',
        false: '',
      },
    },
    defaultVariants: { dragging: false, disabled: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FileInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  /** Called with the selected (or dropped) files. */
  onFiles?: (files: File[]) => void;
  /** Dropzone prompt content. */
  label?: React.ReactNode;
  /** Native `accept` attribute, e.g. `"image/*"`. */
  accept?: string;
  /** Allow selecting more than one file. */
  multiple?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A dashed dropzone that opens the native file picker or accepts a drag-and-drop. */
export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  {
    onFiles,
    label = 'Click to upload or drag and drop',
    accept,
    multiple,
    disabled,
    className,
    ...rest
  },
  ref,
) {
  const [dragging, setDragging] = React.useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (disabled) return;
        onFiles?.(Array.from(event.dataTransfer.files ?? []));
      }}
      className={cn(fileInputVariants({ dragging, disabled, className }))}
    >
      {label}
      <input
        ref={ref}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => onFiles?.(Array.from(event.target.files ?? []))}
        {...rest}
      />
    </label>
  );
});

/** @internal — CVA variant helper; compose via FileInput props instead. */
export { fileInputVariants };
