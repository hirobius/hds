---
'@hirobius/design-system': minor
---

Touch size for small controls (hds#750). New token `semantic.size.touchTarget` (`--semantic-size-touchTarget`, 44px). On a coarse pointer (any phone or tablet, whatever its width) or a viewport under 640px, sm Button (icon-only sm in both axes), Tabs trigger, SegmentedControl option (now both axes), Tag, Disclosure trigger and Input clear are at least that size, with no prop to set. A fine pointer on a wide viewport keeps desktop density, so desktop renders unchanged. Before, the `hds-touch-row` and `hds-touch-target` hooks fired only under 640px, so a touch tablet kept 24–39px targets. Hosts can delete their own touch-size overrides (Roleforge's 40px rule under 600px, hirobius/job-hunt#181). New on-demand check: `pnpm check:docs-touch-targets`.
