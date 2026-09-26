---
'@hirobius/design-system': minor
---

Standard type ramp (Adrian's 2026-09-26 decision on hds#283): lift Tailwind 4's
ten default `fontSize` steps into `primitive.typography.size.*` verbatim —
`xs` 13→12, `sm` 15→14, `base` 17→16, `lg` 20→18, `xl` 24→20, `2xl` 30→24,
`3xl` 36→30, `4xl` 48→36, `5xl` 72→48, `6xl` 80→60 — and repoint every
semantic composite at its new rung per the 2026-09-24 audit table:

- Rendered size changes: `body` 17→16px, `ui` 15→14px, `display` 72→60px,
  `eyebrow`/`caption` 13→12px (closes the eyebrow/caption duplicate), `mono`
  13→14px (repointed off `xs`, since `xs` alone now gives 12px).
- Rendered size unchanged, rung renamed to keep the primitive scale
  monotonic: `h1` (`4xl`→`5xl`, 48px), `h2` (`2xl`→`3xl`, 30px, line-height
  42px→40px onto the 4px grid), `h3` (`lg`→`xl`, 20px).
- `component.button.size.{sm,md,lg}.fontSize` descriptions corrected
  (13/15/17px → 12/14/16px); `tag`/`badge`.fontSize already referenced
  `primitive.typography.size.xs` and pick up 12px automatically.
- `--semantic-typography-display-font-size` clamp max in `src/styles/theme.css`
  updated 72px→60px to match.
- Hardcoded `text-[10px]` / `text-[11px]` / `text-[15px]` classes that bypassed
  the ramp (`command-palette.tsx`, `badge.tsx`, `segmented-control.tsx`)
  replaced with ramp-driven `text-xs` / `text-sm` utilities (now that
  `tailwind.config.tokens.cjs` wires `fontSize.*` straight onto these same
  primitives, this also closes the fork with `hirobius/concrete`'s Tailwind
  defaults).

Base-size rationale recorded in `DECISIONS.md`. Not in this pass: concrete's
duplicated display/h1 CSS clamp mins, Figma `figma:push`/`figma:snapshot
--ingest` re-sync, and ops's 54 call sites on the `xs` rung (tracked as
remaining work on hds#283).
