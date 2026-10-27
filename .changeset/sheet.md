---
'@hirobius/design-system': minor
---

New `Sheet`: a bottom drawer on phones and the centred dialog from `sm` up, built on the Dialog primitive (focus trap, Escape, scrim, portal into the nearest `data-hds` scope, `Sheet.Title` / `Sheet.Description` / `Sheet.Header` / `Sheet.Footer`). Below 640px it docks to the bottom edge with a grab handle and the bottom safe-area inset, stays above the on-screen keyboard (it follows `window.visualViewport`), and slides up on the productive motion token, which reduced motion turns off. `Sheet.Actions` of `Sheet.Action` is a full-width list of choices: `current` marks the chosen one (a check, `aria-current`), `tone="danger"` a destructive one, and an action closes the sheet unless `closeOnSelect={false}` (hds#690).
