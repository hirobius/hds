---
'@hirobius/design-system': patch
---

New bin `hds-check` (hds#664): HDS's visual rules for any repo's HTML, CSS and JS, CSS in template strings included. `pnpm exec hds-check <paths…>` fails on all caps (`no-uppercase`), non-HDS font families and serif faces (`fonts`), a `box-shadow` that is not an HDS shadow token (`shadows`) and hex/`rgb()`/`hsl()` outside a `var()` fallback (`raw-colors`). Exit 1 with file:line:col findings, 0 when clean; `--json` and `--rule <name>` supported. Its rule core is the one `check-no-uppercase` gates HDS with. See `docs/CONSUMING.md` §11.
