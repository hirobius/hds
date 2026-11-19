---
'@hirobius/design-system': minor
---

styles.css and tokens.css drop 47 utilities that no HDS component, docs page or Hirobius app (folio, job-hunt, ops) uses. The upgrade note lists every class. Tailwind no longer scans code that never renders: the token prose index (`generated-token-descriptions.ts`, whose words read as class names), the Code Connect templates (`*.figma.ts`) and test fixtures. Utilities that carry a Tailwind theme variable (`text-base` to `text-5xl`, `font-semibold`, `max-w-md`, `max-w-7xl`, `focus:ring-offset-*`) stay, so no CSS variable is removed.
