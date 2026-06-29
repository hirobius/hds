# HDS Consumer-Readiness & Roadmap Backlog

> Handoff doc. Compiled 2026-06-29. Captures every recommended change to
> `@hirobius/design-system` surfaced while wiring up the **job-hunt** apply board
> as the first external consumer. Each item is specced to be executable in a
> fresh session without re-deriving context.

## Current state (read first)

- Published version: **0.6.0** to **GitHub Packages** (`npm.pkg.github.com`, `@hirobius` scope, `access: restricted`).
- Release flow: Changesets → CI `release.yml` opens a **"Version Packages" PR** → merging it runs `pnpm release` (`build:lib` + `changeset publish`). The repo setting *"Allow GitHub Actions to create and approve pull requests"* is now **enabled**, so the release PR auto-opens going forward.
- First consumer: **job-hunt** — Vite + React 18.3.1, currently on **MUI v6 + Emotion**, **no react-router**, **no Tailwind**, and does **not** depend on HDS yet.
- Branch for this work: develop on a feature branch, push to `main` via fast-forward, then merge the Version Packages PR to publish.

### Verification commands (acceptance gate for every code item below)
```
pnpm typecheck                      # 0 errors
pnpm exec eslint src --max-warnings=0
pnpm exec vite build                # app build
pnpm build:lib && pnpm smoke:consumer --skip-build   # consumer subpaths resolve + import
pnpm test:layout                    # pkill -9 -f vite first if a port is stuck
pnpm test:a11y                      # where a11y-relevant
pnpm exec type-coverage --at-least 99.9    # CI gate in quality.yml
```
Commit normally (husky pre-commit gates must pass). Push from the web sandbox uses
`--no-verify` ONLY because the pre-push `visual-ingest.mjs` needs a Playwright
`chrome-headless-shell` binary absent in that sandbox — it passes on a real machine.

---

## P0 — Consumption blockers

### P0.1 — Decouple `react-router` via a router-adapter context  *(IN PROGRESS / may be partially landed)*
**Why:** 6 exported components hard-import `react-router`, and it's a non-optional
peer. Any consumer without react-router (job-hunt, any Next.js app) gets unmet
peers + runtime crashes (no Router context). Architecture decided: **adapter
context with anchor/window.location defaults** so HDS works with zero router by
default, and react-router/Next users inject their router once at the root.

**Coupled components + their react-router usage:**
- `nav-item.tsx` — `useNavigate()`
- `doc-link-card.tsx` — `useNavigate()`
- `error-pattern.tsx` — `useNavigate()`
- `token.tsx` — `useLocation()` + `useNavigate()`
- `nav-group.tsx` — `useLocation()`
- `inline-link.tsx` — `<Link to>`

**Spec:**
1. `src/app/context/RouterContext.tsx` (must NOT import react-router):
   - `interface HdsLinkProps = { to: string; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>`
   - `type HdsLinkComponent = React.ComponentType<HdsLinkProps>`
   - `interface HdsRouterAdapter { navigate: (href: string) => void; currentPath: string; LinkComponent: HdsLinkComponent }`
   - default `LinkComponent` = forwardRef anchor (`<a ref href={to} {...rest}/>`)
   - `HdsRouterProvider({ adapter, children })` — context provider.
   - `useHdsRouter()` — returns context value, else a router-free fallback:
     `navigate` → `window.location.assign(href)` (SSR-guard `typeof window`),
     `currentPath` → `window.location.pathname` (computed fresh, not stale),
     `LinkComponent` → default anchor.
2. Refactor the 6 components to `const { navigate | currentPath | LinkComponent } = useHdsRouter()`. Remove every `from 'react-router'` import. Preserve all props/className/refs/behavior; only swap the navigation source.
3. **Keep the docs site's SPA nav working (don't regress, mind SSR):** the router is mounted in BOTH `src/app/routes.tsx` (`createBrowserRouter`) and `src/entry-server.tsx` (`createMemoryRouter`) off the SHARED `src/app/route-tree.tsx`. Add a bridge `src/app/context/ReactRouterBridge.tsx` (MAY import react-router; app-internal, NOT exported publicly) that reads `useNavigate()`/`useLocation()` + wraps react-router `<Link>`, memoizes an `HdsRouterAdapter`, and renders `<HdsRouterProvider>`. Mount it at the **root of `route-tree.tsx`** so it wraps all routes in both client + SSR.
4. Exports: add `export * from './RouterContext'` to `src/app/context/index.ts`; re-export `HdsRouterProvider`, `useHdsRouter`, `HdsRouterAdapter`, `HdsLinkComponent`, `HdsLinkProps` from the main barrel `src/index.ts`. Do NOT export ReactRouterBridge.
5. `package.json`: add `"peerDependenciesMeta": { "react-router": { "optional": true } }`. Keep react-router in peerDependencies + devDependencies (the docs app still needs it).
6. **Acceptance:** `grep -rn "from 'react-router'" src/app/components` → 0 results. RouterContext.tsx has no react-router import. All verification commands green.
7. Changeset: `minor` — "Components no longer require react-router; inject navigation via `<HdsRouterProvider>` or use the anchor default." Ships in **0.7.0**.

### P0.2 — (Optional) Switch publish target to **npmjs.com public** for tokenless install
**Why:** GitHub Packages' npm registry requires a PAT for EVERY install, even
for public packages — "making it public" there does NOT remove the token. The
only path to anonymous `npm install` is publishing to npmjs.com.
**You (human, one-time):** create free npm org `hirobius`; generate `NPM_TOKEN`; add as repo secret.
**In-repo changes:**
- `package.json` → `publishConfig.registry` = `https://registry.npmjs.org`.
- `.changeset/config.json` → `access: "restricted"` → `"public"`.
- `.github/workflows/release.yml` → setup-node `registry-url: https://registry.npmjs.org`; `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.
**Implication:** package + source become world-public (repo is already public). Decide if internal-only is required before doing this. Dual-publish (npmjs + GitHub Packages) is possible but unnecessary for frictionless consumption.

### P0.3 — Ship a font-delivery story
**Why:** `src/styles/fonts.css` uses absolute `url('/fonts/...')` and `vite.config.lib.ts` sets `publicDir:false`, so NO fonts are in the package. Consumers silently fall back to system fonts. Families: Clash Display, Satoshi, Geist Mono (see `src/styles/fonts.css` for exact weights/paths).
**Options (pick one):**
- (a) Bundle the woff2 into the package + rewrite `@font-face` to package-relative URLs that resolve via the bundler. Cleanest for consumers; grows the tarball.
- (b) Keep absolute URLs but ship a `pnpm hds:copy-fonts <dest>` script + document that consumers must place the woff2 under their web root `/fonts/...`.
**Acceptance:** a fresh consumer importing `tokens.css` renders Clash/Satoshi without extra manual steps (option a) or with one documented step (option b).

### P0.4 — Write a "Consuming HDS" README section
Cover: registry + token (or npmjs if P0.2 done), `import '@hirobius/design-system/tokens.css'` (note: that file is the FULL bundle — tokens + theme + Tailwind utilities + @font-face, so consumers need NO Tailwind config), peer deps, fonts (P0.3), the `<HdsRouterProvider>` seam (P0.1) + that the anchor default needs nothing, and the MUI/global-CSS coexistence caveat (P0.5).

### P0.5 — Scope the global CSS for coexistence
**Why:** `tokens.css` ships a GLOBAL theme/utilities/reset; an app like job-hunt
that also runs MUI `<CssBaseline>` + Emotion gets competing resets + font-cascade
fights. **Recommendation:** ship HDS styles under a root scope (`.hds` /
`[data-hds]`) rather than bare `:root`/global, so HDS can drop into a section of
a non-HDS app without global side effects. Larger change — needs a token/theme
build pass (`scripts/build-tokens.mjs`) + the `:root` selectors reviewed. Treat as
its own ADR.

---

## P1 — Missing components (ranked by what job-hunt will hit first)

A Supabase-backed job board will need these almost immediately. Build with the
existing Radix-backed patterns + tokens; run `pnpm manifest:generate` after each.

1. **Async/loading states — none today:** `Spinner`, `Skeleton`, `Progress`.
2. **`Toast`/`Snackbar`** — no transient feedback exists (Alert/Callout are inline only). Consider Radix Toast.
3. **`Popover` + a public `Menu`/`Dropdown`** — only Dialog + Tooltip exist; a dropdown lives inside theme-toggle but isn't exported. Radix Popover + DropdownMenu.
4. **Form depth:** standalone `Checkbox`, `Combobox`/`Autocomplete`, and a form/validation pattern (no react-hook-form/zod seam today). Have: Input, Field, Select, Toggle, Radio, Slider, SegmentedControl.
5. **Display:** `Avatar`, `Breadcrumb`, `Pagination`.

---

## P2 — Quality / maturity

- **Component unit tests are nearly absent** — ~5 test files for 85 components. Behavior is guarded only by Playwright (a11y/visual/layout) + static guardrails. Add RTL behavioral tests (controlled state, keyboard, edge cases), starting with the interactive primitives (Select, Toggle, Radio, Dialog, SegmentedControl, the new P1 overlays). Biggest quality risk for a consumed library.
- **Storybook coverage partial** — ~20 of 65 components have stories. Backfill alongside P1.
- **Harden `smoke:consumer`** — it's resolve+import only ("Node can't import CSS"). Add a jsdom render test asserting a token CSS var resolves and a component mounts, to catch font/CSS/router-context gaps the current smoke misses.

---

## Appendix — job-hunt setup recipe (apply in the job-hunt repo)

1. `.npmrc` at repo root (skip if P0.2/npmjs is done):
   ```
   @hirobius:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```
   Set `NODE_AUTH_TOKEN` to a PAT with `read:packages` locally AND as a Vercel build env var.
2. `npm install @hirobius/design-system@0.7.0` (use 0.7.0 once P0.1 lands so no router is required).
3. In `src/main.tsx`: `import '@hirobius/design-system/tokens.css';` once, before render.
4. Copy the 3 font families into `public/fonts/...` (until P0.3 ships option a).
5. MUI coexistence: don't pair MUI `<CssBaseline>` with HDS global CSS; scope HDS to a section or pick one type system per surface (until P0.5 ships scoped CSS).
6. No router needed once on 0.7.0 (anchor default). To get SPA nav, wrap the app in `<HdsRouterProvider adapter={...}>` bridging your router.
