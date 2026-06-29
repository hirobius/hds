---
"@hirobius/design-system": minor
---

Scope the design-system base styles (element resets, body/heading type baseline, theme transition) to a `[data-hds]` subtree so HDS can drop into a section of a non-HDS app (e.g. one running MUI `<CssBaseline>`) without competing resets or font-cascade fights. Namespaced token custom properties stay on `:root` (harmless).

**Migration:** add `data-hds` to your app root (or the section that hosts HDS) so the base styles apply — e.g. `<html data-hds>` or `<div data-hds>…</div>`. Without it, components still receive their token-driven styling but the global type baseline/resets won't apply. See `docs/adr/016-scoped-base-styles.md`. Tailwind preflight remains global for now (documented follow-up).
