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
 * single child control. Validation-library agnostic — pass `error` from
 * whatever you use.
 * @public
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  { label, children, htmlFor, description, error, required = false, className },
  ref,
) {
  const generatedId = React.useId();
  const child = React.Children.only(children) as React.ReactElement<WiredChildProps>;
  // One control id used for BOTH the label's htmlFor and the control, so the
  // association holds even when the child brings its own id.
  const controlId = htmlFor ?? child.props.id ?? generatedId;
  const descId = `${controlId}-description`;
  const errId = `${controlId}-error`;

  const describedBy =
    [description ? descId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;

  const wired = React.cloneElement(child, {
    id: controlId,
    required: child.props.required ?? required,
    'aria-invalid': error ? true : child.props['aria-invalid'],
    'aria-describedby':
      [child.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
  });

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
      {wired}
      {description && !error ? (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
});
