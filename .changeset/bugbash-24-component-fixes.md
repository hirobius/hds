---
'@hirobius/design-system': patch
---

Bug bash 24 component fixes. Keyboard focus no longer repositions a control (`.hds-focus:focus-visible` dropped `position: relative`, which moved Dialog and AlertDialog content to the end of the page and shifted Radio, Toggle and the CodeBlock copy button). The off Toggle thumb is visible, the active Tab shows its 2px underline, CodeBlock copy buttons are `type="button"` and a CodeBlock is a landmark and tab stop only when its code overflows (named by the filename or language). A disabled Radio fades like Checkbox and Toggle. `Button` `label` now sets the accessible name whenever it is given, not only for icon-only buttons.
