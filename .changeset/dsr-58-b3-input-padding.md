---
'@hirobius/design-system': patch
---

`Input` now pads each side of the field with its own class and never with a `px-*` shorthand (hds#393). The shorthand used to override the side-specific padding in two ways. A `leadingVisual` with nothing trailing lost its icon inset, so the placeholder ran under the icon. At the `md` and `lg` sizes, a filled field, a `trailingVisual` and a loading field kept only the resting right padding, so long text ran under the clear button, the trailing icon or the spinner. Both now keep their inset. The new `prefix` and `suffix` slots get the same gap whether one or both are set, and the gap no longer changes on the first keystroke. A `px-*` passed through `inputClassName` still overrides both sides.
