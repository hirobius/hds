---
'@hirobius/design-system': patch
---

MetricTiles: the phone column cap now applies after hydration. It read the viewport width in its initial state, so a server-rendered page kept the desktop column count on a phone and the row ran wider than the screen.
