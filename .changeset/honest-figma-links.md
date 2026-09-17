---
'@hirobius/design-system': patch
---

**fix(manifest):** `public/hds-manifest.json` no longer fills `figmaLink` with
`TODO:hds-master:<Name>` placeholders. Each `componentSpecs[]` and `utilities[]`
entry now carries a real Figma URL or `null`, so tooling can count linked
components directly. Consumers that treated any non-null `figmaLink`
as "has a Figma link" now get the right answer.
