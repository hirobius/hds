---
'@hirobius/design-system': patch
---

Fix hds#254 review defect: the `@deprecated`/`@removeIn 1.0.0` JSDoc on the 21
pattern-tier components was on the component declarations themselves (e.g.
`export const AppShell` in `app-shell.tsx`), so TypeScript attached the
deprecation to the symbol everywhere — including the new
`@hirobius/design-system/patterns` subpath the notice tells consumers to
migrate to (`import { AppShell } from '.../patterns'` produced TS6385).

The declarations are now plain (undeprecated); the `@deprecated` notice lives
only on a root-only `const` alias in `src/index.ts` for each of the 21 names,
which shadows the star-exported binding for root-import consumers per ES
module semantics. Importing from `/patterns` now gives no deprecation
warning; importing the same name from the package root still does.
