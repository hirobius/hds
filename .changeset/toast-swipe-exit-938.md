---
'@hirobius/design-system': patch
---

A toast now follows the pointer while it is swiped and slides out toward the swipe edge when dismissed, instead of vanishing in place. A swipe that does not pass the dismiss threshold snaps back. Button and timer dismissals take the same slide-out. The visuals are CSS in theme.css (`.hds-toast`) keyed off the `data-swipe` / `data-swipe-direction` attributes and `--radix-toast-swipe-*` variables Radix already stamps on the toast root, timed on the existing productive and exit motion tokens — no new token values. Under `prefers-reduced-motion` the follow and the slide are dropped and the toast unmounts at once (hds#938).
