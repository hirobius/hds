---
'@hirobius/design-system': minor
---

`Tooltip` is public in the manifest again (hds#390). Component discovery read a JSDoc tag anywhere in a comment, so the words "an @internal image-expand pill" in Tooltip's description marked it `hidden` with category `Internal`. Tags now count only at the start of a JSDoc line. `componentSpecs.Tooltip` in `hds-manifest.json` is `hidden: false`, category `Overlays`, and the consumer skill lists it under Overlays. No other component changed.

Deprecated components carry their deprecation in the manifest (hds#390). A spec whose component JSDoc has `@deprecated` now gets `deprecated` (the notice), `removeIn` (from `@removeIn`) and `useInstead` (from `@useInstead` in the same block), declared as optional string properties in `manifest/schema.json` and typed on `ManifestComponentSpec`. Five specs carry them today: CinematicLink, ComponentInstanceMatrix, FoundationSwatch, Sketch and Token, each with `removeIn: "1.0.0"`. These components are still exported and still work, but the consumer skill (`skills/hds-consumer/SKILL.md`) and the `llms.txt` "Which one when" section and props digest no longer list them.
