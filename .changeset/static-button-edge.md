---
'@hirobius/design-system': minor
---

static.css: `.hds-button` and `.hds-button--primary` now draw the hard edge the React Button draws (the `component.button.depth.*` edge, sinking on hover and press, the per-accent `--hds-edge-primary` / `--hds-edge-primaryHover` for primary), so CSS-only pages no longer look flat beside React pages. Add `.hds-button--flat` to opt out; tertiary and link stay flat. No transition under reduced motion. The focus ring now wraps face and edge. (hds#1507)
