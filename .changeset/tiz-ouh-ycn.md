---
'@hirobius/design-system': minor
---

Add `@hirobius/design-system/static.css` — a CSS-only static-primitive layer so pages with no React (e.g. a static Astro/HTML page) can render `Badge`, `Card`, `Alert`, `Divider`, and `Tag` via plain `.hds-badge` / `.hds-card` / `.hds-alert` / `.hds-divider` / `.hds-tag` classes. Every class binds to the same `--semantic-*` / `--component-*` / `--role-*` tokens the React components use, so it stays theme-aware via `data-theme`/`data-brand` with zero JS. Pair it with `@hirobius/design-system/variables.css`. See `docs/CONSUMING.md` §14.
