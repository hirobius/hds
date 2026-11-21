---
'@hirobius/design-system': minor
---

Rename the `primitive.color.blue` ramp to `primitive.color.info` (same values; feedback only, never an accent) and delete `primitive.color.projectBrand.microsoftGameDev.*` (a client brand does not belong in the shared library). The `--hds-accent-50..900` aliases now track the real accent ramp (graphite, or cobalt under `data-accent="cobalt"`) and are deprecated. The `--primitive-color-blue-*` CSS names and `hds.color.blue` stay one release as deprecated aliases of info.
