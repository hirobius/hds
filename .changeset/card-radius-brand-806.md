---
'@hirobius/design-system': patch
---

Cards follow the brand radius (hds#806): `rounded-lg` and `.hds-card` are now `calc(var(--role-radius) + min(var(--role-radius), 4px))`. They stay 12px by default and 24px in `soft-demo`, and go square when a tenant sets `--role-radius: 0` (`brutalist-demo`), where they used to keep 4px. Card, Surface, StatusTile, Dialog and every other `rounded-lg` container is affected.
