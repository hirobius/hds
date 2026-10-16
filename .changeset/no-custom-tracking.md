---
'@hirobius/design-system': minor
---

Letter-spacing now comes from the type tokens only. The `.tracking-wider` and `.tracking-widest` utility classes are removed from `styles.css`, and the ESLint plugin gains `hds/no-custom-tracking` (on in `recommended`, error): it flags Tailwind `tracking-*` classes, `[letter-spacing:...]` and inline `letterSpacing` that is not a `var(--semantic-typography-*)`. Use `<Text variant="...">` or a `.hds-type-<role>` class, which already set tracking.
