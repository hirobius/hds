---
'@hirobius/design-system': patch
---

Figma links point at the one HDS library. Every `figmaUrl` in `public/hds-manifest.json` (the `./manifest` export) and every `@figma` tag now names file `2VgBbVpKiDnu0aftJEVyBQ`, "HDS Tokens & Components"; the file they named before is retired. Node ids are unchanged, so a tool that reads the node id keeps working, and one that stored a URL only needs the new file key. New components are drafted in a separate file, "HDS Staging", and redrawn in the library before they ship, so no link the package carries ever names HDS Staging. No component, prop, token or style changed.
