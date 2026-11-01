---
'@hirobius/design-system': minor
---

Remove the duplicate default export from `@hirobius/design-system/mui` (`hdsMuiThemeOptions` stays a named export) and from the internal Callout module (hds#1007). No consumer (ops, job-hunt, folio) used either default; import `{ hdsMuiThemeOptions }` by name.
