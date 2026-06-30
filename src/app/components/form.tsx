/**
 * Form + FormField — validation-agnostic form layout + field-wiring seam.
 * @category Inputs
 * @tier pattern
 * @doc-exempt: no Inputs/forms doc page yet — add demo when created
 *
 * HDS does not depend on a form/validation library. `FormField` owns the a11y
 * wiring (label↔control association, aria-invalid, aria-describedby for
 * description + error) and accepts a plain `error` string — so the validation
 * SOURCE is whatever the consumer brings: native constraint validation,
 * react-hook-form, zod, Formik, etc. (Mirrors the router-adapter philosophy:
 * works with zero deps; richer when you inject your own.)
 *
 *   <Form onSubmit={…}>
 *     <FormField label="Full name" error={errors.name} required>
 *       <input className="…" />            // bare / native or any control
 *     </FormField>
 *     <Button type="submit">Save</Button>
 *   </Form>
 *
 * NOTE: the HDS `Input` already self-wires its own label/error/aria via its
 * `label` + `error` + `errorMessage` props — use those directly rather than
 * wrapping `Input` in `FormField` (which would double-wire). `FormField` is for
 * controls that don't self-wire: native inputs, `Select`, `Combobox`, checkboxes.
 *
 * `FormField` cloneElement-wires its single child. That clone is incompatible
 * with controls that carry a callback ref managed elsewhere (e.g.
 * react-hook-form's `useController` field.ref — re-cloning detaches it). For
 * that case use `useFieldWiring` + `FormFieldShell` to wire a control you render
 * directly (no clone); the `@hirobius/design-system/form` adapter does exactly this.
 */

// motion-ok: Form/FormField are structural — a <form> wrapper and a label/error
// field-wiring container. They host no interactive surface of their own; motion
// belongs to the controls placed inside them.
import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Form ─────────────────────────────────────────────────────────────────────

/** @public */
export type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

/** Styled `<form>` with consistent vertical field rhythm. */
export const Form = React.forwardRef<HTMLFormElement, FormProps>(function Form(
  { className, ...props },
  ref,
) {
  return <form ref={ref} className={cn('flex flex-col gap-4', className)} {...props} />;
});

// ── Field wiring (shared) ─────────────────────────────────────────────────────

/** @public */
export interface FieldWiringInput {
  /** Explicit control id. Defaults to a generated id. */
  htmlFor?: string;
  /** The control's own id, if it brings one. */
  childId?: string;
  /** Present when the field has helper text. */
  description?: string;
  /** Present when the field has an error. */
  error?: string;
}

/** @public */
export interface FieldWiring {
  /** Id shared by the label's htmlFor and the control. */
  controlId: string;
  descriptionId: string;
  errorId: string;
  /** Combined aria-describedby (description + error ids), or undefined. */
  describedBy?: string;
}

/**
 * Computes the stable ids + `aria-describedby` linking a label, helper text, and
 * error to a single control. Shared by `FormField` (clone path) and consumers
 * that render their control directly (e.g. the form adapter's `HdsFormField`).
 * @public
 */
export function useFieldWiring({
  htmlFor,
  childId,
  description,
  error,
}: FieldWiringInput): FieldWiring {
  const generatedId = React.useId();
  // One control id used for BOTH the label's htmlFor and the control, so the
  // association holds even when the child brings its own id.
  const controlId = htmlFor ?? childId ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;
  return { controlId, descriptionId, errorId, describedBy };
}

// ── FormFieldShell ─────────────────────────────────────────────────────────────

/** @public */
export interface FormFieldShellProps {
  /** Id of the control rendered as `children` (drives the label's htmlFor). */
  controlId: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** The already-rendered control (already carrying its own id/aria props). */
  children: React.ReactNode;
}

/**
 * Presentational label + control slot + helper/error markup. Renders `children`
 * verbatim — it does NOT clone — so it is safe to use with controls that own a
 * callback ref. Pair it with `useFieldWiring` to apply ids/aria yourself.
 * @public
 */
export const FormFieldShell = React.forwardRef<HTMLDivElement, FormFieldShellProps>(
  function FormFieldShell(
    { controlId, label, description, error, required = false, className, children },
    ref,
  ) {
    const descriptionId = `${controlId}-description`;
    const errorId = `${controlId}-error`;
    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)}>
        <label htmlFor={controlId} className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span aria-hidden="true" className="text-destructive">
              {' '}
              *
            </span>
          ) : null}
        </label>
        {children}
        {description && !error ? (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

// ── FormField ──────────────────────────────────────────────────────────────────

/** @public */
export interface FormFieldProps {
  /** Field label, associated to the control via htmlFor/id. */
  label: string;
  /** The single form control (native input, Select, Combobox, …). */
  children: React.ReactElement;
  /** Explicit control id. Defaults to a generated id. */
  htmlFor?: string;
  /** Helper text below the control; linked via aria-describedby. */
  description?: string;
  /** Error message; when set, marks the control aria-invalid and links it. */
  error?: string;
  /** Adds a required marker and sets `required` on the control. */
  required?: boolean;
  className?: string;
}

type WiredChildProps = {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/**
 * Label + description + error wrapper that wires the a11y relationships onto its
 * single child control via cloneElement. Validation-library agnostic — pass
 * `error` from whatever you use. For controls with an externally-managed callback
 * ref (e.g. react-hook-form), use `FormFieldShell` + `useFieldWiring` instead.
 * @public
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  { label, children, htmlFor, description, error, required = false, className },
  ref,
) {
  const child = React.Children.only(children) as React.ReactElement<WiredChildProps>;
  const { controlId, describedBy } = useFieldWiring({
    htmlFor,
    childId: child.props.id,
    description,
    error,
  });

  const wired = React.cloneElement(child, {
    id: controlId,
    required: child.props.required ?? required,
    'aria-invalid': error ? true : child.props['aria-invalid'],
    'aria-describedby':
      [child.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
  });

  return (
    <FormFieldShell
      ref={ref}
      controlId={controlId}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      {wired}
    </FormFieldShell>
  );
});
