---
'@hirobius/design-system': patch
---

Text fields on a phone or touch screen: Input (sm, md), Textarea, TokenField and the Combobox and CommandPalette search fields set their text at 16px under 640px or on a coarse pointer, so iOS Safari no longer zooms the page when one takes focus. Input's end padding while the clear button shows is now 44px at every size (was 28px sm, 36px md), the width the clear button grows to on touch, so typed text never runs under it (hds#863). Desktop with a fine pointer keeps its type sizes.
