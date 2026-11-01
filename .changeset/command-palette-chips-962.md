---
'@hirobius/design-system': minor
---

`CommandPalette` items can now declare `args`: a command with arguments no longer runs when picked — the palette walks its argument steps instead, showing the command and each chosen argument as a Tag chip before the search field. An argument with `options` is picked from a filtered list; without them it is free text taken on Enter. Backspace on an empty field (or a chip's remove button) steps back. Once every argument is collected, `onSelect` is called with the item and a record of argument id to chosen value. Single-step commands behave exactly as before (hds#962).
