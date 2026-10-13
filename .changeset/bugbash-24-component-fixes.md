---
'@hirobius/design-system': patch
---

Bug bash 24 component fixes. Keyboard focus no longer repositions a control (`.hds-focus:focus-visible` dropped `position: relative`, which moved Dialog and AlertDialog content to the end of the page and shifted Radio, Toggle and the CodeBlock copy button). The off Toggle thumb is visible, the active Tab shows its 2px underline, CodeBlock copy buttons are `type="button"` and a CodeBlock is a landmark and tab stop only when its code overflows (named by the filename or language). A disabled Radio fades like Checkbox and Toggle. `Button` `label` now sets the accessible name whenever it is given, not only for icon-only buttons.

Popover content is named by its trigger by default. SegmentedControl arrow, Home and End keys now select like a radio group, and its segments step down to 8px inline padding on a phone. Disclosure, Tabs, Breadcrumb, Slider, Menu, Select, Combobox, Dialog close, Toast dismiss and Input clear opt into the 44px mobile touch-target classes. The highlighted Menu, Select and Combobox item fill is a step from the popover surface.

`Page` now pads its content with the region gutter (24px, 16px below 640px), so content no longer runs flush to the viewport edges. Card parts (`Header`, `Body`, `Footer`, `Progress`, `Metric`) add no second inset inside a padded Card (they kept 24px each, so text sat 49px in, not 25px); under `padding="none"` they still pad themselves. An accent Card is the same height as its siblings. `MetadataList` `variant="divided"` no longer draws a padded, bordered box: it is rules between pairs, with the term at the same x as the plain variant and the value in body type.

A `FormField` error now changes the control: Input, Textarea, Select and Combobox draw the destructive border when `aria-invalid` is set, not only from their own `error` prop. Input and Textarea labels sit 8px above the control like Select and FormField (was 6px). `Select` gains a `placeholder` prop, default `Select…`, shown while `value` matches no option.
