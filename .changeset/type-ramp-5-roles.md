---
'@hirobius/design-system': minor
---

Type ramp cut to 5 roles plus mono; old composite names are deprecated aliases; headings render smaller (hds#483, #485, #486, #487).

The ramp is now `display` 48/1.05 700, `title` 24/1.25 600, `body` 16/1.6 400, `ui` 14/1.5 500, `caption` 12/1.5 500 and `mono` 13/1.5 400. `semantic.typography.title` is new, and `display`, `body`, `ui`, `caption` and `mono` change value: display goes 60 to 48px, body 17 to 16px with 1.6 leading, caption gets 1.5 leading, mono 14 to 13px.

Every old name still resolves, so no import breaks, and each now holds its role's value: `h1`, `h2`, `h3` (48, 30 and 20px) and `typeStyles.heading1` to `heading3` render as `title` (24px, so headings render smaller); `eyebrow`, `badge` and `micro` render as `caption` in sentence case (the uppercase and wide tracking are gone); `technical`, `monoXs` and `monoSm` render as `mono`; `small`, `label` and `bodySmall` render as `ui`. `<Text variant>` takes the six role names; `heading1` to `heading3`, `technical`, `eyebrow`, `badge` and the four doc variants stay accepted, tagged `@deprecated` with `@removeIn 1.0.0`, as do the matching `hds.typeStyles` keys. The deprecated `Text` variants keep their old default elements (`heading1` is still an `h1`); the new `title` defaults to an `h2`, so pass `as` where another level matters.

The fluid `clamp()` size overrides on display and the headings are gone; the ramp is static. Satoshi still ships 500 and 700 faces only, so body (400) draws on the 500 face and title (600) on the 700 face until those faces are added.

New: the `.hds-type-<role>` classes in `theme.css`, and `scripts/check-type-ramp.mjs`, a pre-commit gate that fails a raw size, weight or line height in `src/` and any deprecated composite. Figma text styles need a Sync after this ships (hds#489).
