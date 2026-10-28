---
'@hirobius/design-system': patch
---

Upgrade command: the oldest version it upgrades from drops from 0.16.0 to 0.9.0 (hds#462). The 0.10.0 to 0.16.0 releases now have backfilled ledgers, each step citing the CHANGELOG entry (and its commit) it comes from: the removed `./protocol` subpath (0.10.0), the Stat, Field and Card tone changes and the Hds prefix rename (0.12.0), TenantProvider's `slug` prop (0.14.0) and six removed typography tokens (0.16.0). A project on 0.9.0 to 0.15.0 is walked through them instead of being refused.
