---
'@hirobius/design-system': minor
---

Button and IconButton express the pressed state through a token (hds#322). `semantic.color.state.pressed.overlay` is a new opaque colour (black in light, white in dark) exposed as `role.pressed-overlay` and the Tailwind colour `pressed-overlay`; Button applies it as `active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5`, an inset box-shadow wash that composes with the focus ring and any consumer `shadow-*`, in place of `active:brightness-95 dark:active:brightness-110`. The visible change: a press now tints the control's fill only (label and icons are no longer run through the filter), reads 5% white rather than a 110% brightness bump in dark mode, and no longer transitions; the tone variants' hover brightness is unchanged. The variable ships in the Figma model so the staging Pressed variants can bind their overlay fill to it instead of a hard-coded 5% black.
