---
'@hirobius/design-system': patch
---

fix(disabled): unify the disabled state onto per-component tokens, off the global opacity multiplier.

DESIGN.md forbids a global disabled-state rule (opacity multiplier); disabled presentation must be governed per-component through its dedicated disabled tokens. Button, Combobox, Input, Textarea, Tabs and Tag were dimming with `disabled:opacity-50`/`opacity-70` — now they use `content.disabled` text (and a neutral `bg-muted` surface where a fill is needed), matching Checkbox/Radio/Toggle/SegmentedControl.

- **Button** — disabled is now `bg-muted` + `content-disabled` text for every variant AND tone (a disabled danger/success/… button now reads as disabled instead of fully coloured). Note: the pre-existing `component-button-primary-bgDisabled`/`textDisabled` tokens resolve to `accentSubtle` + `content-onAccent`, which render near-white-on-near-white under the neutral accent, so the component uses the neutral `bg-muted` pair instead (token fix tracked separately).
- **Input / Textarea** — drop the redundant `disabled:opacity-70`; keep `bg-muted`, switch disabled text to `content-disabled`.
- **Combobox / Tabs / Tag** — `disabled:opacity-50` → `content-disabled` text.

Visual-only; no API changes.
