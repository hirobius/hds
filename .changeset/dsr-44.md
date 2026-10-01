---
'@hirobius/design-system': patch
---

`Select` and `Combobox` name their open overlays, so a screen reader no longer enters a bare "listbox" or "dialog" (hds#398, hds#399). The open `Select` listbox is `aria-labelledby` its visible field label; with `showLabel={false}` it carries the `label` text as `aria-label`, and with an empty `label` the trigger's own name (the selected option). The `Combobox` popover (`role="dialog"`) takes the same name as the listbox inside it: the `aria-label` prop, or the `placeholder` when there is none, which clears axe's `aria-dialog-name` on the open popover. No prop changes meaning.
