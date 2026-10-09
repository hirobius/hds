---
'@hirobius/design-system': patch
---

feat(brand): set the default accent to a bright apple green.

The base brand accent moves from a neutral (monochrome) to a bright apple green. A
new `primitive.color.apple` scale backs it, kept distinct from the emerald `green`
feedback/success scale so an accent and a success state never read as the same hue.

- `semantic.accent.{rest,hover,pressed,content,contentHover,subtle}`, `semantic.color.surface.accent`/`accentSubtle`, `semantic.color.content.accent`, and `semantic.color.border.accent` now resolve through `primitive.color.apple.*`.
- `semantic.color.content.onAccent` flips to a dark neutral (`neutral.900`) in both modes, since a bright accent fill needs dark text to clear AA — `content.onAccent / surface.accent` is 7.2:1 light / 9.3:1 dark.
- Per-tenant accents are unchanged: `accent-lilac` and `concrete-creations` set their own accent (and their own white `onAccent`); `brutalist-demo` inherits the new green base.

Visual-only; no API changes. The accent remains a single per-tenant knob — consumers who set their own accent overlay are unaffected.
