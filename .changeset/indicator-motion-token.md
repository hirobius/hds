---
'@hirobius/design-system': patch
---

The Progress fill and the active Tabs indicator now move on the productive motion token (hds#751). Progress dropped its raw 300ms ease-out; a tab's underline, tint and text colour fade with it instead of Tailwind's untimed 150ms default. Both stop under prefers-reduced-motion.
