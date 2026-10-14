# ADR-040: Zero Dependencies by Default: Router Adapter and Opt-In Peer Subpaths

**Status:** Accepted, retroactive (decided 2026-06-29; recorded 2026-10-13 from commit and PR history).

## Context

The consumer-readiness work (hds#17, merged 2026-06-29) aimed to make the package
usable in apps the docs site does not resemble. Two couplings stood in the way.

- Eight components imported `react-router`: nav-item, doc-link-card, error-pattern,
  token, nav-group, inline-link, command-palette and shell-controls. A consumer on
  Next, Astro or no router would have to install it.
- The last P1 backlog item was a form and validation pattern. Any choice of form
  library would force that library on every consumer.

## Decision

Keep the main barrel free of router and form-library dependencies. Offer richer
behaviour through an injected adapter or an opt-in subpath.

- **Router adapter** (`93171e1`). Components read navigation from an injectable
  `RouterContext`. With no provider, links are plain anchors and navigation falls
  back to `window.location`, guarded for SSR. Apps with a router inject it once via
  `<HdsRouterProvider adapter>`. `react-router` became an optional peer.
- **Validation-agnostic Form** (`9223f6a`). `Form` and `FormField` own the a11y
  wiring (label association, `aria-invalid`, `aria-describedby`, required marker)
  and take a plain `error` string. The validation source is the consumer's choice:
  "native, react-hook-form, zod, Formik".
- **`/form` subpath** (`9adfe22`, hds#26). `@hirobius/design-system/form` wires
  React Hook Form to Zod. `react-hook-form`, `zod` and `@hookform/resolvers` are
  optional peers. The main barrel stays "validation-agnostic and zero-dependency".
- **Host-safe `variables.css`** (`2c8ca1c`). Tokens as custom properties only, with
  no preflight, as "the safe path for embedding HDS in MUI/another base".
- A clean-room consumer `vite build` in `smoke:consumer` checks that a Button-only
  import pulls none of the heavy peers (see ADR-038).

## Alternatives considered

- Taking a form-library dependency. The Form commit rejects it, "consistent with the
  P0.1 router-adapter philosophy: zero-dep by default, richer when you inject your
  own".
- Using `cloneElement` inside the React Hook Form adapter. Rejected because
  "cloneElement detaches react-hook-form's callback field.ref and silently breaks
  validation wiring". `HdsFormField` uses a render prop over a new non-cloning
  `FormFieldShell` and a shared `useFieldWiring` instead.

## Rationale

A consumer should pay only for what it imports. The adapter and the subpath keep the
install and the bundle small, and leave the choice of router and validator with the
app. The adapter's default (anchors and `window.location`) means the package works
before any provider is mounted.

## Consequences

- `FormField` itself still uses `cloneElement` for its single child. Its public API
  was left unchanged, and `form.tsx` carries a comment that the clone is
  incompatible with react-hook-form's ref.
- The commit bodies record that `93171e1` was committed with `--no-verify` because of
  a sandbox tooling mismatch, and `9adfe22` fixed lint errors that earlier story PRs
  had let onto main the same way.
- Still in force on origin/main: `peerDependenciesMeta` marks `react-router`,
  `react-hook-form`, `zod`, `@hookform/resolvers` and `lenis` optional. `./form` and
  `./variables.css` are in `exports`, and `RouterContext.tsx` and `src/form/` exist.
- "Zero-dependency" is scoped to router and form libraries. The package still lists
  runtime `dependencies` (Radix packages, `motion`, `class-variance-authority`,
  `lucide-react` and others).

## Lessons

- Make an integration an adapter with a working default, so the main entry never
  imports the integration.
- Put an opt-in library on its own subpath with optional peers, and check in CI that a
  leaf import does not pull it in.
- Do not clone elements to inject props when a control owns a ref. Use a render prop.

## Evidence

- `93171e1` feat(router): decouple react-router via adapter context (P0.1)
- `9223f6a` feat(components): add Form + FormField validation-agnostic seam (P1)
- `9adfe22` feat(form): optional React Hook Form + Zod adapter on /form subpath (#26)
- `2c8ca1c` feat(pkg): host-safe variables.css + consumer vite-build gate (C/D/E) (#38)
- `0282d95` Merge #17: HDS consumer-readiness (router seam, fonts, scoped CSS)
