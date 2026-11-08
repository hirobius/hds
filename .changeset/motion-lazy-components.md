---
'@hirobius/design-system': patch
---

Alert, Toast, Tooltip, Disclosure, SegmentedControl, Checkbox, Radio, Toggle, Slider, FormField, InlineCode, ErrorPattern and AsyncState now animate with Motion's `m` inside `LazyMotion` (`domAnimation`), as Button does since 0.37 (hds#1386). No module imports the full `motion` component, so apps ship less animation code: a Vite app that imports Toast, Alert and Disclosure drops from 121.3 kB to 106.8 kB gzip. Markup, timing and looks do not change.
