---
'@hirobius/design-system': patch
---

The manifest (`public/hds-manifest.json`) points each core component and pattern at its docs-site page with `docsPage` (for example `/docs/components/button`), replacing `storyFiles` and `storyIds`. `AGENTS.md` and the llms files now point agents at the docs site instead of the Storybook stories.
