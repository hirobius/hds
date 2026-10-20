---
'@hirobius/design-system': patch
---

Tag's unselected background, border and text now read `--component-tag-background`, `--component-tag-border` and `--component-tag-text` instead of the semantic tokens they alias, in `tag.tsx` and the `.hds-tag__pill` mirror in `static.css`. The values are unchanged, so nothing looks different; Figma and code now follow the same token (hds#595).
