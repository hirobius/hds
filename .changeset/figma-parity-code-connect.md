---
'@hirobius/design-system': patch
---

Fix Figma mapping drift in the published `hds-manifest.json`. Alert declares its real `tone` axis (`success | danger | warning | info`), not `variant` / `error`. Button's `tone` is now documented. HeadingStack binds `subheading`. Dialog's Title, Description and close toggle bind to its compound parts. Avatar, Card, Divider and TextLockup declare their cva axes. Alert also carries its Figma node URL.
