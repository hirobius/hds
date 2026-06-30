# ADR-017: Single-source, derived docs-site navigation

**Status:** Accepted (2026-06-30) — implemented in PRs #28–#33.

> Implementation status: Phases 1, 2, 3, 3b, 5 landed in full. Phase 4 landed
> partially — the active-state predicate is centralized (`isNavItemActive`), but
> the full `NestedNavGroup`→ public `NavGroup` renderer swap is deferred: it
> changes live sidebar UX (localStorage open-state persistence + mobile drawer)
> and needs a browser to verify, which the build sandbox lacks.

## Context

The docs-site navigation is hand-rolled across three tiers that do not share a
source of truth:

1. **Routes** — `src/app/route-tree.tsx` declares every URL as a flat
   react-router v7 array (consumed by `createBrowserRouter` on the client and
   `createMemoryRouter` in `entry-server.tsx`).
2. **Page catalog** — `src/app/data/hds-registry.json` holds per-page metadata;
   `src/app/data/hds-nav-data.ts` (`buildNavSections()`) filters entries that
   carry `navSection` + `navOrder`, groups and sorts them into
   `HDS_NAV_SECTIONS`.
3. **Rendering** — `src/app/pages/hds/HDSLayout.tsx` renders the sidebar with a
   bespoke `NestedNavGroup` / `SideNavItem`; the right-rail "On this page" TOC is
   scraped from the DOM at runtime by a `MutationObserver` in
   `HdsTocContext.tsx`.

This works, but the seams have rotted into maintenance hazards:

- **Adding one page touches 3+ files.** A new docs page needs: (a) a `lazy()`
  import + route object in `route-tree.tsx`, (b) a `hds-registry.json` entry with
  `navSection`/`navOrder` set by hand (the `sync-hds-registry.mjs` stub does not
  set them), and (c) — to be findable in Cmd-K — an entry in the _separate_
  `FOUNDATION_SECTIONS` array in `src/app/lib/hds-search.ts`. Miss one and the
  page is reachable-but-invisible, or visible-but-unsearchable.
- **Four parallel "nav" lists drift.** The registry, `FOUNDATION_SECTIONS`
  (already out of sync — `getting-started`, `icons`, `tokens`, `scope`,
  `tech-stack`, `license`, `contribution-guide`, `brand-theming` are missing),
  `INTERNAL_NAV_ITEMS` (a third list in `hds-nav-data.ts`, holding only
  `/brand-theming`), and the route tree itself. `hds-registry.json` even has two
  entries for `/hds/shape`.
- **Two implementations of one component.** The sidebar's `NestedNavGroup`
  (in `HDSLayout.tsx`) re-implements the _public_ `NavGroup`
  (`src/app/components/nav-group.tsx`). Active-state math
  (`pathname === path || pathname.startsWith(path + '/')`) is copy-pasted across
  `SideNavItem`, `NestedNavGroup`, and `NavGroup`.
- **A path-prefix mismatch bridged at runtime.** Registry paths use a `/hds/`
  monorepo prefix; the standalone site serves at root. `toAppPath()` strips it on
  every render instead of the data being correct at rest.
- **Not portable.** `localStorage`, `MutationObserver`, `window.innerWidth`
  reads, and a Vite virtual module sit unguarded in the layout — so the nav does
  not move cleanly to a static/SSR/Astro target, which is a stated direction.

### Seams worth keeping

The system already has the right bones to build on:

- The **RouterContext adapter** (`src/app/context/RouterContext.tsx`) cleanly
  abstracts `navigate` / `currentPath` / `LinkComponent` — `NavItem`,
  `NavGroup`, and `Breadcrumb` already use it. An Astro adapter would be the same
  shape as `ReactRouterBridge.tsx`.
- A **generator pipeline** already exists (`pnpm manifest:generate`,
  `sync-hds-registry.mjs`) that scans `src/app/pages/hds/` and writes JSON.
- The **public `NavGroup`** already supports `collapsible`, `getExact`, and
  `items[]` on the router seam — a drop-in for the bespoke `NestedNavGroup`.

## Decision

Adopt **one source of truth for navigation, with everything else derived.**

Each docs page module exports a typed `meta` describing its place in the
information architecture; a generator compiles all `meta` exports into a single
serializable **`nav-model.json`**, and every nav surface (sidebar, Cmd-K search,
breadcrumbs, prev/next pager) reads that one model.

```ts
// src/app/pages/hds/ColorPage.tsx
export const meta = {
  path: '/color', // canonical, root-relative — no /hds/ prefix
  title: 'Color',
  section: 'Foundations',
  order: 1,
  status: 'stable', // drives a metadata slot, never a decorative badge
} satisfies HdsPageMeta;
```

```
pnpm nav:generate   →   src/app/data/nav-model.json   (committed, gate-checked)
                         consumed by: Sidebar · CommandPalette · Breadcrumb · Pager
```

Why colocated `meta` → generated model (vs. the alternatives below):

- **One edit point.** Adding/moving a page is a single-file change; the model,
  sidebar, search, breadcrumb, and pager all follow from the generator. A
  pre-commit gate fails the build if `nav-model.json` is stale (same pattern as
  the manifest drift gate).
- **Kills the drift.** `FOUNDATION_SECTIONS` and `INTERNAL_NAV_ITEMS` are
  deleted; there is exactly one list. The `/hds/` prefix is normalized to root at
  generation time, so `toAppPath()` disappears.
- **Collapses the duplication.** The sidebar renders via the public `NavGroup`;
  the copy-pasted active-state math centralizes into one helper on the router
  seam.
- **Astro-portable by construction.** `nav-model.json` is plain data — an Astro
  `getStaticPaths()` / nav component can consume it directly with no React-router
  or browser-API coupling. The model is the contract; the renderer is swappable.

### Alternatives considered

- **Consolidate into `hds-registry.json` (one JSON authority).** Auto-derive
  `navSection` from the page's directory, delete the two extra lists, fix the
  prefix at the data layer, swap in `NavGroup`. _Less churn, still JSON-centric,
  but page metadata stays divorced from the page module — you still edit two
  places (the page and the registry), just not four._ A reasonable smaller-scope
  fallback if the colocated-meta migration is judged too large.
- **Route-tree as the source.** Attach nav metadata to each route object and
  derive everything from the tree. _Fewest files, but couples nav data to
  react-router and is the least portable to a static/Astro target_ — it pushes
  against the stated direction.

## Migration plan (phased, each phase shippable)

1. **Model + generator.** Define `HdsPageMeta`; add `scripts/generate-nav-model.mjs`
   (reuse the `sync-hds-registry.mjs` page walk) emitting `nav-model.json`; wire a
   `check-nav-model-drift` gate into the pre-commit registry. No UI change yet.
2. **Backfill `meta`.** Add the `meta` export to every page under
   `src/app/pages/hds/`, normalizing paths to root-relative. Generator now
   produces a complete model; assert it matches today's nav output.
3. **Point surfaces at the model.** Switch `buildNavSections()`, the
   `CommandPalette` index, and the breadcrumb/pager to read `nav-model.json`.
   Delete `FOUNDATION_SECTIONS`, `INTERNAL_NAV_ITEMS`, and `toAppPath()`.
4. **Collapse the renderer.** Replace `NestedNavGroup`/`SideNavItem` in
   `HDSLayout.tsx` with the public `NavGroup`; centralize active-state matching.
5. **Portability guards.** Gate `localStorage`/`window`/observer usage behind
   `typeof window` checks and island boundaries so the model + renderer survive
   SSR/Astro.

## Consequences

- One-file page additions; no more invisible/unsearchable pages from a missed
  list. CI enforces model freshness.
- The public `NavGroup` becomes the single nav renderer — it gets exercised by
  the docs site itself, improving the component consumers ship against.
- `nav-model.json` is a new committed, generated artifact (regen-only commits,
  like the manifest).
- Net deletion: two hardcoded lists, one runtime path bridge, and a duplicate
  component. Migration is staged so each phase is independently revertible.
- Risk: the `meta` backfill spans ~20 page files; Phase 2 asserts the generated
  model matches current nav before any surface switches over, so the cutover is
  behavior-preserving.
