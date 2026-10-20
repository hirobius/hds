---
'@hirobius/design-system': patch
---

Sora 800 no longer shows thin white seams inside letters on macOS and iOS. The font file built 71 glyphs (A, E, F, H, T and others) from overlapping shapes, and Apple's text renderer anti-aliases each shape separately, leaving a hairline where they meet (the A crossbar was the most visible). The shipped `sora-800.woff2` now has those overlaps merged into single outlines; letter shapes, widths and spacing are unchanged.
