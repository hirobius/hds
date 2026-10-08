---
'@hirobius/design-system': patch
---

Monospace text (code, tokens, metric numbers) now renders in IBM Plex Mono instead of Geist Mono. `--primitive-typography-family-mono` now starts with "IBM Plex Mono"; `fonts.css` ships the latin 400 woff2 under the SIL Open Font License 1.1, with its license text in `public/fonts/ibm-plex-mono/LICENSE.txt` and a line in `NOTICE.md`. If you import `fonts.css` nothing else changes. Code that hard-codes the font name "Geist Mono" in its own CSS should use the mono token instead.
