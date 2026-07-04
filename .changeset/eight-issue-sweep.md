---
"@hirobius/design-system": minor
---

Autonomous issue sweep — additive components, tokens, and tooling (non-breaking):

- **HdsTooltip** (#69): new accessible hover/focus tooltip on Radix Tooltip — collision-aware positioning, ARIA, keyboard, delay; inverse-surface skin with arrow.
- **HdsThemeProvider + `useHdsTheme`** (#61): framework-agnostic theming contract over the four `data-*`/CSS-var dials (theme, density, brand, font), zero-JS compatible.
- **Textarea** (#73): new multi-line text-field primitive mirroring Input's token skin, with label/helper/error slots and Default/Focus/Error/Disabled states.
- **`semantic.typography.caption`** (#71): new 12/16 caption type composite in the token pipeline; `hds.typeStyles.caption` now resolves to it instead of aliasing `ui`.
- **Alert** (#72): lighter icon stroke (2 → 1.5) and title alignment nudge to match the Figma spec.
- Tooling (not shipped in the bundle): `pnpm hds:new` one-command component scaffold (#63) and a `design.md` → brand-overlay harvester (#67); source hygiene and suppression triage (#57).
