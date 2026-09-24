---
'@hirobius/design-system': minor
---

Type-ramp prerequisites (hds#283, steps 0–3). **Removes six unused primitive tokens**: `--primitive-typography-size-2xs`, `--primitive-typography-weight-light`, `--primitive-typography-weight-semibold`, and `--primitive-typography-letterSpacing-tighter` / `-wide` / `-wider`. None had a consumer in hds, ops or concrete. Icons are now sized from `primitive.size.16/20/24` instead of the type scale; a `tracking-caps` utility replaces stock `tracking-wide` for eyebrow text; DateInput and DateTimeInput calendar buttons no longer collapse under flexbox; and a type specimen story documents the scale.
