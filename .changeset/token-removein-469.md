---
'@hirobius/design-system': patch
---

Every `$deprecated` token now says the version it leaves in (hds#469). The note reads "…, removed in 1.0.0 — use <replacement>", so the `/* @deprecated */` comments in `variables.css` / `tokens.css`, the token JSDoc and the `hds/no-deprecated-token` lint data carry the date. `check-deprecations` now also reads `hirobius.tokens.json` and fails a deprecated token with no removal version or one that is past due. No token value changes.
