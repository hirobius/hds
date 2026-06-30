# Changelog

## 0.8.0

### Minor Changes

- 3f48fc9: Ship built TypeScript declarations instead of source, so the package typechecks
  cleanly in a consumer.
  - `types` and every `exports[*].types` now point at emitted `dist/types/**/*.d.ts`
    (via a new `build:types` step using `tsconfig.dts.json`), not raw `.ts`/`.tsx`
    source. Consumers no longer compile our source, so the prior errors
    (`import.meta.env`, `Cannot find module './lab/tokenUtils'`/`'./Token.module.css'`)
    are gone — under `skipLibCheck`, `.d.ts` are skipped.
  - Source is no longer published (`files` drops `src`); the tarball ships only
    `dist/` (+ protocol, tokens json, manifest). Nothing published references a
    pruned path.
  - The `manifest` and raw-`tokens` exports are typed (`SystemManifest` / inlined
    DTCG shape) so the emitted `.d.ts` is self-contained (no JSON-path imports);
    CSS side-effect imports are stripped from `.d.ts`.
  - Verified: a Vite-style consumer (strict, `skipLibCheck`, bundler resolution)
    can `import { Button } from '@hirobius/design-system'` (and from subpaths) and
    pass `tsc --noEmit` with only react/react-dom installed. `smoke:consumer` now
    gates on that consumer typecheck plus `publint`.

- 2c8ca1c: Host-safe CSS + verified consumer build (packaging task C-partial / D / E).
  - **New `@hirobius/design-system/variables.css`** — design tokens as CSS custom
    properties ONLY (no Tailwind preflight, no `@layer base` reset, no utilities).
    Importing it cannot restyle a host app's elements, so it's the safe path for
    embedding HDS tokens inside MUI/another design system. The full `tokens.css`
    is unchanged (greenfield).
  - **`sideEffects`** tightened to `["**/*.css"]` (source no longer ships), so
    bundlers tree-shake unused JS exports while keeping CSS side-effectful.
  - **`smoke:consumer` now also runs a consumer `vite build`** of a `Button`-only
    app with NONE of `react-router`/`react-hook-form`/`zod`/`@hookform/resolvers`
    installed — proving leaf imports don't drag in the router/form stack (they're
    optional peers, absent from the main bundle graph). Plus the consumer
    `tsc --noEmit` + `publint` gates added previously.
  - **docs/CONSUMING.md** documents the vars-only path for MUI coexistence and the
    verified "leaf imports stay light" guarantee.

  Note: scoping the full stylesheet's global Tailwind **preflight** reset is a
  tracked follow-up (needs visual-regression verification); `variables.css` is the
  host-safe path in the meantime.

## 0.7.0

### Minor Changes

- a37eef7: Bundle web fonts into the package. `@hirobius/design-system/tokens.css` now embeds the Satoshi, Clash Display, and Geist Mono `woff2` files directly (base64), so a fresh consumer importing `tokens.css` renders the real typefaces with zero extra setup — no need to copy font files into a web root. Self-contained at the cost of a larger `tokens.css`.
- 06df9d6: Add **HdsCheckbox** — a custom-drawn checkbox primitive with `checked`, `indeterminate` (aria-checked="mixed" + DOM property), disabled, and label support, on the shared interaction-state seam.

  Also export the existing input-family primitives that were built but missing from the public barrel: **HdsToggle**, **HdsRadio**, and **HdsSlider**. Consumers can now import the full form-control set (`Input`, `Field`, `Select`, `SegmentedControl`, `HdsCheckbox`, `HdsToggle`, `HdsRadio`, `HdsSlider`) from the package root.

- 76aed0a: Add **Combobox** — a searchable single-select built on the HDS Popover. The trigger shows the current selection; opening reveals a search field that filters the option list. Full keyboard support (↑/↓ to move, Enter to choose, Esc/outside-click to close), listbox/option ARIA, and controlled `value`/`onChange`. Closes the autocomplete gap in the form-control family.
- 9223f6a: Add **Form** + **FormField** — a validation-agnostic form seam. `Form` is a styled `<form>` with consistent field rhythm; `FormField` owns the a11y wiring (label↔control association, `aria-invalid`, `aria-describedby` for description + error, required marker) and accepts a plain `error` string. HDS takes **no** form/validation dependency — the validation source is whatever the consumer brings (native constraint validation, react-hook-form, zod, Formik). Mirrors the router-adapter philosophy: works with zero deps, richer when you inject your own. (The `Input` primitive already self-wires its label/error, so use its props directly; `FormField` is for controls that don't, e.g. native inputs, `Select`, `Combobox`, checkboxes.)
- 9adfe22: Add an optional React Hook Form + Zod form adapter on a new subpath:
  `@hirobius/design-system/form`. It exports `useHdsForm(schema)` (RHF's `useForm`
  pre-wired with a Zod resolver and `onTouched` validation), `HdsForm` (wraps the
  presentational `Form` in RHF's `FormProvider` and routes submit through
  `handleSubmit` + `noValidate`), and `HdsFormField` (a render-prop that binds a
  control to RHF by `name` and surfaces the field's Zod error through the existing
  HDS label/error/aria markup).

  `react-hook-form`, `zod`, and `@hookform/resolvers` are **optional** peer
  dependencies — only apps importing this subpath pull them in, so the main barrel
  stays validation-agnostic and zero-dependency. The core `form` module also now
  exports `FormFieldShell` + `useFieldWiring` (a non-cloning field-markup shell and
  the shared id/aria computation) for controls that manage their own callback ref.

- 8b3fe5b: Add four presentational primitives that consumers hit immediately: **Spinner** (indeterminate loading indicator), **Skeleton** (content-loading shimmer, `text`/`rectangular`/`circular`), **Progress** (linear determinate/indeterminate bar), and **Avatar** (image with initials fallback). All token-driven, accessible (`role="status"`/`progressbar"`/`img`), and honor `prefers-reduced-motion`.
- f444c6e: Add **Menu** — a Radix-backed dropdown-menu primitive (compound parts: `Menu`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.CheckboxItem`, `Menu.RadioGroup`/`RadioItem`, `Menu.Label`, `Menu.Separator`, `Menu.Group`, `Menu.Sub`/`SubTrigger`/`SubContent`) themed with the overlay role tokens to match Dialog/Popover. Roving focus, type-ahead, checkbox/radio items, submenus, and dismissal come from Radix. Promotes the dropdown that previously lived privately inside the theme-toggle into a public component (no new dependency — `@radix-ui/react-dropdown-menu` was already present).
- 8529e25: Add **Popover** — a Radix-backed floating-surface primitive (compound parts: `Popover`, `Popover.Trigger`, `Popover.Anchor`, `Popover.Content`, `Popover.Close`) themed with the overlay role tokens to match Dialog. Collision-aware positioning, outside-click + ESC dismissal, focus management, and portal mounting out of the box. Adds `@radix-ui/react-popover` as a dependency.
- 93171e1: Components no longer require react-router. Navigation is sourced from an injectable adapter (`RouterContext`): by default links render as plain anchors and navigation falls back to `window.location`, so HDS works with zero router. react-router / Next.js consumers inject their router once at the app root via `<HdsRouterProvider adapter={...}>`. `react-router` is now an optional peer dependency.
- 45fe9ab: Scope the design-system base styles (element resets, body/heading type baseline, theme transition) to a `[data-hds]` subtree so HDS can drop into a section of a non-HDS app (e.g. one running MUI `<CssBaseline>`) without competing resets or font-cascade fights. Namespaced token custom properties stay on `:root` (harmless).

  **Migration:** add `data-hds` to your app root (or the section that hosts HDS) so the base styles apply — e.g. `<html data-hds>` or `<div data-hds>…</div>`. Without it, components still receive their token-driven styling but the global type baseline/resets won't apply. See `docs/adr/016-scoped-base-styles.md`. Tailwind preflight remains global for now (documented follow-up).

- 01cdcd9: Add **Toast** — transient feedback notifications backed by Radix Toast. Wrap the app once in `<ToastProvider>`, then call `useToast().toast({ title, description, tone })` imperatively from anywhere. Tones (`neutral`/`info`/`success`/`danger`/`warning`) tint the leading icon via the feedback tokens; auto-dismiss, swipe-to-dismiss, the a11y live region, and the viewport portal come from Radix. Adds `@radix-ui/react-toast`.

## 0.6.0

### Minor Changes

- 82fbcf0: Alert: unify the feedback prop with Badge/Card/Callout. `variant` is renamed to
  `tone`, and the destructive value `"error"` is renamed to `"danger"` (the
  feedback red is `danger` everywhere now). The token CSS variables are unchanged.

  Migration: `pnpm codemod -t codemods/alert-tone-to-danger.cjs <path>`

- 82fbcf0: Button / IconButton: remove the deprecated `isDark` prop. Button chrome is
  theme-aware via CSS variables, so the prop was a no-op. Remove it from call
  sites.

  Migration: `pnpm codemod -t codemods/remove-button-isdark.cjs <path>`

- 82fbcf0: SegmentedControl: move `size` onto the shared `sm | md | lg` ramp used by
  Button/Input/IconButton. `size="default"` → `size="md"`, `size="compact"` →
  `size="sm"`. Rendering is unchanged.

  Migration: `pnpm codemod -t codemods/segmentedcontrol-size.cjs <path>`

## 0.5.0

### Minor Changes

- 23cfdae: Make the package publishable and consumable.
  - Publish target set to GitHub Packages (`publishConfig.registry`); `private`
    removed so `npm publish` is allowed.
  - Declare `react`, `react-dom`, and `react-router` as peer dependencies so
    consumers provide a single copy (no duplicate-React hook errors).
  - Wire up Changesets (`changeset add` / `version` / `release`) and a CI release
    workflow that publishes on merge to `main`.

- 390a877: Harden and slim the consumable package surface.

  **Packaging**
  - Cut the published tarball from ~49 MB / ~400 files to ~0.55 MB / ~207 files:
    the library build no longer copies the 47 MB `public/` tree (portfolio PNGs,
    fonts, JSON) into the package (`publicDir: false`), no longer ships sourcemaps
    (`sourcemap: false`), and no longer drags the whole component-preview universe
    (every component via `import.meta.glob`, the 3D mobius-scene chunk, the lab
    modules, the component-api/token-audit artifacts) into the bundle.
  - Excluded demo/lab/3D source (`src/stories`, `src/app/components/lab`, the
    mobius/shaders modules) from the package `files`.

  **Consumer resolution (fixes latent breakage in 0.4.0/0.4.1)**
  - Externalize `motion/react` correctly so the bundle imports it (resolved via the
    `motion` dependency) instead of emitting a bare `framer-motion` import — a
    package that was never a dependency, which broke every consumer of a
    motion-based component (tooltip, alert, disclosure, …).
  - Demote app-only runtime deps (`three`, `@react-three/*`, `postprocessing`,
    `express`, `cors`, `fuse.js`, `zustand`) from `dependencies` to
    `devDependencies`; consumers no longer transitively install the three.js
    ecosystem.

  **API surface**
  - Added subpath export `@hirobius/design-system/protocol` (bridge envelope).
  - BREAKING: removed `ComponentDocPage` and `SpecimenBlock` from the main barrel
    — they are docs-shell renderers, not consumable primitives. Import them from
    the in-repo doc site directly if needed.
    </content>

All notable changes to the Hirobius Design System (HDS) are documented in this file.

This project uses [Changesets](https://github.com/changesets/changesets) for structured
release management. When `@changesets/cli` is installed (`pnpm add -D @changesets/cli`),
run `pnpm changeset:add` to stage a user-visible change entry before merging a PR.

**Tooling note:** the `## Unreleased` section below is generated by
`scripts/generate-changelog.mjs` from git history. Re-run it after merges to refresh.
Once the changeset workflow is active, `pnpm changeset:version` will auto-aggregate
`.changeset/*.md` files and bump this file alongside `package.json`.

---

## Phase history overview

| Phase    | Milestone                                                                                         | Status      |
| -------- | ------------------------------------------------------------------------------------------------- | ----------- |
| Phase 0  | Project bootstrap — Vite + React + Tailwind v4 + token pipeline                                   | Complete    |
| Phase 8  | shadcn pivot — Radix primitives + cva/clsx/cn + HdsButton/Input/Card/Dialog                       | Complete    |
| Phase 9D | Three-column doc shell, cmd-k palette, scrollspy TOC, theme toggle                                | Complete    |
| Phase 10 | Token governance, component completeness, Figma plugin bridge v1                                  | Complete    |
| Phase 11 | Approval app — orchestration schema, bridge endpoints, list/detail views                          | Complete    |
| Phase 12 | HDS refinement — strict TypeScript, ESLint hardening, multi-tenant architecture, LLM prompt suite | In progress |

Current version: `0.0.1` (pre-1.0; semantic versioning enforced after first stable release tag)

---

## Unreleased

### ⚠ Breaking changes — public API (13y-20)

Four `Hds*`-prefixed primitives were renamed or removed during the
shadcn pivot (Phase 8). The new names are stable and re-exported from
`@hirobius/design-system` per the `src/index.ts` barrel.

| Old              | New          | Notes                                                                                    |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `HdsButton`      | `Button`     | Same API; prefix dropped during shadcn alignment                                         |
| `HdsSurface`     | `Surface`    | Same API; prefix dropped                                                                 |
| `HdsIconButton`  | `IconButton` | Same API; prefix dropped                                                                 |
| `HdsButtonGroup` | _removed_    | No drop-in replacement — use a `Stack direction="row"` with multiple `<Button>` children |

Migration: `import { HdsButton } from '@hirobius/design-system'` →
`import { Button } from '@hirobius/design-system'`. For `HdsButtonGroup`,
replace with a `Stack` wrapping multiple `Button` children.

ADRs (`docs/adr/005-north-star-primitives.md`,
`001-shadcn-baseline-distribution.md`, `006-four-tier-classification.md`,
`008-slot-vocab-radix-aligned.md`) reference the old `Hds*` names as
historical record — that is intentional and they should NOT be
rewritten. The migration applies to consumers, not to history.

### Features

- **ops:** 10o-14 derive-routes script ([289f9b7](#))
- **infra:** 10o-13-og-meta-validation static head-tag audit ([c39496f](#))
- **infra:** 10o-15-font-file-validation @font-face source existence check ([e45c2db](#))
- **bridge:** 12h-2 add --check-config mode + /pair pairing endpoint ([5b88183](#))
- **docs:** 10a-7 system scope page ([ebf293f](#))
- **orchestration:** multi-agent overnight burndown protocol + watcher ([9fdb059](#))
- **infra:** 12v-token-rebake-in-pre-commit detect generated-token drift in pre-commit ([57489cd](#))
- **tokens:** 12v-token-rename-detection-test guard against silent token renames ([d959d4c](#))
- **orch:** claim protocol — agents lock units before working to prevent collisions ([3dd9cf7](#))
- **infra:** 12s-infra-worktree-isolation-verification dispatch-pod.mjs pre-commit guard ([032dbcd](#))
- **toc:** 12j-doc-toc-scrollspy-dynamic-content observe DOM mutations for late-rendered headings ([123ea78](#))
- **theme:** 12j-doc-theme-prefers-color-scheme-listener subscribe to OS theme changes ([2fcb952](#))
- **tokens:** 12v-token-line-height-none-alias add semantic lineHeight.none alias + drop bypass ([ff6ae30](#))
- **infra:** 12s-infra-strengths-audit-script weekly cron audit of documented differentiators ([2fd3a1e](#))
- **llm:** 12k-llm-prompt-regression-suite scaffold + 8 canonical prompts ([9f9fe75](#))
- **architecture:** 12m-multi-tenant decision + token overlay format ([ff600c0](#))
- **ts:** 12i-quality-ts-strict-wave2 enable noUnusedLocals + noUnusedParameters + clean 55 violations ([5512744](#))
- **lint:** 12i-quality-eslint-upgrade install ESLint plugin stack + wire to pre-commit ([c8e09fc](#))
- **ts:** 12i-quality-ts-strict-wave1 enable 6 zero-error strict flags ([eb47347](#))
- **template:** 12b-1 + 12b-2 reconcile InfoPage status + smart-animate expand ([f81590c](#))
- **tokens:** 12a-3 bump Clash Display to medium/500 weight ([85dcdba](#))
- **system:** wave-2 sprint close — font switch, agent infra hardening, agency platform scaffold ([0cc660e](#))
- **docs:** 12d-1 manifest-driven docs pass — project intros from componentSpecs ([7548e5e](#))
- **hds:** 12a-1 remove auto-injected component index from doc shell ([96006c0](#))
- **tokens:** 10m-3-button-padding-tokens-size-segmented size-aware padding ([8e6935c](#))
- **nav:** remove overview page + token-explorer from left nav ([1b071a5](#))
- **bridge:** 10f-7-xpath-query-endpoint subset-XPath /query ([c7962ed](#))
- **figma:** 10f-1-figma-snapshot-adapter normalized snapshot shape ([ecdd38b](#))
- **10p:** tab-focus-ring + asset-validation + decision-log ADRs ([2adcf0e](#))
- **cleanup:** 10o-21-knip-driven-cleanup walk knip orphans + soft-wire ([681782a](#))
- **tokens:** 10t-7-clash-display-font Clash Display for headings only ([6a12bc9](#))
- **approval-app:** 11a-4 approval app per-unit detail view ([faa2928](#))
- **tokens:** 10t-5-type-ramp-composites Swiss-canon 8-style ramp ([19ffb04](#))
- **approval-app:** 11a-3 approval app list view ([8dde9f3](#))
- **docs:** 10d-11 mark lab/Token\* as @deprecated; capture closure note ([7236844](#))
- **docs:** 10d-14 surface componentSpec.figmaLink in doc-page header ([dc7b3d3](#))
- **cleanup:** 10o-22-delete-test-ghost-button remove HdsTestGhost ([e3b1c92](#))
- **approval-app:** 11a-2 bridge approval endpoints ([8112480](#))
- **approval-app:** 11a-1 orchestration schema validator + 11a unit seeds ([0876cfd](#))
- **docs:** 10d-13 remove WIP / under-construction emoji from component docs ([beed27b](#))
- **docs:** 9d-10 doc-page snapshot regression gate + a11y audit (closes 9-D) ([7f848e5](#))
- **bridge:** p6-3 /contrast endpoint (WCAG 2.1 luminance over serialized selection) ([630f794](#))
- **bridge:** p6-4 reverse token sync (Figma Variables → tokens-from-figma.json) ([d6b0e3c](#))
- **docs:** 9d-9 batch-refactor every doc page (shell + header + code-block + TOC + API ref) ([77d01a7](#))
- **bridge:** p6-2 /lint endpoint (run validator suite on serialized selection) ([f246e3f](#))
- **pipeline:** p6-5 fix-mode diff (selection vs LLM proposal) ([cd3f7d8](#))
- **docs:** 9d-6 right-rail TOC + scrollspy + deep-link anchors ([b85d23a](#))
- **plugin:** p6-1 manifest-aware selection serializer ([b176ffc](#))
- **docs:** 9d-5 HdsCodeBlock collapsed-by-default with copy + filename + language ([e285b64](#))
- **docs:** 9d-8 inline collapsed HdsApiReference (props + constraints) ([7a4b13a](#))
- **docs:** 9d-3 system/light/dark theme toggle ([b5ace7b](#))
- **docs:** 9d-2 cmd-k command palette over manifest ([e964600](#))
- **docs:** 9d-4 standardized doc-page header ([13d1a45](#))
- **tokens:** 9d-7 semantic.docs.\* type + spacing scale for doc-site ([f696a66](#))
- **bridge:** p5-4 plugin runtime error channel (render-error → retry loop) ([c1cd3d7](#))
- **manifest:** backlog-2 expand GENERATIVE_SUBSET via 8s-8 AST projection ([38fb002](#))
- **docs:** 9d-1 three-column doc shell (Vercel/Geist baseline) ([343c848](#))
- **bridge:** p5-3 auth — shared secret + HMAC middleware ([88e64e0](#))
- **bridge:** p5-2 request-response correlation (envelope.id pending Map + 30s TTL) ([af1d4a0](#))
- **protocol:** p5-1 message envelope (HMAC + replay-protection) ([1a15de3](#))
- **governance:** 8t-6 public-api-lockdown — package.json exports + barrel + @internal markers ([f1c0e3b](#))
- **docs:** 8t-4 template refactor batch — 5 templates ([f605721](#))
- **component:** 8t-3b pattern batch (heavy) — 4 patterns ([cf034db](#))
- **docs:** 8t-3a pattern doc batch (light) — 4 patterns ([00268ad](#))
- **docs:** 8t-2 template gallery doc shape + HdsInfoPage reference ([b2aa96f](#))
- **docs:** 8t-1 pattern doc template + HdsField reference page ([d78c94b](#))
- **tooling:** 8s-8 project componentSpec from source via TypeScript AST ([0eb5cc3](#))
- **component:** 8s-7 add HdsDialog (shadcn Radix Dialog + role.popover) ([85b031d](#))
- **component:** 8s-6 replace HdsCard with shadcn compound parts + role tokens ([f28ca12](#))
- **component:** 8s-5 replace HdsInput with shadcn baseline + role tokens ([9135ec0](#))
- **component:** 8s-4 replace HdsButton with shadcn baseline + role tokens ([7c7d001](#))
- **spike:** 8s-3 shadcn Button vs HdsButton side-by-side gallery ([36a72ff](#))
- **tooling:** 8s-2 add Radix slot + cva + clsx + tailwind-merge + cn() helper ([401bea6](#))
- **tooling:** 8s-1 reinstall Tailwind v4 with token bridge ([2b5cd72](#))
- **governance:** 8x-6 drop experiment tier; strict contract for componentSpecs ([5ce58d3](#))
- **tokens:** 8e-3 emit tailwind.config.tokens.cjs from DTCG source ([c043726](#))
- **tokens:** 8e-2 role.\* alias layer for shadcn vocabulary ([9584649](#))
- **tokens:** 8e-1 elevation/shadow composites + theme-aware shadow color ([fb2ba89](#))
- **governance:** 8x-5 split tier=utility|experiment into peer sections ([098418b](#))
- **governance:** 8x-4 orphan resolution — drop 5 source-less specs ([0e3ec58](#))
- **governance:** 8x-3 source @tier tagging + tier required on validate ([161cffc](#))
- **governance:** 8x-2 heuristic tier audit + draft TIER_AUDIT.md ([618e058](#))
- **manifest:** 8x-1 tier schema-extension + utilities/experiments sections ([c7ec69f](#))
- **governance:** 8v-6 figma-masters snapshot regression gate ([464a7f0](#))
- **governance:** 8v-5 binding-completeness validator + drift hard-fail ([2b4f44a](#))
- **governance:** 8v-4 binding drift gate (soft) for source ↔ slots[] ([e40922e](#))
- **pipeline:** 8v-3 project figma-masters-batch from manifest slots[] ([33335fb](#))

### Bug Fixes

- **orch:** restore orchestration.json wrapper structure ([8d70f91](#))
- **lint:** wave-1 burndown — clear @typescript-eslint/no-unused-vars from all src/app files ([c4c1f4d](#))
- **scripts:** audit-tokens --scan-source exits 0 cleanly with no patterns ([0fca22f](#))
- **validators:** 12i-1 manifest scanner skip 10 demo helpers + promote validate-manifest to pre-commit hard-fail ([c9931cd](#))
- **a11y:** 12a-4 brand-blue swatch contrast — repair OKLCH→RGB conversion ([b4ffa0c](#))
- **nav:** strip DocLayout navSlot + tocSlot from all HDS doc pages ([53a1e78](#))
- **nav:** remove duplicate sidebar nav from all HDS doc pages ([6103b5f](#))
- **hds:** remove dead system.manifest.json import + SYSTEM_MANIFEST const ([ab8569c](#))
- **nav:** restore HdsNavItem import in HDSLayout post-merge ([e721670](#))
- **a11y:** 10a-1-foundations-contrast-pass resolve two WCAG AA failures ([8899b55](#))
- **visual:** /hds/tokens drift root-cause + targeted re-baseline ([23664c6](#))
- **motion:** 10p-3-motion-tighten remove ornamental motion + Swiss-canon enforce ([757a428](#))
- **pipeline:** 10m-6-iconButton-invert-mapping lock invert behavior with negative + omitted fixtures ([48fbd1f](#))
- **pipeline:** 10m-2-registry-stub-summaries write real summaries + promote check:registry ([94de50c](#))
- **pipeline:** 10m-1-playwright-baseline-rewrite-fix block default visual baseline rewrites ([3342c02](#))
- **plugin:** cleanup-dead-sync-endpoint — remove Step 3 /sync button ([555d872](#))
- **governance:** 8x-6 follow-up — retier 9 doc-exempt non-public components ([77fef27](#))

### Performance

- **bundle:** 12o — lazy HDSLayout Möbius layer + fix pre-existing audit violations ([5c2ea54](#))

### Refactoring

- **hds:** 12i-bloat-hdslayout-health-rail-extract move TokensRail + helpers to HdsHealthRail.tsx ([0440bd1](#))
- **icons:** migrate every Phosphor import site to Lucide ([576c4ee](#))
- **icons:** port HdsIcon wrapper to lucide-react ([50813ca](#))
- **types:** drop 6 unused exported types/symbols (knip drain) ([d99c9fd](#))
- **docs:** drop 10 true-orphan doc-pattern + doc-template files (knip drain) ([47e07fe](#))
- **types:** 12i-bloat-token-audit-types-shared unify TokenAuditReport across HDSLayout + HdsLegacyTokenDetail ([1385486](#))
- **lab:** 12i-bloat-legacy-token-dead-code extract colorUtils + drop voided helpers ([fa94727](#))
- **docs:** 12i-bloat-docprimitives-dead-found-components drop unused foundation primitives ([42ebc99](#))
- **hds:** 12i-bloat-hdslayout-dead-code drop dormant SearchModal + CollapsibleNavGroup + helpers ([89f9df2](#))
- **component:** demote HdsHistoryCard to utility tier + simplify ([117b4a3](#))
- **scripts:** backlog-1 consolidate audit-component-source into audit-tokens --scan-source ([390e147](#))

### Documentation

- **rules:** 12f-1 card anatomy block in llms.txt + REACT_COMPONENTS.md ([71f81c7](#))
- **architecture:** 12n-api-rfc-process-formalization ADR numbering + lifecycle ([5a3094b](#))
- **ai:** autonomous protocol — add claim-before-work step ([94983ee](#))
- **ai:** 12s-infra-no-bulk-lint-fix-policy rescue mark unit done ([71456a0](#))
- **ai:** 12s-infra-sub-agent-prompt-templates rescue add PROMPT_TEMPLATES.md file ([6624058](#))
- **ai:** 12s-infra-no-bulk-lint-fix-policy codify rule in CLAUDE.md + memory ([6e56015](#))
- **ai:** 12s-infra-sub-agent-prompt-templates 5 reusable dispatch templates ([94d5408](#))
- **ops:** strengths catalog + 3 batched prompts for fresh-session dispatch ([a542614](#))
- **ai:** comprehensive session capture — 17 missing units + scorecard + agent guidelines ([8b1595b](#))
- **architecture:** 12i-bloat-hdslayout-architectural-split — full split plan ([1a89edd](#))
- **coherence:** 12j-doc-coherence drain 6 verified contradictions ([f4e41ba](#))
- **icons:** sync all doc surfaces to Lucide-canonical claim ([e6420ca](#))
- **tokens:** 12j-doc-ghost-token-component-inset fix REACT_COMPONENTS.md component.inset -> component.padding ([884dcee](#))
- **typography:** 12j-doc-typography hot-fix wrong family + heading weight in DESIGN/DESIGN-HANDOFF ([802b3b4](#))
- **elevation:** 12i-elevation-reconcile drop sticky + sync 4-role rule across docs ([5b37c19](#))
- **ai:** reconcile ROADMAP + OPERATOR_BRIEF after Sprint 2 close ([f983891](#))
- **ai:** brief reconcile for Wave 2 + Phase 12 spec handoff ([1d4a8db](#))
- **ai:** refresh AUTONOMOUS_BUILD.md gate lists post-overnight ([119c168](#))
- **ai:** reconcile state after overnight push (24 commits, 5 clusters closed) ([ed79beb](#))
- **governance:** p7-3 feature-flag lifecycle policy + flag audit ([2fcf922](#))
- **ai:** sharpen backlog-2 scope to leverage 8s-8 AST projection ([d7af539](#))
- **ai:** queue 9-D-docs-aesthetic cluster (Vercel/Geist-style) ([098086b](#))
- **ai:** reconcile state after 8-V cluster closes ([0a2b246](#))
- **ai:** handoff state after 8v-1/2/3 land ([a1547ed](#))

### Tests

- **perf:** 12p-test-property-based-token-math fast-check property suite for colorUtils ([510c3c0](#))
- **orch:** 12p-test-orchestration-validator-self-test add test file + validator export refactor ([3933d9e](#))
- **orch:** 12p-test-orchestration-validator-self-test cover 8 rules with positive + negative cases ([afad397](#))

### Chores

- **orch:** claim 2 units for session:overnight-2026-05-02-pod-spacing ([fdbc0f5](#))
- **orch:** claim 10a-5-grid-system-doc for session:overnight-2026-05-02-pod-grid ([1c2050a](#))
- **orch:** claim 3 units for session:overnight-2026-05-02-pod-validators ([d7b7aa3](#))
- **orch:** claim 10t-1-relationship-diagram-static for session:overnight-2026-05-02-pod-tokendiagram ([ecdba10](#))
- **orch:** claim 10o-19-changelog-generation for session:overnight-2026-05-02-pod-changelog ([33ecce1](#))
- **orch:** claim 10o-15-font-file-validation for session:overnight-2026-05-02-pod-fonts ([8d20d2a](#))
- **quality:** 12i-quality-dormant-validators-triage document high-value dormant checks ([20f351e](#))
- **orch:** claim 12i-quality-dormant-validators-triage for session:fresh-2026-05-02-w2-a4 ([5adeb12](#))
- **orch:** claim 10o-7-archive-legacy-planning-docs for session:fresh-2026-05-02-w5e ([123dfea](#))
- **orch:** claim 10a-7-scope-doc for session:fresh-2026-05-02-w5c ([0fdc7d0](#))
- **orch:** claim 12h-2-plugin-auth-envelope for session:fresh-2026-05-02-w5a ([3a2acc6](#))
- **orch:** claim 12f-1-card-visual-guidelines for session:fresh-2026-05-02-w5d ([d2c79ec](#))
- **orch:** claim 3 units for session:fresh-2026-05-02-w4b ([64d5fd8](#))
- **orch:** claim 4 units for session:fresh-2026-05-02-w1b ([1c17250](#))
- **orch:** claim 5 units for fresh-session window 4 dispatch ([f56c9e4](#))
- **regen:** refresh component-api.json source-line offsets after wave-1 lint + completeness work ([a7c66f4](#))
- **quality:** 12i-quality-tsconfig-typecheck-realign cover full src tree ([5c9a950](#))
- **github:** 12i-quality-pr-issue-templates rescue land PR + issue templates ([436876f](#))
- **quality:** 12i-quality-component-completeness-burndown burndown + promote to pre-commit ([e505188](#))
- **ops:** 12s-infra-tag-baseline-pre-merge tag v0.2.0-pre-merge + recurring protocol doc ([d110b50](#))
- **github:** 12i-quality-pr-issue-templates add PR + issue templates ([3e20576](#))
- **lint:** 12i-quality-eslint-burndown wave-1 lower baseline 521 -> 206 ([fb40a28](#))
- **ai:** add 5 testing-strategy units (coverage + state-store + property-based + validator-self-test + required-checks-promote) ([99c7339](#))
- **ai:** add 12i-quality-audit-tokens-burndown for 8 token-bridge violations ([d7d3797](#))
- **ai:** add 3 multi-tenant follow-up units (source-canon scope guard + runtime provider + JSON Schema) ([ff0aed0](#))
- **ai:** add 12l-figma-plugin-auth-secret-wiring follow-up unit ([8e0433c](#))
- **flags:** 12k-llm-phase-6 activate selection-serializer + lint + contrast + reverse-token-sync + snapshot + xpath ([92c28f6](#))
- **flags:** 12k-llm-phase-5 activate auth + correlation + runtime errors ([9fbef8e](#))
- **ai:** capture full autonomous queue across 13 clusters ([31bdcd9](#))
- **deps:** drop @phosphor-icons/react dependency ([1bcc990](#))
- **ai:** mark 3 Pod-2 false-positives denied + queue 12f-4 video-ingestion unit ([0e1e1f8](#))
- **history:** post-Pod-6 auto-pipeline regen + commit-history bump ([773c01c](#))
- **history:** post-commit auto-updates after Pod 5 CI workflow merge ([6393d01](#))
- **history:** post-commit auto-update after Pod 3 cherry-picks 1-2 ([136a23f](#))
- **history:** update commit-history.json after elevation reconcile ([09fe8f9](#))
- **repo:** mechanical drains + pre-commit hardening ([d11b51c](#))
- **canon:** 12a-5 zero raw inline typography in non-bypassed source ([1e847c2](#))
- **ai:** add backlog-23 FOUC prevention + delete TASKS.md ([2ce3ece](#))
- **ai:** restore 86-unit backlog scrub + 5 new directive units ([ac424e3](#))
- **ai:** wave-2 close — 13 units → done + 3 ad-hoc + 10c-1 denied ([a5a4d93](#))
- refresh commit-history.json post Pod 1-7 merges ([25c313e](#))
- **ai:** wave-2 reconcile — 5 done + 3 in-progress (worktrees) ([af25302](#))
- **ai:** wave-2 prep — eco-rule + 22 unit specs + Wave 1 reconcile ([2c0fb73](#))
- **visual:** refresh baselines after typography swap ([3ee1732](#))
- **governance:** 8t-5 orphan-final-cleanup — drop ComponentDocPage alias + capture HdsErrorBoundary ([aa99475](#))
- **orchestration:** mark 8x-6 and 8s-1 completed ([bc3a6ee](#))

### CI

- **llm:** 12k-llm-daily-synthetic-cron daily regression run against 8 prompt goldens ([82b0847](#))
- **github:** 12p-test-required-checks-promote wire responsive + collision suites + policy doc ([74ee0e5](#))
- **github:** 12i-quality-ci-hardening-bundle quality.yml + visual + a11y + token-scan + build step ([22b380b](#))
- **github:** 12i-quality-ci-pr-gates add Quality-gates workflow on PR ([280d1d0](#))

### other

- merge: overview page removal + nav cleanup (token-explorer + overview hidden) ([324c116](#))
- merge: Pod 8 redo + tokens drift docs — 10a-1 contrast + 10m-3 button padding ([a9a8912](#))
- merge: Pod 4 — 11a-1..4 approval app schema + bridge + list + detail ([dd1bb44](#))
- merge: Pod 7 — 10p-3 motion tighten ([a0b373e](#))
- merge: Pod 2 — 10d-13 emoji + 10d-14 figmaLink + 10d-11 token-explorer deferral ([e9d9b44](#))
- merge: Pod 3 (third commit) — 10m-6 iconButton invert fixtures ([917e98b](#))
- merge: Pod 1 — 10o-22 ghost button delete + 10o-21 Knip drain ([13a3b65](#))

_Older history truncated. Run with --all to see full log._
