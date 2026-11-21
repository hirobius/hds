---
'@hirobius/design-system': patch
---

`variables.css` now ships the phone-width token steps (below 640px), so a page that loads it before `styles.css` paints the phone values at once instead of the desktop ones followed by a layout shift when `styles.css` loads (0.46 and 0.47). The steps move to one source, `responsive-tokens.css`, which `styles.css` and `tokens.css` take through `index.css`; `theme.css` no longer holds a copy. A test fails when a copy comes back.
