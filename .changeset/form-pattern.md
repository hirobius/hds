---
"@hirobius/design-system": minor
---

Add **Form** + **FormField** — a validation-agnostic form seam. `Form` is a styled `<form>` with consistent field rhythm; `FormField` owns the a11y wiring (label↔control association, `aria-invalid`, `aria-describedby` for description + error, required marker) and accepts a plain `error` string. HDS takes **no** form/validation dependency — the validation source is whatever the consumer brings (native constraint validation, react-hook-form, zod, Formik). Mirrors the router-adapter philosophy: works with zero deps, richer when you inject your own. (The `Input` primitive already self-wires its label/error, so use its props directly; `FormField` is for controls that don't, e.g. native inputs, `Select`, `Combobox`, checkboxes.)
