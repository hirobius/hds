---
'@hirobius/design-system': patch
---

Variant contract (#60): migrate `HeadingStack` from CSS-in-JS (inline `style` + a `LEVEL_STYLES` `CSSProperties` map) to Tailwind + `cva`, formalizing `level` (`heading1 | heading2 | heading3`) as a cva variant and `gap` (`px4 | px8`) as a second, layout-axis variant (mirroring `Divider`'s `orientation`). Every emitted class binds the exact same `--semantic-typography-*`/`--semantic-color-content-*`/`--primitive-space-*` custom property the removed inline styles referenced — zero visual change. Public prop API, defaults, and tag overrides (`as`/`headingAs`/`subheadingAs`) are unchanged; non-breaking.
