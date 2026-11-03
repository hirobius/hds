---
'@hirobius/design-system': patch
---

Toggle Buttons and AsyncState now crossfade for real (hds#938). When a toggle Button's text label changes, the old and new labels stay mounted and overlap while they fade; the button holds the wider of the two widths until the fade ends, and its accessible name switches to the new label straight away. AsyncState status changes (loading, error, empty, ready) crossfade the same way, with the outgoing block aria-hidden and inert so only the new state is announced. Under prefers-reduced-motion both swap instantly, with no overlap.
