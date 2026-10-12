---
'@hirobius/design-system': patch
---

Token consolidation, no value changes. `semantic.color.border.subdued` is deprecated (use `semantic.color.border.default`: identical in Light, one step lighter in Dark, neutral.700 vs 800); it stays live at its current values until a later breaking release. In the Figma model every `$deprecated` token is now hidden from publishing, so the library picker drops `border/subdued`, the hds#206 spacing aliases (`space/component/gap|padding`, `space/layout/tight|normal|gutter|inset|spacious`) and `badge/bg|text`; the variables still exist, so bindings keep resolving. A tenant overlay no longer re-anchors a themed deprecated alias (one whose Dark value differs from its `$value`), which would have pinned it to its Light value in dark mode.
