---
'@hirobius/design-system': minor
---

Add an optional Material UI theme preset on a new subpath:
`@hirobius/design-system/mui`. `hdsMuiThemeOptions()` returns an MUI
`ThemeOptions`-shaped object whose palette is wired to HDS token CSS variables
(`error`/`warning`/`info`/`success` map to the same feedback tokens as
`<Button tone>` / `<Badge tone>`), so MUI-based apps theme from HDS without a
local token-copy step. It imports no MUI code (structural return type), so it
adds zero weight and no peer requirement unless imported. Designed for MUI v6+
CSS-variables mode: `createTheme({ cssVariables: true, ...hdsMuiThemeOptions() })`.
