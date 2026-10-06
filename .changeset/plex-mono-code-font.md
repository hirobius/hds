---
'@hirobius/design-system': patch
---

Code font is now IBM Plex Mono (was Geist Mono). `--primitive-typography-family-mono` and `--hds-font-family-mono` resolve to `'IBM Plex Mono', 'Courier New', monospace`; the embedded font ships as latin + latin-ext subsets (about 28 kB, down from 50 kB). Consumers that hard-coded `Geist Mono` should switch to the token.
