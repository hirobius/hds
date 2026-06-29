---
"@hirobius/design-system": minor
---

Add **HdsCheckbox** — a custom-drawn checkbox primitive with `checked`, `indeterminate` (aria-checked="mixed" + DOM property), disabled, and label support, on the shared interaction-state seam.

Also export the existing input-family primitives that were built but missing from the public barrel: **HdsToggle**, **HdsRadio**, and **HdsSlider**. Consumers can now import the full form-control set (`Input`, `Field`, `Select`, `SegmentedControl`, `HdsCheckbox`, `HdsToggle`, `HdsRadio`, `HdsSlider`) from the package root.
