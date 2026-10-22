---
'@hirobius/design-system': minor
---

Soft surfaces by default (#891) and the hard shadow + wipe by default (#888). Looks different, no code change needed.

- **Button**: `hoverEffect` now defaults to `"wipe"` and a new `shadow` prop defaults to `"hard"` (a zero-blur shadow in `semantic.color.shadow.hard`: 3px at rest, lifts to 5px on hover, sinks to 1px on press; primary and secondary only, tertiary stays quiet, never on disabled). Opt out per button with `hoverEffect="none"` and/or `shadow="none"`. Secondary is now a soft tonal fill with no border (`component.button.secondary.bg.rest` → new `semantic.color.surface.soft`, hover → new `semantic.color.surface.softHover`, pressed → `surface.soft`); its 3:1 boundary is the hard shadow. The three `component.button.secondary.border.*` tokens stay defined but Button no longer draws them (`rest` and `disabled` are deprecated).
- **Kbd**: defaults to the same light source, a 2px hard key shadow in `semantic.color.shadow.hard` with a `border.strong` edge (`--semantic-shadow-key` still overrides it).
- **`semantic.color.shadow.hard`** in Dark is now `neutral.500` (`border.interactive`), not `neutral.600`, so the button boundary reaches 3:1 on page, raised and overlay surfaces.
- **No resting outline** on Dialog, AlertDialog, Menu, Popover, Select listbox, Toast (they separate by the overlay fill and shadow), CodeBlock (raised fill; the header is a muted band), Table frame (row and column dividers stay), Tabs list divider, SegmentedControl track (now a `surface.muted` fill), Board column header, FormActions sticky bar (a raised band) and the selected chips of Combobox, ComboboxCreatable and TokenField (`surface.muted` fill).
- **Tag**: unselected pill is a soft `surface.muted` fill with no visible edge (`component.tag.background` and `component.tag.border` → `semantic.color.surface.muted`); hover, pressed and selected borders are unchanged.
- Card was already borderless by default; `<Card bordered>` still brings the 1px `border.default` edge back. Inputs, focus rings, selected states, feedback tones and table dividers keep their borders.
- Removed dead CSS: the unused `.hds-tag-btn` / `.hds-tag-pill` rules and the unused `.border-stroke`, `.border-stroke-accent` and `.border-[color:var(--hds-border)]`-style helper utilities that read undefined `--hds-fill` / `--hds-hover` / `--hds-border` variables.
