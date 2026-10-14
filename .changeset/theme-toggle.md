---
'@hirobius/design-system': patch
---

New `ThemeToggle`: one button that switches light and dark, with an inline SVG sun that morphs into a moon (the rays retract and a mask slides in to cut the crescent). It reads and sets the theme through `ThemeContext` (follows the OS until the user picks, then remembers the choice and sets `data-theme` on `<html>`), or takes `isDark` and `onToggle` to drive it from your own theme state. The accessible name says what happens next ("Switch to dark theme" or "Switch to light theme"). It keeps the `hds-focus` ring and a 44px touch target, and the morph runs on motion tokens only and stops under `prefers-reduced-motion`. `<ThemeToggle />`.
