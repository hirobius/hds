---
'@hirobius/design-system': minor
---

Fix Disclosure: opening or closing a row no longer makes the rows below jump (hds#1508). The panel and the row preview are now two `grid-template-rows` 0fr/1fr collapses on the productive motion token, flipped in the same render, so the rows below travel one way with no back-step and the summary row keeps its top. The panel stays in the DOM while closed (zero height, `visibility: hidden`, so assistive technology and the tab order cannot reach it) and the wrapper is a plain div. Reduced motion opens it in one step. A consumer that overrode the inline gap or `.overflow-hidden` with `!important` can drop that override; a test that expects closed content to be absent should check it is not visible.
