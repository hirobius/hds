---
'@hirobius/design-system': patch
---

One layout-gap vocabulary (hds#404). Cluster, Grid, Sidebar, Cover and Switcher `gap`, Bleed `amount`, Center `gutter`, and Card and Stack `gap` no longer keep a private copy of the `'tight'` | `'normal'` | `'inset'` | `'spacious'` map: each resolves through the shared spacing resolver against the one copy of those names in `box-sx.ts`. Nothing renders differently. Every value each prop takes, its default, and values its type rejects but a JavaScript caller can still pass emit the same inline style and compute the same pixels as before, in every tenant, density and breakpoint (a Chromium test locks this against 8e53a8a). Card's `gap` still takes the `hds.space` keys and still passes any other value through; the other seven still set no style for a value outside the four names. Inside HDS, `check-layout-gap-vocabulary` fails a second copy of the map anywhere in `src/` at pre-commit.
