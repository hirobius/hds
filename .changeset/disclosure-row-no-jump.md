---
'@hirobius/design-system': minor
---

Fix Disclosure: opening a row no longer makes the rows below jump twice (hds#1508). The wrapper keeps a constant gap and the space above the body is now the body's own top padding, so it tweens with the height; the row's preview collapses on the same tween instead of vanishing in the opening frame. The DOM changes (a preview stays mounted for the length of the tween, the label-to-preview gap moves onto it, and the wrapper gap no longer changes), so a consumer that overrode the inline gap or `.overflow-hidden` with `!important` can drop that override.
