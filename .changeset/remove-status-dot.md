---
'@hirobius/design-system': minor
---

**`StatusDot` and `StatusDotProps` are removed (hds#465).** Both were deprecated in 0.20.0 with `@removeIn 0.21.0`. Replace `<StatusDot tone size label>` with `<Badge dot tone size label>`: `tone`, `size` and `label` map one to one, and so does the dot. Badge takes no `style`, so there is no codemod: move any `style` to a wrapper element or a `className`, then swap the component (MIGRATIONS.md, "0.21.0 removals"). `npx @hirobius/design-system@latest upgrade` finds every use by import and by JSX tag. ADR-014 now allows a removal to ship with a manual step like this one.
