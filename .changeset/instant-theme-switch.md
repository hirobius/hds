---
'@hirobius/design-system': minor
---

Theme switch is instant (hds#1399). ThemeProvider sets `data-hds-theme-switching` on `<html>` for one frame while it flips `data-theme`, and theme.css turns every transition off during that frame, so colours no longer fade between themes. New motion tokens `semantic.motion.transitionColor` and `semantic.motion.transitionShadow` (productive, 150ms decelerate) back the `.transition-colors` and `.transition-all` utilities, and reduced motion zeroes them.
