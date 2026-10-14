---
'@hirobius/design-system': patch
---

Props typed by a named alias now carry their values in `component-api.json`, the manifest and `llms-full.txt`: `Input.size` is `"sm" | "md" | "lg"` instead of `InputSize`, and `Stack.gap`, `Card.gap`, `Card.padding`, `Surface.padding` and `Text.variant` list their literals the same way (in source order). The manifest gives each of them a `type: "enum"` row and a `propConstraints` entry again. `Card.requiredProps` no longer names `children`, which `Card.props` does not list (hds#406, hds#413).
