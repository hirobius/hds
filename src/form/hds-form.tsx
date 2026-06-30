/**
 * HdsForm + HdsFormField — the `@hirobius/design-system/form` adapter that binds
 * React Hook Form state to the presentational HDS form markup (label, helper
 * text, error, and the aria wiring). No styling or a11y logic is reimplemented
 * here — `HdsFormField` reuses `FormFieldShell` + `useFieldWiring` from the core
 * `form` module and only injects RHF's controlled value/onChange/ref onto the
 * control the consumer renders.
 *
 * `HdsFormField` uses a render-prop (not a cloned child) on purpose: react-hook-
 * form's `useController` hands back a callback `field.ref`, and cloning an element
 * that carries such a ref detaches it and silently breaks validation wiring. The
 * render-prop lets the consumer spread the binding onto a directly-rendered
 * control, so the ref attaches exactly once.
 *
 * `'use client'` marks the module as client-only for React Server Components
 * (Next.js app router). It is ignored by Vite/Astro bundlers — in Astro this
 * whole form must live inside a hydrated island (e.g. `client:load`) because
 * RHF relies on hooks and refs.
 *
 * @doc-ignore  adapter for the ./form subpath, not an HDS component
 */
'use client';

import * as React from 'react';
import {
  FormProvider,
  useController,
  type UseFormReturn,
  type FieldValues,
  type FieldPath,
} from 'react-hook-form';
import { Form, FormFieldShell, useFieldWiring } from '../app/components/form';

/** @public */
export interface HdsFormProps<TFieldValues extends FieldValues> extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'onSubmit'
> {
  /** The form object returned by `useHdsForm`. */
  form: UseFormReturn<TFieldValues>;
  /** Called with the parsed, validated values once the schema passes. */
  onSubmit: (values: TFieldValues) => void | Promise<void>;
  children: React.ReactNode;
}

/**
 * Wraps the presentational `Form` in RHF's `FormProvider` and routes submission
 * through `handleSubmit` so `onSubmit` only fires with schema-valid values.
 * @public
 */
export function HdsForm<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  ...formProps
}: HdsFormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      {/* noValidate makes Zod the single validation authority: without it the
          browser's native constraint validation (e.g. <input type="email">)
          runs first and can block submit before RHF/Zod sees the value.
          Consumers can re-enable native validation via formProps. */}
      <Form noValidate onSubmit={form.handleSubmit(onSubmit)} {...formProps}>
        {children}
      </Form>
    </FormProvider>
  );
}

/**
 * Props handed to `HdsFormField`'s render function — spread them onto your
 * control. They combine RHF's field binding (`name`/`value`/`onChange`/`onBlur`/
 * `ref`) with HDS's a11y wiring (`id`/`aria-invalid`/`aria-describedby`).
 * @public
 */
export interface HdsFieldRenderProps {
  name: string;
  value: unknown;
  onChange: (...args: unknown[]) => void;
  onBlur: (...args: unknown[]) => void;
  ref: React.Ref<unknown>;
  id: string;
  required?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** @public */
export interface HdsFormFieldProps<TFieldValues extends FieldValues = FieldValues> {
  /** Field name — a typed path into the form's values. */
  name: FieldPath<TFieldValues>;
  /** Field label, associated to the control via htmlFor/id. */
  label: string;
  /** Render the control, spreading the supplied props (binding + a11y) onto it. */
  children: (props: HdsFieldRenderProps) => React.ReactElement;
  /** Helper text below the control; linked via aria-describedby. */
  description?: string;
  /** Adds the required marker + sets `required` on the control. */
  required?: boolean;
  className?: string;
}

/**
 * Binds a control to RHF by `name` and renders it inside the presentational
 * field markup. The control is supplied via a render function so RHF's callback
 * ref attaches directly (no clone). The field's validation error (its `message`
 * from the Zod schema) is shown through the same label/error/aria markup the
 * core `FormField` uses.
 *
 *   <HdsFormField name="email" label="Email">
 *     {(props) => <input type="email" className="…" {...props} />}
 *   </HdsFormField>
 *
 * @public
 */
export function HdsFormField<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  children,
  description,
  required,
  className,
}: HdsFormFieldProps<TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({ name });
  const error = fieldState.error?.message;
  const { controlId, describedBy } = useFieldWiring({ description, error });

  const renderProps: HdsFieldRenderProps = {
    name: field.name,
    // Coalesce nullish to '' so a controlled input never flips to uncontrolled.
    value: field.value ?? '',
    onChange: field.onChange,
    onBlur: field.onBlur,
    ref: field.ref,
    id: controlId,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };

  return (
    <FormFieldShell
      controlId={controlId}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      {children(renderProps)}
    </FormFieldShell>
  );
}
