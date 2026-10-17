---
'@hirobius/design-system': patch
---

Dark accent states now lighten step by step: `--semantic-accent-hover` moves from graphite-300 to graphite-100 and `--semantic-accent-pressed` from graphite-400 to graphite-50 (rest stays graphite-200). `content-onAccent` contrast is 10.0 rest, 12.3 hover, 13.8 pressed (pressed was 4.17:1, under AA). Primary Button pressed now binds a new `component.button.bgPressed` token (`--component-button-bgPressed` → `semantic.accent.pressed`) instead of a 5% wash on the hover fill, which sat 1/255 off hover in dark; light pressed is now graphite-900 (was graphite-800 plus a 5% black wash, about the same). A new test fails if any rest/hover/pressed step, or a Button's hover vs pressed fill, comes within 1.05:1. Contrast gate now covers onAccent on accent rest, hover and pressed. Consumers can drop any held floor on this pair (hds#748).
