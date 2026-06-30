/**
 * `@hirobius/design-system/form`
 *
 * OPTIONAL React Hook Form + Zod adapter for HDS forms. Kept on its own subpath
 * so the main barrel stays validation-agnostic and zero-dependency — only apps
 * that import this entry pull in `react-hook-form`, `zod`, and
 * `@hookform/resolvers` (all declared as optional peer dependencies).
 *
 *   import { z } from 'zod';
 *   import { useHdsForm, HdsForm, HdsFormField } from '@hirobius/design-system/form';
 *
 *   const schema = z.object({ email: z.string().email('Enter a valid email') });
 *
 *   function SignUp() {
 *     const form = useHdsForm(schema, { defaultValues: { email: '' } });
 *     return (
 *       <HdsForm form={form} onSubmit={(values) => save(values)}>
 *         <HdsFormField name="email" label="Email">
 *           {(props) => <input type="email" className="…" {...props} />}
 *         </HdsFormField>
 *         <Button type="submit">Save</Button>
 *       </HdsForm>
 *     );
 *   }
 *
 * @doc-ignore  subpath barrel, not an HDS component
 */
export { useHdsForm } from './use-hds-form';
export { HdsForm, HdsFormField } from './hds-form';
export type { HdsFormProps, HdsFormFieldProps, HdsFieldRenderProps } from './hds-form';
