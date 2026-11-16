---
'@hirobius/design-system': patch
---

The Figma parity score in `stats.json` rises from 89.2% to 89.6%. The parity check no longer counts five differences that were mistakes in the check: a Radix part's text is its children, a Button passed into a slot is not nesting, and Stack's px gap steps are recorded as code-only. `Form` is now a layout primitive, so it has no `@figma` link in the manifest and no Code Connect map entry. No component or prop changes.
