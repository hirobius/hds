---
'@hirobius/design-system': minor
---

Combobox: `<Combobox multiple creatable onCreate={(text) => …} />` is a chip input. Chips sit inline in the field before the text input, suggestions filter as you type, Enter adds the typed text through `onCreate`, an "Add “text”" option offers it when nothing matches exactly, and Backspace in an empty field removes the last chip. A value with no matching option shows as a chip labelled with the value. `ComboboxMultipleProps` gains `creatable?: false` and the new `ComboboxCreatableProps` joins `ComboboxAnyProps`; `multiple` without `creatable` is unchanged.
