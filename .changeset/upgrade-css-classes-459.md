---
'@hirobius/design-system': patch
---

The upgrade command checks class tokens against the target's `dist/css-contract.json` (hds#459). An `hds-*` class or a Tailwind variant class (`hover:underline`) in a `class` / `className` attribute that the release does not ship is listed under Do by hand; when the consumer compiles its own Tailwind (`tailwindcss` in its package.json), a utility is listed as info only. The consumer's own classes are never checked.
