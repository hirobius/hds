/**
 * useHdsForm — React Hook Form pre-wired with a Zod resolver.
 *
 * Part of the OPTIONAL `@hirobius/design-system/form` subpath. RHF + Zod are
 * optional peer dependencies, so consumers that never import this subpath pay
 * nothing for them (the main barrel stays validation-agnostic).
 *
 *   const schema = z.object({ email: z.string().email() });
 *   const form = useHdsForm(schema, { defaultValues: { email: '' } });
 *
 * @doc-ignore  adapter for the ./form subpath, not an HDS component
 */
import { useForm, type UseFormProps, type UseFormReturn, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

/**
 * Thin wrapper over RHF's `useForm` that pre-wires `zodResolver(schema)` and
 * defaults validation to `onTouched` (errors surface after a field blurs, not on
 * every keystroke). The schema's parsed output type drives the form's field
 * types, so `form.handleSubmit` hands you a fully-typed, validated value object.
 *
 * @public
 */
export function useHdsForm<TFieldValues extends FieldValues>(
  schema: ZodType<TFieldValues>,
  options?: Omit<UseFormProps<TFieldValues>, 'resolver'>,
): UseFormReturn<TFieldValues> {
  return useForm<TFieldValues>({
    mode: 'onTouched',
    ...options,
    // @hookform/resolvers v5 + zod v4 model the resolver through separate
    // input/output generics that don't unify against a single TFieldValues
    // parameter. The schema parses TO TFieldValues here, so the cast is sound
    // and keeps the public return type a plain UseFormReturn<TFieldValues>.
    resolver: zodResolver(schema as ZodType) as UseFormProps<TFieldValues>['resolver'],
  });
}
