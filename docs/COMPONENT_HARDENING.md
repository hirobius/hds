# Component hardening loop

The repeatable process for bringing every HDS component up to the gold standard
and syncing it out to Figma. Reference implementation: `src/app/components/button.tsx`
(+ `button.test.tsx`, `src/stories/button.stories.tsx`).

## Definition of done (per component)

A component is "hardened" when it has all of:

1. **cva + Tailwind semantic tokens** — visual styling via `cva()` + semantic
   Tailwind classes (`bg-*`, `text-*`) or `var(--component-*)`; no inline
   `style={{…}}` driven by the `hds.` token bridge for visuals.
2. **Full state matrix in class strings** — rest · `hover:` · `active:` ·
   `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background` ·
   `disabled:pointer-events-none disabled:opacity-50` (+ loading / checked /
   open / selected where applicable). No `motion/react` for basic state.
3. **A11y** — correct role / aria; **keep native `<input>` semantics** where
   they already exist (checkbox, radio, toggle, slider are accessible today —
   do not regress). `data-variant` / `-tone` / `-size` / `-state` hooks;
   `forwardRef`; `asChild` via Radix `Slot` where link/polymorphism applies.
4. **Typed + documented** — a `@public` `Props` interface extending the native
   element attrs + `VariantProps`; `@category` / `@tier` / `@figma` JSDoc.
5. **Coverage** — a colocated `<name>.test.tsx` (Vitest + Testing Library,
   plain-DOM assertions, `afterEach(cleanup)`) and a
   `src/stories/<name>.stories.tsx`.
6. **Tokens** — component-specific values live under the `component.*` tier in
   `hirobius.tokens.json`, aliasing an upstream semantic/primitive token.
7. **Figma** — token changes flow to Figma variables via the CI sync (primary
   channel). A Code Connect mapping at `code-connect/<name>.figma.tsx` is
   authored as a forward-compatible artifact, but Code Connect **publish is not
   available on the current membership** — do not depend on it (see below).

## Per-iteration loop

```
1. Harden src/app/components/<name>.tsx to the definition of done.
   (New component: `pnpm scaffold:component Hds<Name>` first.)
2. Add/refresh <name>.test.tsx and src/stories/<name>.stories.tsx.
3. New tokens? Edit hirobius.tokens.json (component.<name>.*, alias upstream),
   then `pnpm tokens:verify`.
4. Public API changed? Edit src/index.ts by hand, then `pnpm api:update`.
5. `pnpm manifest:generate`      # hds-manifest.json + component-api.json
6. Author/refresh code-connect/<name>.figma.tsx (node-id from the Figma URL:
   ?node-id=123-4  →  "123:4").
7. Verify (below), then commit atomically with gates green.
```

## Verify (UI is affected → run all)

```
pnpm typecheck && pnpm check:fast && pnpm test && pnpm test:layout
```

- `pnpm figma:connect` parses Code Connect mappings.
- Figma **variable** sync runs in CI on merge to `main` (`sync-figma-variables.yml`);
  `api.figma.com` is blocked in remote sessions, so REST verification is CI-side.
- Code Connect **publish is not available on the current Figma membership** —
  do not build around `figma connect publish`; mappings stay authored-only and
  forward-compatible, and the code↔Figma link uses other workarounds. See
  `docs/figma-mcp.md`.

## Constraints

- Heading to a deliberate **1.0.0** — breaking changes to emitted classes / DOM
  are acceptable when they move a component onto the gold standard.
- **Never** run a repo-wide `pnpm lint:fix` (see `CLAUDE.md`); gates run per
  component.
- This zone (`src/app/components/`) is strict: components stay purely
  presentational and token-driven.

## Prioritized queue

- **Wave 0 — fixes + prereqs** *(done)*: Figma Light/Dark modes bug, Alert drift
  (#72), caption typography token (#71), Button reference test, this doc.
- **Wave 1 — missing components**: Textarea, real `HdsTooltip` (Radix, #69),
  `FormField` input wrapper (P2 form layer).
- **Wave 2 — legacy→cva migration** (value order): tag, card, table, checkbox,
  radio, toggle, slider, segmented-control, disclosure, text, breadcrumb.
- **Wave 3 — coverage + Code Connect breadth**: missing stories (select,
  side-nav, tooltip), tests for untested components, Code Connect mappings for
  all mapped components.
- **Wave 4 — site-enablers**: `HdsThemeProvider` (#61), multi-brand `data-brand`
  overlays + runtime switch (#62), Astro consumption layer (#64), level-up
  `scaffold-component.mjs` → `pnpm hds:new` (#63).
