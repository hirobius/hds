---
'@hirobius/design-system': patch
---

`upgrade/schema.json` now describes the optional `props`, `types` and `dom` sections of a release snapshot, so the 0.33.0 snapshot validates. Four 0.33.0 upgrade steps get detectors, so `hds upgrade` no longer lists them as do-by-hand for a project that does not use what they changed (hds#1145).
