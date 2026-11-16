---
'@hirobius/design-system': patch
---

The Figma parity score in `stats.json` rises from 89.6% to 89.9%. The parity check now compares the Figma Toast with the options of `toast()` (`ToastOptions`, read from the source), not with `ToastProvider`'s props. Its title, description and tone are checked against real fields, and the tone options against the tone variants. No component or prop changes.
