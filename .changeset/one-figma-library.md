---
'@hirobius/design-system': patch
---

Figma links point at the one HDS library. Every `figmaUrl` in `public/hds-manifest.json` (the `./manifest` export) and every `@figma` tag now names file `2VgBbVpKiDnu0aftJEVyBQ`, "HDS Tokens & Components"; the file they named before is retired. Node ids are unchanged, so a tool that reads the node id keeps working, and one that stored a URL only needs the new file key. No component, prop, token or style changed.
