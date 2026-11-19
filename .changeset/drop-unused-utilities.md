---
'@hirobius/design-system': minor
---

styles.css and tokens.css no longer ship 12 Tailwind utilities that no HDS component, docs page or Hirobius app (folio, job-hunt, ops) uses: `active:bg-transparent`, `dark:hover:brightness-100`, `duration-300`, `hover:bg-[color:var(--component-button-secondary-bg-rest)]`, `hover:bg-primary`, `hover:brightness-100`, `md:w-auto`, `min-h-[22px]`, `min-h-[30px]`, `pr-fixed-sm`, `pr-fixed-xs` and `py-3`. This frees size-budget room for the SegmentedControl edge fix and the one selected look without raising a budget.
