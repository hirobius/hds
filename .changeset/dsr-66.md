---
'@hirobius/design-system': patch
---

Drop five runtime dependencies that nothing in the package imports after the 0.20.0 removals (hds#429), so installing the package no longer downloads them: `@radix-ui/react-context-menu` (ContextMenu), `@radix-ui/react-hover-card` (HoverCard), `@radix-ui/react-toolbar` (Toolbar), and `date-fns` and `react-day-picker` (the date pickers, ADR-034). No export changes and no bundle grows. A new test, `tests/runtime-dependencies.test.ts`, fails when a package in `dependencies` has no import site in shipped `src/`, or when the `pnpm-lock.yaml` root importer lists a different set.
