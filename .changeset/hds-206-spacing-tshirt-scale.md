---
'@hirobius/design-system': minor
---

Add `semantic.space.scale.{xs,sm,md,lg,xl}` — one monotonic t-shirt spacing
scale (8/16/24/32/48px) per Adrian's 2026-09-26 decision on hds#206. The
existing gap families (`layout.tight/normal/gutter/inset/spacious`,
`component.gap/padding`) are unchanged and kept live as deprecated aliases —
no breaking change. Adds `check-spacing-vocabulary` (warn-severity, manual/
on-demand) flagging raw integer literals on Box `sx` spacing props (the
px-ambiguous form hds#206 identifies), registered in
`docs/guardrails/registry.json`. Consumer codemod off the deprecated names,
alias removal, and unifying `Stack`'s gap resolver with `box-sx`'s are
tracked as remaining hds#206 work.
