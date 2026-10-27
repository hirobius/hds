---
'@hirobius/design-system': patch
---

CONSUMING.md states the TypeScript floor: 5.6 (hds#458). The release smoke now imports every subpath in a Node process with no `window`, checks every bare import in `dist` is a declared dependency or peer (optional peers only from `/form` and `/scroll`), and runs the consumer under React 18.3 and React 19 at TypeScript 5.6 and the newest pinned TypeScript. No API change.
