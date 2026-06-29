---
"@hirobius/design-system": minor
---

Bundle web fonts into the package. `@hirobius/design-system/tokens.css` now embeds the Satoshi, Clash Display, and Geist Mono `woff2` files directly (base64), so a fresh consumer importing `tokens.css` renders the real typefaces with zero extra setup — no need to copy font files into a web root. Self-contained at the cost of a larger `tokens.css`.
