---
'@hirobius/design-system': minor
---

Brand fonts are now an opt-in `fonts.css` instead of being base64-embedded in `tokens.css` and `styles.css` (hds#479). Consumers that want the HDS fonts must add one import:

```ts
import '@hirobius/design-system/fonts.css'; // Satoshi 400/500/700 + Geist Mono 400
```

Without it, text falls back to the family stack in `--hds-font-family` and `--hds-font-family-mono` (`"Satoshi", system-ui, …`), so a consumer that brings its own fonts no longer downloads ours. `fonts.css` ships with the four woff2 files in `dist/fonts/`; its URLs are relative (`./fonts/satoshi-400.woff2`), so Vite, Next and webpack resolve and hash them, and every face keeps `font-display: swap`.

Size: `tokens.css` goes from 152.8 kB to 20.3 kB gzipped (304 kB to 130 kB raw), and `styles.css` from 152.2 kB to 19.6 kB. The four woff2 files plus `fonts.css` are 132 kB raw, read only when a face is used.

Ops must add `import '@hirobius/design-system/fonts.css'` next to its `tokens.css` or `styles.css` import when it upgrades, or its UI renders in the system font.
