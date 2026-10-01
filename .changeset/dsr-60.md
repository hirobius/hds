---
'@hirobius/design-system': minor
---

`Combobox` takes `multiple` (hds#393). `<Combobox multiple value={values} onChange={setValues} options={options} />` picks any number of values: `value` is a `string[]` and `onChange` receives the next array. Picking an option, by click or Enter, adds or removes it and keeps the list open. The listbox is `aria-multiselectable` and every option carries `aria-selected`. The trigger shows a count (`2 selected`), and each value appears below it as a chip button named `Remove <label>`. Removing a chip moves focus to the next chip, or to the trigger when none are left. The props are a union of two arms: `ComboboxProps`, the single-select arm, is unchanged apart from an optional `multiple?: false`; `ComboboxMultipleProps` is the new arm; and `ComboboxAnyProps` names either. It is the replacement for `MultiSelector`: `<MultiSelector value onChange options />` becomes `<Combobox multiple value onChange options />`.
