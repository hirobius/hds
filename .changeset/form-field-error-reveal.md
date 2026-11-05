---
'@hirobius/design-system': patch
---

`FormField` / `FormFieldShell`: the error message now eases in on the productive motion token and fades out when the error clears, instead of popping in and out. A cleared message drops `role=alert` and is hidden from screen readers while it fades. Under `prefers-reduced-motion` it appears and leaves instantly (hds#751).
