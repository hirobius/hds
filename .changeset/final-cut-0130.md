---
'@hirobius/design-system': minor
---

**0.13.0 — final clean cut before the shelf.** Rolls up the work merged to `main`
after 0.12.0 and one bug fix, so the published package matches the shelved repo.

- **fix(icon):** stop forwarding a token (`var(--primitive-*)`) to Lucide's numeric
  `size` prop, which landed on the SVG `width`/`height` **attribute** and logged a
  console error on every icon render (icons still rendered — the `style` sized them
  — but the console was noisy). Now only a numeric size is forwarded; token sizes
  flow through `style` (valid as CSS). (#123)
- **feat(styles):** `@hirobius/design-system/static.css` — a CSS-only static-primitive
  layer so a zero-React Astro/HTML page can render `Badge`/`Card`/`Alert`/`Divider`/`Tag`
  via `.hds-*` classes, token-bound and theme-aware. (#64)
- **docs(scroll):** the llms.txt scroll-driven-sections recipe + golden-path stories
  for the `Reveal`/`Pin`/`useScrollProgress` primitives. (#116)
