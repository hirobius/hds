---
'@hirobius/design-system': patch
---

An icon-only Button is at least 44px wide on phones and coarse pointers, under the same `(max-width: 639px), (pointer: coarse)` query as the 44px height. The React `md` icon-only Button was 40px wide beside a height already lifted to 44px; it is now a 44px square there. In static.css, `.hds-button` (every size but `--sm`) also takes `min-width: 44px` under that query (a text button is wider already, so only a fixed-width icon button changes), and the `--sm` hit area, which was 44px tall, is now centred and at least 44px wide. Desktop is unchanged.
