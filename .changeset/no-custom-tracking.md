---
'@hirobius/design-system': minor
---

Letter-spacing now comes from the type tokens only. The `.tracking-widest` utility class is removed from `styles.css`, along with the stray Tailwind variables `--tracking-wider`, `--font-serif`, `--container-5xl`, `--color-slate-200`, `--color-slate-900` and `--color-stone-50` (generated as a side effect of scanning repo docs, never documented tokens). The ESLint plugin gains `hds/no-custom-tracking` (on in `recommended`, error): it flags Tailwind `tracking-*` classes, `[letter-spacing:...]` and inline `letterSpacing` that is not a `var(--semantic-typography-*)`. Use `<Text variant="...">` or a `.hds-type-<role>` class, which already set tracking.
