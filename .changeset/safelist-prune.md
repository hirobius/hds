---
'@hirobius/design-system': minor
---

`tokens.css` and `styles.css` drop 42 Tailwind utilities that only the hds#449 safelist kept: no HDS component, docs page or fleet consumer uses them (hds#1205; the list is in the upgrade note and on the issue). The upgrade command flags any markup that still writes one.
