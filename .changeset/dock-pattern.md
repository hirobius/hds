---
'@hirobius/design-system': patch
---

Dock: new bottom action bar for phones (hds#1432). `<Dock>` holds a screen's main actions fixed to the bottom edge below `sm` (640px), with the safe-area insets under its padding. While a text field has focus, or the on-screen keyboard is open (read from `visualViewport`), it slides away on the spatial motion token, and it comes back when focus leaves the field. Under reduced motion it only fades. From `sm` up it sits inline and never hides. `hideOnInput={false}` keeps it in place. Pin is unchanged and stays the sticky-top primitive.
