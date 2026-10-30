---
'@hirobius/design-system': minor
---

`tokens.css` and `styles.css` are back under their size budgets (hds#936). Tailwind now reads only the shipping source under `src/` (tests excluded) instead of the whole repo, so class strings from tests, scripts, fixtures and docs no longer compile into the published CSS. The 136 utilities that had leaked in that way and that no component uses are dropped, and 32 hand-written rules in `utilities.css` that repeated a utility Tailwind already emits with the same computed value are removed. `pt-1` stays for consumers that use it. Breaking for a consumer that leaned on one of them, or on the 15 Tailwind theme variables only they read (`--radius-xl`, `--tracking-tight` and the rest: see the upgrade note).
