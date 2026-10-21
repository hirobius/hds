---
'@hirobius/design-system': minor
---

Avatar: `fallback="icon"` shows a neutral person icon (for a signed-out account), and `status` plus `statusLabel` put a Badge dot on the rim (for example `status="warning" statusLabel="Not synced"`). With no initials to derive, the icon now shows instead of an empty circle. The image is now clipped by an inner span, so the root no longer has `overflow-hidden`. The docs page shows the account-button recipe: Avatar as the `iconLeft` of a tertiary icon-only Button.
