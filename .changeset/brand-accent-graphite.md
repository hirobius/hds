---
'@hirobius/design-system': minor
---

feat(brand): change the default accent from apple green to graphite (warm charcoal).

The base brand accent moves from the bright apple green shipped in 0.23.0 to a warm
graphite — a full-monochrome accent that reads calmer and more considered. A new
`primitive.color.graphite` scale replaces `primitive.color.apple`; feedback hues
(`green`/`red`/`amber` for success/danger/warning) are untouched, so the system stays
monochrome without flattening its status colors.

- `semantic.accent.{rest,hover,pressed,content,contentHover,subtle}`, `semantic.color.surface.accent`/`accentSubtle`, `semantic.color.content.accent`, and `semantic.color.border.accent` now resolve through `primitive.color.graphite.*`.
- The accent **inverts per theme** so fills never vanish on a dark page: a dark graphite step in light mode (near-white on-accent text) and a light warm-grey step in dark mode (dark on-accent text). `semantic.color.content.onAccent` flips to `neutral.50` in light mode and `graphite.900` in dark mode — `content.onAccent / surface.accent` is 10.5:1 light / 10.0:1 dark.
- Per-tenant accents are unchanged: `accent-lilac` and `concrete-creations` set their own accent (and their own `onAccent`); `brutalist-demo` inherits the new graphite base.

The `--primitive-color-apple-*` CSS variables (introduced in 0.23.0) are removed in favor of `--primitive-color-graphite-*`; consumers who referenced a raw accent primitive should repoint to the graphite scale, though the semantic accent tokens are the intended surface and the per-tenant accent knob is unchanged — set your own accent overlay to override the base.
