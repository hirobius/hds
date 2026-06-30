---
'@hirobius/design-system': minor
---

Add an optional React Hook Form + Zod form adapter on a new subpath:
`@hirobius/design-system/form`. It exports `useHdsForm(schema)` (RHF's `useForm`
pre-wired with a Zod resolver and `onTouched` validation), `HdsForm` (wraps the
presentational `Form` in RHF's `FormProvider` and routes submit through
`handleSubmit` + `noValidate`), and `HdsFormField` (a render-prop that binds a
control to RHF by `name` and surfaces the field's Zod error through the existing
HDS label/error/aria markup).

`react-hook-form`, `zod`, and `@hookform/resolvers` are **optional** peer
dependencies — only apps importing this subpath pull them in, so the main barrel
stays validation-agnostic and zero-dependency. The core `form` module also now
exports `FormFieldShell` + `useFieldWiring` (a non-cloning field-markup shell and
the shared id/aria computation) for controls that manage their own callback ref.
