---
'@hirobius/design-system': patch
---

Components use semantic spacing in place of raw and primitive steps (hds#778): 119 numeric Tailwind spacing utilities, `--primitive-space-*` vars and `hds.space.px*` reads move to the semantic key at the same pixels and the same density behaviour (`scale-xs`, `fixed-*`, `subgrid-*`), so nothing moves. The spacing ratchet now covers all of `src/` and `docs-site/`, and the ESLint plugin, the ratchet and `hds-spacing-steps` share one spacing grammar. `cn()` now merges the named spacing keys (`p-surface-padding`, `gap-scale-md`, `px-fixed-sm`, …) like numeric ones, so a `className="px-6"` override replaces a component's semantic padding instead of sitting next to it.
