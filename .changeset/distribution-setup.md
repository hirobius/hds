---
"@hirobius/design-system": minor
---

Make the package publishable and consumable.

- Publish target set to GitHub Packages (`publishConfig.registry`); `private`
  removed so `npm publish` is allowed.
- Declare `react`, `react-dom`, and `react-router` as peer dependencies so
  consumers provide a single copy (no duplicate-React hook errors).
- Wire up Changesets (`changeset add` / `version` / `release`) and a CI release
  workflow that publishes on merge to `main`.
