---
'@hirobius/design-system': minor
---

Adds `@hirobius/design-system/patterns` (hds#254, ratified 2026-09-26): the 22
`pattern`-tier components from the disposition table — `Calendar`,
`FileInput`, `Form`, `AppShell`, `OverflowList`, `Page`, `ActivityFeed`,
`AssetImg`, `Carousel`, `CodeBlock`, `StackedCardRail`, `DocLinkCard`,
`NavItem`, `SideNav`, `Stepper`, `TopNav`, `TreeList`, `ErrorPattern`,
`Toolbar`, `CommandPalette`, `Lightbox`, `Reveal` — now importable from their
own subpath (`vite.config.lib.ts` entry, `package.json#exports`). Non-breaking:
21 of the 22 stay re-exported from the package root too, each now carrying a
`@deprecated`/`@removeIn 1.0.0` JSDoc notice pointing at the new subpath; the
root re-export is dropped at the next major once ops has a codemod
(`StackedCardRail` is new to the published surface either way — it was
`pattern`-tiered in the manifest but missing from `src/index.ts`, so it has no
root re-export to deprecate).

This is the non-breaking half of the hds#254 decision. The 41 `fold` API
absorptions in the same disposition table wait for 1.0 and an `ops` codemod —
tracked on hds#254/hds#124, not filed as new issues.
