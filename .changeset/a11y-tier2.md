---
'@hirobius/design-system': patch
---

fix(a11y): Tier-2 accessibility fixes across the primitives.

- **Radio / Checkbox / Toggle** show a keyboard focus ring only on `:focus-visible` (not on mouse click), and focus is no longer masked by hover (focus now outranks hover in `useInteractionState`).
- **Input / Textarea / FormField** no longer point `aria-describedby` at a description that isn't rendered (error replaces helper); `Input`'s `loading` uses `readOnly` + `aria-busy` instead of `disabled`, so a search-as-you-type field keeps focus.
- **Select** renders a real `<label htmlFor>` wired to the trigger, so clicking the label focuses it.
- **Combobox** keyboard: options are not tab stops, Arrow keys skip disabled options and scroll the active one into view, option ids are index-based (no break on special chars), and the active index resets on open / option change.
- **Tabs** focus ring is `ring-inset` so it isn't clipped by the scroll container.
- **InlineLink** only treats a single-leading-slash path as an internal router link (not `//host`); `mailto:`/`tel:`/`#hash` are plain same-tab links; external links keep `target=_blank` + a visually-hidden "(opens in new tab)"; the internal branch gains `hds-focus`.
