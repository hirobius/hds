---
'@hirobius/design-system': patch
---

Every React-bearing bundle now starts with `'use client'`, so the package works in the
Next.js App Router that `CONSUMING.md` advertises.

Before this, `dist/` shipped 20 `useState` calls and zero client directives. In the App
Router a module is a Server Component until it says otherwise, and a Server Component
that calls a hook fails at render — so the first `import { Button } from
'@hirobius/design-system'` in a Next.js page threw. No existing consumer had hit it
(ops is Vite, site-engine is Astro), which is exactly why a prospective user would have
found it first.

The directive is applied **per chunk, not as a blanket banner**. The framework-free
subpaths — `brand`, `tokens`, `cn`, `manifest`, `mui` — stay unmarked on purpose:
`'use client'` turns every export of a module into an opaque client reference when it is
imported from server or edge code, which would break `tokens.color.primary` in a Server
Component and defeat `brand`'s documented "static Astro build or edge runtime" use.

Marked: the main barrel, `contexts`, `form`, `scroll`, and the two shared chunks they
import. A chunk is marked iff it imports React, or imports a chunk that does.

Gated: `scripts/check-rsc-directives.mjs` runs from `smoke:consumer` and re-derives the
rule from the emitted files, in both directions, so neither a missing nor a spurious
directive can ship again.
