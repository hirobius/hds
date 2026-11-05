---
'@hirobius/design-system': patch
---

Input now paints its background, text and border (rest and error) through `--component-input-bg`, `--component-input-text`, `--component-input-border` and `--component-input-borderError`, and Button `lg` pads through `--component-button-size-lg-paddingX`. The values are unchanged; overriding those component tokens now actually restyles the component (hds#595).
