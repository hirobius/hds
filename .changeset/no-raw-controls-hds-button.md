---
'@hirobius/design-system': patch
---

`hds/no-raw-controls` accepts a `<button>` whose `className` has the static.css `hds-button` class, as a string, a template literal, a ternary or a `cn(…)` argument (hds#1384). CSS-only consumers can drop their lint exception for such a button. A modifier class alone (`hds-button--primary`) still errors, and so do `<input>`, `<select>`, `<textarea>` and `<form>`.
