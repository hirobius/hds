---
'@hirobius/design-system': patch
---

`HdsFieldRenderProps` types `ref` as `React.Ref<never>` and `value` as `any` (were `Ref<unknown>` and `unknown`), so the render props spread onto `<input>`, `<select>` and `<textarea>` as docs/CONSUMING.md section 8.5 shows, instead of failing `tsc` with TS2322.
