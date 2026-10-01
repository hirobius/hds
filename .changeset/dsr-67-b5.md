---
'@hirobius/design-system': minor
---

**BREAKING (0.x minor): NotFoundPattern and TileGrid are removed from the root, and StatusTile moves to `/patterns` (hds#395 B5, hds#389 decision update).** These are the prune-set names ops imports, so each comes with a codemod, and MIGRATIONS.md ("Components ops renders, each with a codemod") has every row.

- `NotFoundPattern` becomes `<ErrorPattern displayText="404" message="Page not found" />` from `@hirobius/design-system/patterns`, which is what it rendered. `npx -p @hirobius/design-system@^0.20.0 hds-not-found-pattern --root .` rewrites it.
- `TileGrid` becomes `<Grid layout="auto-fill" minItemWidth="…" gap="medium">`: `minTileWidth` is `minItemWidth` (260px when unset, since Grid defaults to 280px) and `gap="sm"` is Grid's fixed 12px `medium`. The tracks and gap render the same under every tenant and density. `npx -p @hirobius/design-system@^0.20.0 hds-tile-grid --root .` rewrites it; `gap="xs"` or `"md"`, spreads, self-closing tags and `TileGridProps` are listed for a manual edit.
- `StatusTile`, `StatusTileProps` and `StatusTileTone` are exported from `@hirobius/design-system/patterns` only (hds#389 D5). `hds-patterns-subpath` moves the import.
- `hds-patterns-subpath --check` reports a NotFoundPattern or TileGrid import with its survivor until its codemod has run (`codemods/removed-0.20.json`).
- Ops (main 76ef65e, read-only dry run): `hds-not-found-pattern` 1 file, 1 site; `hds-tile-grid` 2 files, 7 sites; `hds-patterns-subpath` 12 sites in 11 files.
