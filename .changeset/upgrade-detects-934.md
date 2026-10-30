---
'@hirobius/design-system': patch
---

The upgrade command no longer lists a step under Do by hand when the consumer's code does not use it (hds#934). A released step whose frozen note had no detector gets one from the new hand-kept `upgrade/detects.json` (shipped in the package): the typed Icon colour / Table width step looks for `<Icon>` and `<Table>`, the max-two-meta-items lint step for the HDS ESLint plugin, the cobalt accent for `data-accent`. An additive step with no detector is never Do by hand. A CSS-only consumer upgrading 0.16.0 to 0.32.0 now has nothing to do by hand.
