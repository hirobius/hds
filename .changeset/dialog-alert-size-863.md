---
'@hirobius/design-system': minor
---

Dialog gains `size` (`sm | md | lg | xl`; `md` is the existing width), `placement="top"` (anchored under the top safe area and capped to the visual viewport so an on-screen keyboard does not cover it), and `scrollBody` with a new `Dialog.Body` part that scrolls between a pinned `Dialog.Header` and `Dialog.Footer`. `Dialog.Header` now spaces title and description with flex gap instead of sibling margins, so a host `* { margin: 0 }` reset cannot collapse it. Alert gains `size` (`md` default, compact `sm`). All additive; nothing changes unless a prop is passed (hds#863).
