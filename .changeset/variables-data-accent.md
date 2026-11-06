---
'@hirobius/design-system': patch
---

`variables.css` now ships the opt-in accent blocks (`[data-accent='cobalt']`, light and dark), the same ones `styles.css` and `tokens.css` carry (hds#1313). A token-only consumer that loads only `variables.css` can set `data-accent="cobalt"` on `<html>` or a wrapper to switch the accent. Without `data-accent`, nothing changes.
