---
'@hirobius/design-system': patch
---

fix(theming): the font dial now works (hds#478).

Setting `--hds-font-family` / `--hds-font-family-mono` (or `<HdsThemeProvider fontFamily fontFamilyMono>`) used to change nothing: the type roles were resolved once on `:root`, so descendants inherited the default stack. They are now re-declared on each element of the `[data-hds]` subtree, so the dial applies at whatever scope you set it — headings, body, UI text, captions, code, and the JS style objects (`hds.fontFamily`, `hds.typeStyles`) all follow it. With no override, nothing changes: the default is still the brand typeface.
