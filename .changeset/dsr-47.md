---
'@hirobius/design-system': minor
---

`Tooltip` is public in the manifest again (hds#390). Component discovery read a JSDoc tag anywhere in a comment, so the words "an @internal image-expand pill" in Tooltip's description marked it `hidden` with category `Internal`. Tags now count only at the start of a JSDoc line. `componentSpecs.Tooltip` in `hds-manifest.json` is `hidden: false`, category `Overlays`, and the consumer skill lists it under Overlays. No other component changed.
