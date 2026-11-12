---
'@hirobius/design-system': minor
---

Menu: `Menu.CheckboxItem` takes `indicator="switch"` for a setting row with a trailing switch (a `menuitemcheckbox` with `aria-checked`; the switch is decorative and the menu stays open when it flips), and `Menu.Item` and `Menu.CheckboxItem` take an optional `description` caption under the label, wired as the row's `aria-describedby` (hds#1440). The Menu docs demo gains a Settings menu, so its DOM baseline changes.
