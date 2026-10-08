# Changelog

## 0.22.0

### Upgrade

```sh
npx @hirobius/design-system@latest upgrade
```

- Do by hand: The raw tokens (the tokens export and hirobius.tokens.json) are strict DTCG now, so read semantic.motion.\*.\$value.timingFunction instead of .easing, and the elastic spring and each semantic.elevation level from \$extensions\["com.hirobius.hds"].\$value.
- Do by hand: The figmaUrl of each component in the ./manifest export (public/hds-manifest.json) now points at file 2VgBbVpKiDnu0aftJEVyBQ, "HDS Tokens & Components"; node ids are unchanged, so a stored link needs only the new file key.
- Do by hand: The hds-mcp get_component tool now marks core: true only on the 43 ratified core components and recommended: true on the wider set AGENTS.md recommends, and list_core names its set, so read recommended where you relied on core for that wider set.
- Looks different: --component-tag-lineHeight is now 1.5 instead of an invalid value the browser ignored, so text that reads it gets that line height.
- And 2 more: see [UPGRADING.md](https://github.com/hirobius/hds/blob/main/UPGRADING.md#0220).

### Minor Changes

- cd10fa5: `hirobius.tokens.json` is now strict W3C DTCG. `component.tag.lineHeight` is typed `number`, matching the token it aliases, which also fixes `--component-tag-lineHeight` in `dist/hds-tokens.css` (it was `undefinedundefined`, now `1.5`). Generated CSS variables, TypeScript and Figma variables are otherwise unchanged, but the raw JSON (the file itself and the `tokens` export) changes shape in three places, so code that reads it directly must move: `semantic.motion.*.$value.easing` is now `semantic.motion.*.$value.timingFunction` (a DTCG `transition`, with a `delay` of 0ms, and the group's `$type` is `transition`); `primitive.easing.elastic.$value` is now a `cubicBezier` array, with the spring parameters under `$extensions["com.hirobius.hds"].$value`; and each `semantic.elevation.*` level has no `$value`, its surface, shadow and border sit under `$extensions["com.hirobius.hds"].$value`. The `$type` values `motion`, `spring` and `elevation` also moved into that extension. `fromDtcg` in `scripts/lib/token-dialect.mjs` returns the previous shape.

### Patch Changes

- 4ae32c7: One source for the core set. The ratified core list now lives in `mcp/core-set.mjs`, and the hds-mcp server and `AGENTS.md` build the guide's wider set on it. `list_core` and `AGENTS.md` now call that wider set "recommended" (`list_core` gains a `set` field, `get_component` marks `recommended: true`), and `get_component` marks `core: true` only for the 43 ratified components, matching the manifest flag. The names shown are unchanged.
- 3c66e95: Figma links point at the one HDS library. Every `figmaUrl` in `public/hds-manifest.json` (the `./manifest` export) and every `@figma` tag now names file `2VgBbVpKiDnu0aftJEVyBQ`, "HDS Tokens & Components"; the file they named before is retired. Node ids are unchanged, so a tool that reads the node id keeps working, and one that stored a URL only needs the new file key. New components are drafted in a separate file, "HDS Staging", and redrawn in the library before they ship, so no link the package carries ever names HDS Staging. No component, prop, token or style changed.
- fc61af3: One command now upgrades you (hds#452): `npx @hirobius/design-system@latest upgrade`. It reads the version you have from your lockfile (pnpm, npm, yarn or bun; then `node_modules`, then `--from`), upgrades every workspace package that uses HDS from its own version, runs each release's codemods, bumps the range with its operator kept, adds back a dependency HDS stopped installing that your code still imports, installs and runs your typecheck. It then prints four lists: Fixed for you, Looks different (only what your code uses), Coming next and Do by hand. It exits 0 when done, 1 while work is left and 2 when it refuses, changing nothing: below the 0.16.0 floor, a downgrade, or a version it has no steps for. `--dry-run` and `--check` write nothing, `--json` and `--report <file>` give the report as JSON (`upgrade/schema.json`, `$defs.upgradeReport`). The steps always come from the copy you run, so `@latest` brings the newest. `hds-upgrade` is the same command as a bin of its own.
- dc49033: The package now ships its upgrade record (hds#451). `UPGRADING.md` lists what each release from 0.17.0 asks of you, newest first, in four lists: Fixed for you, Looks different, Coming next and Do by hand. `MIGRATIONS.md` and `CHANGELOG.md` ship too, so the links to them work inside `node_modules`, and so do `upgrade/index.json` (every release, its breaking count and the 0.16.0 floor), the per-release ledgers in `upgrade/releases/` and their schema, `upgrade/schema.json`. From this release on, each CHANGELOG section opens with an Upgrade block: the command to run, then what is left to do by hand. Divider's `strong` and InlineCode's `compact` props, deprecated before 0.16.0, join the record (removed in 1.0.0). Nothing in the code changes.

## 0.21.0

### Minor Changes

- def444a: Agent tooling ships in the package (hds#515). Nothing changes on the main entry or any existing subpath.
  - `AGENTS.md` at the package root: one answer per screen need (a row of numbers is `MetricTiles`, a destructive confirm is `AlertDialog`, a saved message is a toast through `useToast`, a form is `Form` with `FormActions`, and so on for 24 needs), the import path of each core component, and the rules. Generated from `mcp/guide.mjs`; `pnpm check:agents-md` keeps it in step.
  - `hds-mcp` bin: an MCP server over stdio (run the `hds-mcp` bin in an app that has the package installed, or `npx -p @hirobius/design-system@^0.21 hds-mcp`; no dependencies, no network) with four tools, `list_core`, `search_components`, `get_component` and `search_tokens`. Each answer is compact JSON under 2 KB, read from the manifest and component API data the package already ships.
  - `./eslint-plugin` subpath: the consumer ESLint plugin (`import hds from '@hirobius/design-system/eslint-plugin'`, then `...hds.configs.recommended`).
  - **Breaking for anyone already using the plugin** (`@hirobius/eslint-plugin-hds` from git, now 0.2.0): the new rule `hds/no-raw-controls` is `error` in `recommended`. It fails raw `<button>`, `<input>`, `<select>`, `<textarea>` and `<form>`; replace them with `Button`, `Input`, `Select`, `Textarea` and `Form` (from `/patterns`), or turn the rule off in your config: `rules: { 'hds/no-raw-controls': 'off' }`.
  - Usage contracts (`usage` in `component-api.json` and the manifest, shown in `llms.txt`): `AlertDialog` gains one (when to use it, when to use `Dialog` instead), and `Dialog` points to `AlertDialog` for a destructive confirm. `Stat` now reads as an inline figure inside prose or a dense list and, like `StatusTile` and `Card.Metric`, points to `MetricTiles` for a row of headline numbers. No component changes behaviour.
  - `llms.txt` opens with a "Start here" section naming AGENTS.md, the MCP server and the lint plugin, then the same "Pick by need" list as AGENTS.md, rendered from the same source.

- 57ef003: Component defects from the 2026-10-07 bug bash (hds#522).

  Behaviour removed or changed, so this is a minor (0.x): `ErrorPattern` no longer fills 100vh unless `fullPage` is passed; `Grid.Item` no longer sets `height: 100%`; `Grid`'s default `align` is now `start` (it was `stretch`), so Cards, Surfaces and StatusTiles in a Grid hug instead of filling the row (pass `align="stretch"` where a row needs equal heights); `Table` is now flush by default (`flush={false}` restores the padding); Surface, Card and StatusTile lost their `h-full`. Alert, Toggle and labelled dot Badge/StatusDot roles also changed (see A11y).

  Broken: Progress's neutral fill had the same colour as its track (`bg-accent` and `bg-muted` both map to near-white), so it was invisible; the fill is now the accent surface and `sm` is 6px. SegmentedControl `md` segments were `w-full` in a `w-fit` rail, so one segment filled the rail and the rest scrolled away; they now hug, and the rail is 40px like Button and Input (`sm` 32px). Slider's track was a padded Surface (48px slab, 0px fill, over the label); it is now an 8px bar with a visible fill. Checkbox, Radio and Toggle had two tab stops because motion's `whileTap` put `tabindex=0` on the label; the label is now `tabindex=-1`. Skeleton `rectangular` defaults to 5rem high and its fill is `surface-sunken`, so it shows on a Card. Disclosure `variant="card"` no longer clips its content or leaves empty space when closed. CodeBlock's `<pre>` is padded 16px, not the 80px section stack.

  Layout: Input, Textarea, Select, Combobox and Slider cap at 40rem (override with `--hds-form-control-max-width`, or `max-w-none` on the control's `className`). Select matches Input (40px, 44px at 390; same fill, 14px label, up-down chevron), and the built-in labels of Input, Textarea and Select are the FormField label (14px). Card, Surface, StatusTile and Grid.Item no longer stretch to the tallest sibling: Grid takes `align` (default `start`, `stretch` to opt in; MetricTiles stretches). Where a row needs equal heights, pass `align="stretch"` to the Grid (a dashboard Grid of Cards needs it). Table's scroll region is flush by default, so cells are not inset twice (`flush={false}` restores it). AssetImg's no-`src` fallback and ErrorPattern fit their container; ErrorPattern takes `fullPage` for the old 100vh behaviour, which is no longer the default. Checkbox, Toggle and Radio rows share one inset and height. Stat aligns to the start. MetadataList horizontal sizes its term column to its content. A vertical Divider stretches across a row without relying on a parent height.

  A11y: Combobox returns focus to its trigger after Escape or a pick (hds#311). Alert is `role="status"` for info and success and `role="alert"` for danger and warning. Toggle is `role="switch"`. A labelled dot Badge and StatusDot are `role="img"`, not live regions. A pressed toggle Button fills with the accent surface. On touch, Checkbox, Radio and Toggle rows, the Pagination page buttons and the CodeBlock copy button reach 44px. Dialog and AlertDialog keep a 16px margin from the viewport edge at 390. `<FormActions primary>` makes a bare Button primary. Badge warns once in dev when `label` is used without `dot`.

  Not in this patch (contract wave): Card.Header/Body/Footer double padding, the dark raised-surface contrast step, MetadataList inset across variants.

- b9694ea: The ratified core set is published where consumers and agents read it (hds#374). The 43 core components (the hds#254 disposition table as updated by hds#393 and hds#394) carry `core: true` on their spec in `public/hds-manifest.json` (the `./manifest` subpath), in `component-api.json` and in the agent manifest projection; `core` is a new optional boolean in `manifest/schema.json`, independent of `tier` (five core components are `tier: pattern`, and not every `tier: primitive` component is core), and non-core specs omit it. `llms.txt` gains a "Core set" section listing the 43 by name and category, and its "Which one when" lines mark them `[core]` (`Button: [core] Trigger an action…`; the name still comes first). The `hds-consumer` agent skill gains a "Core set" section before its allow-list, and the README a generated "What belongs in the system" section naming the core set by category and the 12 modules on `@hirobius/design-system/patterns`.
- 14eb027: Brand fonts are now an opt-in `fonts.css` instead of being base64-embedded in `tokens.css` and `styles.css` (hds#479). Consumers that want the HDS fonts must add one import:

  ```ts
  import '@hirobius/design-system/fonts.css'; // Satoshi 400/500/700 + Geist Mono 400
  ```

  Without it, text falls back to the family stack in `--hds-font-family` and `--hds-font-family-mono` (`"Satoshi", system-ui, …`), so a consumer that brings its own fonts no longer downloads ours. `fonts.css` ships with the four woff2 files in `dist/fonts/`; its URLs are relative (`./fonts/satoshi-400.woff2`), so Vite, Next and webpack resolve and hash them, and every face keeps `font-display: swap`.

  Size: `tokens.css` goes from 152.8 kB to 20.3 kB gzipped (304 kB to 130 kB raw), and `styles.css` from 152.2 kB to 19.6 kB. The four woff2 files plus `fonts.css` are 132 kB raw, read only when a face is used.

  A consumer app must add `import '@hirobius/design-system/fonts.css'` next to its `tokens.css` or `styles.css` import when it upgrades, or its UI renders in the system font.

- 5d7c98c: **`StatusDot` and `StatusDotProps` are removed (hds#465).** Both were deprecated in 0.20.0 with `@removeIn 0.21.0`. Replace `<StatusDot tone size label>` with `<Badge dot tone size label>`: `tone`, `size` and `label` map one to one, and so does the dot. Badge takes no `style`, so there is no codemod: move any `style` to a wrapper element or a `className`, then swap the component (MIGRATIONS.md, "0.21.0 removals"). From 0.22.0, `npx @hirobius/design-system@latest upgrade` finds every use by import and by JSX tag. ADR-014 now allows a removal to ship with a manual step like this one.
- 14eb027: Type ramp cut to 5 roles plus mono; old composite names are deprecated aliases; headings render smaller (hds#483, #485, #486, #487).

  The ramp is now `display` 48/1.05 700, `title` 24/1.25 700, `body` 16/1.6 400, `ui` 14/1.5 500, `caption` 12/1.5 500 and `mono` 13/1.5 400. `semantic.typography.title` is new, and `display`, `body`, `ui`, `caption` and `mono` change value: display goes 60 to 48px, body 17 to 16px with 1.6 leading, caption gets 1.5 leading, mono 14 to 13px.

  Every old name still resolves, so no import breaks, and each now holds its role's value: `h1`, `h2`, `h3` (48, 30 and 20px) and `typeStyles.heading1` to `heading3` render as `title` (24px, so headings render smaller); `eyebrow`, `badge` and `micro` render as `caption` in sentence case (the uppercase and wide tracking are gone); `technical`, `monoXs` and `monoSm` render as `mono`; `small`, `label` and `bodySmall` render as `ui`. `<Text variant>` takes the six role names; `heading1` to `heading3`, `technical`, `eyebrow`, `badge` and the four doc variants stay accepted, tagged `@deprecated` with `@removeIn 1.0.0`, as do the matching `hds.typeStyles` keys. The deprecated `Text` variants keep their old default elements (`heading1` is still an `h1`); the new `title` defaults to an `h2`, so pass `as` where another level matters.

  The fluid `clamp()` size overrides on display and the headings are gone; the ramp is static. Title is 700 because Satoshi has no 600 face. Satoshi still ships 500 and 700 faces only, so body (400) draws on the 500 face until a Satoshi Regular face is added.

  New: the `.hds-type-<role>` classes in `theme.css`, and `scripts/check-type-ramp.mjs`, a pre-commit gate that fails a raw size, weight or line height in `src/` and any deprecated composite. Figma text styles need a Sync after this ships (hds#489).

### Patch Changes

- dd00c68: `Button` and `Card` no longer use the Tailwind important modifier (`!`) for `tone` (hds#372, ADR-030). A status tone now wins over `variant` the way every other class override does, by tailwind-merge class-group replacement: Button's tone strings also set the hover fill and hover border, so no variant hover colour leaks through, and Card's tone sets `border` plus the feedback colour, replacing `accent`'s `border-2`. No visual change in any variant, tone, state (`iconOnly`, a toggle on or off, a selectable or selected Card) or theme; a toned toggle keeps the tone colours when on, as before. One behaviour change: a consumer `className` can now override a tone's colours the same way it already overrides a variant's (before, `!` made tone colours unoverridable), which is the documented escape-hatch model.

## 0.20.0

### Minor Changes

- c506c3b: Button (and so an icon-only Button; IconButton is removed in this release, hds#394) expresses the pressed state through a token (hds#322). `semantic.color.state.pressed.overlay` is a new opaque colour (black in light, white in dark) exposed as `role.pressed-overlay` and the Tailwind colour `pressed-overlay`; Button applies it as `active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5`, an inset box-shadow wash that composes with the focus ring and any consumer `shadow-*`, in place of `active:brightness-95 dark:active:brightness-110`. The visible change: a press now tints the control's fill only (label and icons are no longer run through the filter), reads 5% white rather than a 110% brightness bump in dark mode, and no longer transitions; the tone variants' hover brightness is unchanged. The variable ships in the Figma model so the staging Pressed variants can bind their overlay fill to it instead of a hard-coded 5% black.
- 9f9d143: Box `sx` spacing props take the t-shirt scale by name (hds#206): `p: 'md'`, `gap: 'sm'`, also inside a responsive map, resolve to `var(--semantic-space-scale-*)`. Before, those names passed through as invalid CSS and rendered no spacing. Nothing else Box or Stack renders changes: every other `sx` spacing value and every Stack `gap` value computes the same pixels as before, in every tenant, density and breakpoint (a Chromium test locks this against the previous commit). Box's deprecated `'tight'`, `'normal'`, `'inset'` and `'spacious'` still read the fixed `--semantic-space-layout-*` vars, and Stack's same four names still read the scale steps, which compact density tightens; both are removed in 1.0. In a development build, each of Box `sx`'s four logs one `[HDS deprecation]` console warning naming the step to use (`'sm'` to `'xl'`); Stack's do not warn yet. Stack's `gap` and Box's `sx` now share one resolver (`resolveSpacingValue` in `box-sx.ts`), each with its own vocabulary. No token is removed; MIGRATIONS.md lists the old names, their replacements, and what the swap does under `data-density="compact"`. Inside HDS, `check-spacing-vocabulary` now blocks raw integers on `sx` spacing props at pre-commit.

  Token descriptions only, no value changes: 15 `$description`s in `hirobius.tokens.json` (8 of them the hds#206 spacing ones) are trimmed to the 20-word limit that `check-token-descriptions --no-missing` enforces in `pnpm check`.

  `hds.density.*` is deprecated (`@deprecated`, `@removeIn 1.0.0`). It was a second t-shirt vocabulary whose names mean different pixels (`density.sm` is 8px, `scale.sm` is 16px). Use `hds.semantic.space.scale.*`, one name down: `density.sm|md|lg|xl|xl2` compute the same pixels as `scale.xs|sm|md|lg|xl` at both densities. `density.xs`, `xl3` and `xl4` have no scale step. It still works; MIGRATIONS.md has the table.

- 8e53a8a: `Tooltip` is public in the manifest again (hds#390). Component discovery read a JSDoc tag anywhere in a comment, so the words "an @internal image-expand pill" in Tooltip's description marked it `hidden` with category `Internal`. Tags now count only at the start of a JSDoc line. `componentSpecs.Tooltip` in `hds-manifest.json` is `hidden: false`, category `Overlays`, and the consumer skill lists it under Overlays. No other component changed.

  Deprecated components carry their deprecation in the manifest (hds#390). A spec whose component JSDoc has `@deprecated` now gets `deprecated` (the notice), `removeIn` (from `@removeIn`) and `useInstead` (from `@useInstead` in the same block), declared as optional string properties in `manifest/schema.json` and typed on `ManifestComponentSpec`. The five specs that carried them (CinematicLink, ComponentInstanceMatrix, FoundationSwatch, Sketch and Token) are removed in this same release (hds#389 R1), so the shipped manifest has no deprecated spec; the consumer skill (`skills/hds-consumer/SKILL.md`) and the `llms.txt` "Which one when" section and props digest skip any spec that does.

  Manifest `props` and `propConstraints` now follow the code (hds#390). `pnpm manifest:generate` used to fill them from `component-api.json` only when a spec had none, so a prop kept the type it had when first recorded. They are now rebuilt from `component-api.json` on every run, including Button, Card, Input and Dialog, whose props `pnpm tokens` used to overwrite with a hand-kept list: 56 specs change, 132 props the code has are added and 14 it no longer has are dropped. For example `Stack.props.wrap` is `FlexWrap` (it said `boolean`), `SegmentedControl.size` is `sm | md` (it said `default | compact`), and `Stat.tone` lists `neutral`, not `default`. Literal unions stay enums. A prop typed by a named alias (`InputSize`, `NavVariant`, `GapOption`, `PaddingOption`) now carries the alias name instead of a hand-kept value list, because `component-api.json` does not expand aliases.

- ebe0a41: Every root deprecation now says when it is removed (hds#390, hds#389 D6). The 27 deprecated root exports carry `@removeIn 1.0.0`: the 21 pattern-tier names that should be imported from `@hirobius/design-system/patterns` (ActivityFeed, AppShell, AssetImg, Calendar, Carousel, CodeBlock, CommandPalette, DocLinkCard, ErrorPattern, FileInput, Form, Lightbox, NavItem, OverflowList, Page, Reveal, SideNav, Stepper, Toolbar, TopNav, TreeList) and the six `Hds*` aliases (HdsCheckbox, HdsRadio, HdsSelect, HdsSlider, HdsToggle, HdsTooltip). So do the three deprecated `hds.semantic.space` tokens on the `/tokens` entry: `component.padding`, `component.gap` and `layout.gutter`. The 27 root names are then removed in this same release (hds#389 R1, see the BREAKING entry and MIGRATIONS.md); the three tokens still work and keep their 1.0.0 target. Imports from `/patterns` are not deprecated.
- ecb0a04: **BREAKING (0.x minor): already-deprecated public API is removed (hds#389 R1).** Before 1.0, a deprecated name may now be removed in a minor; ADR-014 and MIGRATIONS.md's "The cycle" record the rule, and 1.0 stays parked (#396). Every removed name, its replacement and its codemod is listed in MIGRATIONS.md under "0.20.0 removals". A consumer on a caret range below 0.20 (such as `^0.16`) is not affected until it upgrades; run the codemods first.
  - **The 21 root re-exports of `/patterns` components are gone** (hds#254): ActivityFeed, AppShell, AssetImg, Calendar, Carousel, CodeBlock, CommandPalette, DocLinkCard, ErrorPattern, FileInput, Form, Lightbox, NavItem, OverflowList, Page, Reveal, SideNav, Stepper, Toolbar, TopNav and TreeList, plus everything else their modules exported from the root (props types, parts such as `FormField` and `Step`, `useFieldWiring`, `*Variants`): 79 names in all. Import them from `@hirobius/design-system/patterns`, which exports them unchanged, except the 15 modules this release then removes outright (hds#394, see the wave 4a entry). `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` moves the imports; its name list is now whatever `/patterns` exports and the root does not, so it moves the props types and parts too.
  - **The six `Hds*` aliases are gone** (hds#315): HdsCheckbox, HdsRadio, HdsSelect, HdsSlider, HdsToggle and HdsTooltip. Use `Checkbox`, `Radio`, `Select`, `Slider`, `Toggle` and `Tooltip`. The new `hds-prefix` codemod (`npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .`, `codemods/hds-prefix.mjs`, with `--check` and `--dry-run`) rewrites each root import to the bare name under the old local name (`Checkbox as HdsCheckbox`) and changes nothing else in the file; renaming the binding afterwards is optional.
  - **Five docs/lab components are deleted** (hds#232, deprecated in 0.16): CinematicLink, ComponentInstanceMatrix, FoundationSwatch, Sketch and Token, with `CinematicLinkProps`, `FoundationSwatchProps`, `SketchProps`, `TokenProps`, `tokenLabelVariants`, `tokenNodeInlineVariants` and `tokenShellVariants` (12 names). They have no replacement and no consumer imports them. Their stories, manifest specs, Figma disposition rows, Code Connect exemption, staging-promotion entries and docs-site registry rows go with them, and nothing under `src/` imports `component-api.json` any more (it still ships as a package file).

- b2e27a2: **BREAKING (0.x minor): 32 components with no survivor are removed, and the root `*Variants` helpers are private (hds#394 wave 4a, hds#389 decision update).** No consumer imports any of them (the one product app that imports components has 0 import sites, and it pins `^0.16`, which never resolves to 0.20). Every removed name has a row in MIGRATIONS.md under "0.20.0 removals", with its replacement where one exists.
  - **Removed from the root:** `CaseStudyLayout`, `HdsSystemDocLayout`, `HdsDocsShell`, `ErrorBoundary`, `HistoryCard`, `NavGroup`, `Tokenizer`, `StepperField`, `HeadingStack`, `TextLockup`, `DateInput`, `DateRangeInput`, `DateTimeInput`, `ContextMenu`, `HoverCard` and `ButtonGroup`, with their props types and helpers. `HeadingStack` and `TextLockup` become `Stack` + `Text` (recipe in docs/rules/REACT_COMPONENTS.md); `StepperField` becomes `Input type="number"`.
  - **Removed from `/patterns`:** `ActivityFeed`, `AppShell`, `Calendar`, `Carousel`, `CommandPalette`, `DocLinkCard`, `FileInput`, `Lightbox`, `NavItem`, `OverflowList`, `SideNav`, `StackedCardRail`, `Stepper`, `Toolbar`, `TopNav` and `TreeList`, with their props types, parts and `*Variants`.
  - **The date pickers are gone** (ADR-034 supersedes ADR-020): `Calendar` from `/patterns`, and `DateInput`, `DateRangeInput` and `DateTimeInput` from the root. Use `Input type="date"`, or `type="datetime-local"` for a date and time; a range is two date inputs.
  - **The root exports no `*Variants` cva helper** (38 names such as `buttonVariants`, `badgeVariants`, `cardVariants`). Each still styles its own component; style through the component's props. `/patterns` keeps its exports.
  - **`hds-patterns-subpath --check` reports a named import or re-export of any removed name** (from the root or `/patterns`) as "removed in 0.20.0, no replacement" for a manual edit, instead of passing or moving it to a subpath that no longer has it. The list ships as `codemods/removed-0.20.json`. A removed name read through a namespace import or a dynamic `import()` is left to the type checker.
  - **`styles.css` and `tokens.css` drop the rules only the removed components used:** `.hds-doc-link-card` (DocLinkCard), `.hds-stepper-input` (StepperField), `.hds-doc-section-header` and `.hds-doc-section-copy-icon` (TextLockup), and `.hds-page-enter` with its keyframes (HdsSystemDocLayout). A test now fails when `src/styles/theme.css` styles an `hds-*` class that no component or story names.
  - `ButtonGroup`, `ContextMenu` and `HoverCard` leave the curated core set (`scripts/lib/core-components.mjs`), and `Menu`, `Popover`, `Tooltip` and `HdsRouterProvider` join it (hds#393), which makes 43 components.

- 3e819c4: `Grid` can now render what `TileGrid` renders, the first survivor API of the prune (hds#393 step 1). `layout="auto-fill"` wraps items with `repeat(auto-fill, minmax(min(<minItemWidth>, 100%), 1fr))`, and the new `minItemWidth` prop (a CSS length, default `280px`) sets where `auto-fill` and `auto-fit` wrap; `min(…, 100%)` keeps a container narrower than one item to a single full-width column. `layout="auto-fit"` without `minItemWidth` renders the `repeat(auto-fit, minmax(280px, 1fr))` track it always has. `gap` takes a new step, `medium`: 12px (`semantic.space.component.medium`, the value Stack's `medium` reads), `TileGrid`'s default gap, fixed under compact density as `TileGrid`'s is. `<Grid layout="auto-fill" minItemWidth="220px" gap="medium">` computes the same tracks and gap as `<TileGrid minTileWidth="220px">` under every tenant and density. `GridProps` now extends `React.HTMLAttributes<HTMLDivElement>`, so `role`, `aria-*`, `id` and other attributes reach the root element; Grid's own `data-hds-*` attributes still win. Every existing Grid option renders and computes what it did before. `medium` joins the shared closed layout-gap vocabulary, so a JavaScript caller passing `'medium'` to a prop whose type rejects it (Sidebar or Switcher `gap`; Cluster, Cover, Bleed and Center are removed in this release) now gets 12px where it got no spacing; Card and Stack `gap` are unchanged.
- 01183dc: `Input` takes the native date and time types and two in-flow slots (hds#393). `type` now also accepts `date`, `time` and `datetime-local` (not `file`), so `<Input type="time">` covers what `TimeInput` does; like `number`, these types show no clear button, because the platform picker owns the value UI. New `prefix` and `suffix` props render text or any node inside the field frame, beside the value, so `<Input prefix="https://">` and `<Input suffix="kg">` cover what `InputGroup`'s `leading` and `trailing` do. With either slot set, the border, surface and focus ring move from the `<input>` to a frame around the slots and the input; without them the markup is unchanged. The slots are not part of the accessible name or `aria-describedby`, so the label carries anything essential. `leadingVisual`, `trailingVisual` and every other prop work as before. `prefix` was previously typed as the RDFa `prefix` attribute (a string) and passed to the `<input>`; it is now a `ReactNode` slot, so every string still compiles.
- cc97ac2: `Button`, `Badge`, `Progress` and `Card` gain the props that `ToggleButton`, `IconButton`, `StatusDot`, `CircularProgress` and `SelectableCard` fold into (hds#393). All additive: nothing is removed or renamed. Existing props render the same markup as before, with one addition: the linear Progress bar now also carries `data-variant="linear"` and `data-tone` (`"neutral"` by default).
  - **Button.** `iconOnly` now uses `label` as the button's `aria-label` (an explicit `aria-label` still wins), so `<Button iconOnly label="Close" iconLeft={<X />} />` is named "Close". In development, an icon-only Button with no `label`, `aria-label`, `aria-labelledby` or `title` logs one warning. New `pressed` (controlled), `defaultPressed` (uncontrolled) and `onPressedChange` make a Button a toggle: it sets `aria-pressed` and `data-pressed="true|false"` (`data-state` stays `loading`'s) and fills with `role.accent` while pressed. A Button with none of the three is not a toggle and gets neither attribute. An `onClick` that calls `preventDefault()` stops the toggle.
  - **Badge.** New `dot` renders a solid status dot with no text, sized by the new `size` (`sm` | `md` | `lg`, default `md`). `tone` still picks the color (a dot is not a new tone). With the new `label` the dot is `role="status"` named by it; without one it is `aria-hidden`.
  - **Progress.** New `variant="circular"` draws a ring (sm 16px, md 24px, lg 32px). It is indeterminate with no `value` and spins unless reduced motion is on. New `max` (default 100) sets the scale for both shapes: `aria-valuemax` is `max` and `aria-valuenow` is the clamped value. On the default 0-100 scale, `aria-valuenow` is still rounded to a whole number. New `tone` (`neutral` | `danger` | `success` | `warning` | `info`) colors the fill; `neutral` keeps the bar's current fill and gives the ring `CircularProgress`'s. The ring's root is a `span`, as `CircularProgress`'s was, so it can sit inside a paragraph or label; the bar stays a `div`.
  - **Card.** New `selectable`, `selected` and `onSelectedChange` make the whole card one checkbox-like option: `role="checkbox"`, `aria-checked`, focusable, toggled by click or Space. A click on a control inside the card, or Space typed into one, is left to that control. Enter does not toggle (the ARIA checkbox pattern uses Space only); `SelectableCard` was a native button, so Enter toggled it, and migrating code that relies on Enter needs to change. It is controlled, like the other selection controls: the card reports the next state and the page sets `selected`. Selection is a 2px ring inside the card's edge, apart from the focus outline outside it, so a focused card, a selected card and a focused selected card each look different; it composes with any `tone` or `variant`.

- 297caf5: `Combobox` takes `multiple` (hds#393). `<Combobox multiple value={values} onChange={setValues} options={options} />` picks any number of values: `value` is a `string[]` and `onChange` receives the next array. Picking an option, by click or Enter, adds or removes it and keeps the list open. The listbox is `aria-multiselectable` and every option carries `aria-selected`. The trigger shows a count (`2 selected`), and each value appears below it as a chip button named `Remove <label>`. Removing a chip moves focus to the next chip, or to the trigger when none are left. The props are a union of two arms: `ComboboxProps`, the single-select arm, is unchanged apart from an optional `multiple?: false`; `ComboboxMultipleProps` is the new arm; and `ComboboxAnyProps` names either. It is the replacement for `MultiSelector`: `<MultiSelector value onChange options />` becomes `<Combobox multiple value onChange options />`.
- bce2b48: Popover, Tooltip and HdsRouterProvider now say when to use them (hds#393).
  - `Popover` and `Tooltip` carry the usage contract in `public/hds-manifest.json` (`usage.when`, `usage.whenNot`, `usage.useInstead`, `keyboard`) and appear in the "Which one when" section of `public/llms.txt`. Their `keyboard` entries list only what the keyboard contract test drives: Popover opens on Enter or Space, closes on Escape and loops Tab inside; Tooltip opens on focus, closes on Escape and closes when Tab moves on.
  - `Tooltip` casts `shadow-floating` (`semantic.elevation.floating`, the popover and dropdown shadow) instead of `shadow-overlay`, which is for dialogs and sheets. Its colours, radius and caption text are unchanged.
  - `Tooltip` links Figma node 93:15 (`figmaUrl` in the manifest, `docs/DESIGN_LINKS.md`, and the Design tab of its Storybook stories), so every published Figma component now maps to code (51 of 51).
  - `HdsRouterProvider` has a manifest spec (category Theming, tier primitive, doc-exempt), so the manifest lists 147 components instead of 146. Nothing about its API changes.
  - `DESIGN.md` "Which one, when" names the prop, not a separate component, for three needs: a pickable card is a `Card` with `selectable`, a wrapping row of equal non-metric tiles is a `Grid` with `layout="auto-fill"` and `minItemWidth`, and a bare state marker is a `Badge` with `dot` and a `label`. The table keeps its eight rows.

- 69e0049: **BREAKING (0.x minor): 13 components that fold into a survivor are removed from the root, with their props types (hds#394 wave 4b, hds#389 decision update).** Each survivor shipped with hds#393, and MIGRATIONS.md ("0.20.0 removals", "Components folded into a survivor") maps every prop. The one product app that imports components imports none of the 13.
  - `IconButton` becomes `Button iconOnly` with a `label` and an `Icon` in `iconLeft`; `ToggleButton` becomes `Button pressed` (`variant="ghost"` is `variant="tertiary"`).
  - `InputGroup` becomes `Input prefix` / `suffix`; `TimeInput` becomes `Input type="time"`.
  - `CircularProgress` becomes `Progress variant="circular"`; `SelectableCard` becomes `Card selectable`; `MultiSelector` becomes `Combobox multiple` (`MultiSelectorOption` is `ComboboxOption`).
  - `Cluster` becomes `Stack direction="row" wrap="wrap" align="center"`; `Center` becomes `Container` with a `Box` inside for the gutter.
  - `Cover`, `Frame`, `Bleed` and `AspectRatio` become a `Box` with `style` (`aspectRatio`, `marginInline`, `marginBlock: 'auto'` and so on). Use `style`, not `sx`: `sx` applies on the client only.
  - `StatusDot` stays: a consumer app passes it `style`, which Badge `dot` does not take.
  - `hds-patterns-subpath --check` reports a named import of any of the 13 for a manual edit and names its survivor ("removed in 0.20.0, use Button iconOnly …"), from the new `replaced` map in `codemods/removed-0.20.json`.
  - `@radix-ui/react-aspect-ratio` and `@radix-ui/react-toggle` leave `dependencies`: only the removed `AspectRatio` and `ToggleButton` imported them (`@radix-ui/react-toggle-group` stays and brings its own copy of the toggle primitive).

- aa07aab: **BREAKING (0.x minor): NotFoundPattern and TileGrid are removed from the root, and StatusTile moves to `/patterns` (hds#395 B5, hds#389 decision update).** These are the prune-set names a consumer app imports, so each comes with a codemod, and MIGRATIONS.md ("Components a consumer renders, each with a codemod") has every row.
  - `NotFoundPattern` becomes `<ErrorPattern displayText="404" message="Page not found" />` from `@hirobius/design-system/patterns`, which is what it rendered. `npx -p @hirobius/design-system@^0.20.0 hds-not-found-pattern --root .` rewrites it.
  - `TileGrid` becomes `<Grid layout="auto-fill" minItemWidth="…" gap="medium">`: `minTileWidth` is `minItemWidth` (260px when unset, since Grid defaults to 280px, and `?? '260px'` after a width expression that can be undefined) and `gap="sm"` is Grid's fixed 12px `medium`. The tracks and gap render the same under every tenant and density. `npx -p @hirobius/design-system@^0.20.0 hds-tile-grid --root .` rewrites it; `gap="xs"` or `"md"`, spreads, self-closing tags and `TileGridProps` are listed for a manual edit.
  - `StatusTile`, `StatusTileProps` and `StatusTileTone` are exported from `@hirobius/design-system/patterns` only (hds#389 D5). `hds-patterns-subpath` moves the import.
  - `hds-patterns-subpath --check` reports a NotFoundPattern or TileGrid import with its survivor until its codemod has run (`codemods/removed-0.20.json`).
  - A consumer app (read-only dry run): `hds-not-found-pattern` 1 file, 1 site; `hds-tile-grid` 2 files, 7 sites; `hds-patterns-subpath` 12 sites in 11 files.

- aa07aab: **`StatusDot` is deprecated for `<Badge dot>`, and `StatusDotProps` for `BadgeProps`; both are removed in 0.21.0 (hds#395).** `tone`, `size` and `label` map one to one, and so does the dot; a development build logs one `[HDS deprecation]` warning. It stays in 0.20.0 because a consumer app passes it a `style`, which Badge (className-only) does not take, so no codemod can rewrite that site: move the `style` to a wrapper or a `className` first (MIGRATIONS.md, "StatusDot is deprecated").

### Patch Changes

- 31a9c67: Six more compounds stop writing their parts onto a component at module scope (hds#365): `Menu`, `Popover` and `Tooltip` (and `ContextMenu`, `Toolbar` and `HoverCard`, which this release then removes, hds#394) are now one pure `Object.assign` around a wrapper of their own, the shape `AlertDialog`, `Dialog` and `Card` took in 0.19.1. Every part keeps its name, identity and declared type, and each root now carries a `displayName`. A Button-only consumer bundled with webpack or esbuild no longer receives the dropdown-menu, context-menu, popover, hover-card, tooltip and toolbar stacks: the esbuild probe drops from 33 `@radix-ui` packages (85.6 kB gzip) to 2 (42.1 kB); the rollup number is unchanged at 30.8 kB. The pre-commit gate `scripts/check-pure-annotations.mjs` now also flags an un-annotated top-level `Object.assign(<Component>, …)` and any top-level `X.Part = …` or `X.displayName = …` write (`--fix` annotates the former and reports the latter), and the esbuild Button-only probe fails on any `@radix-ui/*` package outside what `button.tsx` itself pulls in (`react-slot`, `react-compose-refs`), printing the packages that reached it.
- 614cc00: `docs/CONSUMING.md` §11 and the `hds-consumer` skill now give the ESLint plugin install line against the repository's current name, `pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hds#path:/scripts/eslint-plugin-hds"` (the repository's pre-rename name is only a mirror of it). The plugin is not on npm, so this git-path line is the only install route; the same fix repoints the plugin README, the `meta.docs.url` ESLint prints beside each HDS rule violation, and the README's pointer to PR #39 (hds#373). A front-door test now fails if any doc, script or skill names the pre-rename repo.
- a121851: Dialog's slots stay in the manifest whichever regen runs last (hds#379). `pnpm tokens` used to drop the `trigger` slot from `componentSpecs.Dialog.slots` in `hds-manifest.json`, because the token build replaced the slot list that `pnpm manifest:generate` had merged from the component's `@slot` tags. The token build no longer writes slots, so both commands now leave the manifest byte-identical. Dialog's JSDoc also names the overlay, header, title, description, footer and close slots, so all eight appear in `component-api.json`, not only trigger and surface.
- c148051: `Select` and `Combobox` name their open overlays, so a screen reader no longer enters a bare "listbox" or "dialog" (hds#398, hds#399). The open `Select` listbox is `aria-labelledby` its visible field label; with `showLabel={false}` it carries the `label` text as `aria-label`, and with an empty `label` the trigger's own name (the selected option). The `Combobox` popover (`role="dialog"`) takes the same name as the listbox inside it: the `aria-label` prop, or the `placeholder` when there is none, which clears axe's `aria-dialog-name` on the open popover. No prop changes meaning.
- a9ece9a: Deletes internal code that nothing imports (hds#391, under hds#133 option A). No public export changes: the API report still lists 401 symbols.
  - **Source:** `src/docs-tooling/` (20 files), `animated-label.tsx`, the Möbius shader, curve and store (`mobius-distortion.ts`, `shaders/mobius.glsl.ts`, `mobius-constants.ts`, `stores/mobiusStore.ts`, `stores/mobiusCurve.ts`), `tokenTableUtils.ts`, `components/types.ts`, `context/ReactRouterBridge.tsx`, `data/hdsEditorial.tsx`, `data/tenants.ts`, `data/tokenAuditReportTypes.ts` and `hooks/useHdsManifest.ts`.
  - **`hds-manifest.json`:** 24 `utilities` entries are removed: `AnimatedLabel`, `ApiReference`, `ComponentPreview`, `ControlsPanel`, `ControlsSection`, `DemoBlock`, `DocPageHeader`, `DocPageSpec`, `HdsLegacyTokenGovernancePanel`, `HdsMobileTopBar`, `HdsSidebarUtilityButton`, `LegacyTokenList`, `PageFooter`, `PreviewFrame`, `SketchButton`, `SketchCheckbox`, `SketchPanelToggle`, `SketchRange`, `SketchTextarea`, `ThemeToggle`, `TokenCollectionList`, `TokenDisplayToggle`, `TokenList` and `VariantStrip`. 13 utilities remain, and `componentSpecs` is unchanged at 146.
  - **`./styles.css` and `./tokens.css`:** no HDS component used these selectors, so they are removed: `.hds-sketchbook-shell__stage-frame`, `.hds-sketchbook-canvas-shell`, `.hds-sketchbook-canvas-stage`, `.hds-sketchbook-canvas-fill`, `.hds-sketchbook-canvas-overlay`, `.hds-sketchbook-canvas-overlay__content`, `.hds-visuals-bento-grid`, `.hds-visuals-bento-item`, `.hds-visuals-bento-card`, `.hds-token-chip`, `.hds-nav-indicator`, `.portfolio-impact-card`, `.hds-soft-nav-card`, `.hds-mobius-acrylic`, `.hds-sidebar-utility-button`, `.hds-dropdown-item`, `.hds-dropdown-label`, `.hds-dropdown-indicator` and `.hds-desktop-nav-button`, with their state variants. The `:root` custom property `--hds-local-sketchbookCanvas-maxWidth-stage` is also removed. `.hds-mobius-acrylic:hover` was the only `!important` rule that `theme.css` wrote into `./styles.css`.
  - **Tailwind utilities kept:** 16 utilities (`pt-1`, `pb-8`, `p-16`, `max-w-2xl`, `h-3.5`, `w-3.5`, `sm:text-4xl`, `sm:inline-block`, `group-hover:opacity-100`, `text-muted-foreground/70`, `transition-[transform,opacity]`, two `data-[…]:text-foreground` variants and three `[color:var(--semantic-color-feedback-*warning)]` arbitrary values) appeared only in the deleted files, so Tailwind would have stopped emitting them. An `@source inline(…)` list in `theme.css` keeps them in `./styles.css` and `./tokens.css` until 1.0, because consumers that use `./tokens.css` as their only compiled Tailwind still use them. Apart from the `hds-*` selectors above, the published selector set is unchanged.
  - **devDependencies:** `three`, `@types/three`, `zustand` and `fuse.js` are removed. None of them was a runtime dependency.

  The interaction-surface contract test (#127) now checks `.hds-bg-hover:hover`, which reads `--semantic-color-surface-hover`. It used to check the deleted `.hds-dropdown-item:hover`.

- 75288d2: Kept components stop rendering IconButton and Cluster inside (hds#392), so both can go without touching consumers of the kept ones: this release removes them (hds#394, MIGRATIONS.md).
  - **Pagination and InlineCode:** Previous, Next and the copy button are now `Button iconOnly` with an `aria-label` and a 16px `Icon` (`size="small"`). The rendered markup is byte-identical: same element, classes, attributes and accessible names ("Previous page", "Next page", "Copy", "Copied").
  - **PageHeader, FormActions, DataTableSection and DestructiveSection:** their wrapping rows are now `Stack direction="row" wrap="wrap"` with `align` and `justify` passed explicitly. Layout is unchanged (direction, wrap, gap, alignment and distribution), but the row elements inside these 4 patterns now carry `data-hds-component="Stack"` instead of `data-hds-component="Cluster"`, and their inline style adds `flex-direction: row`, the initial value. Update any selector or test that targets `[data-hds-component="Cluster"]` inside one of these patterns.
  - **AssetImg's expand pill (internal ExpandTooltip):** the label now uses `content.onAccent` instead of fixed white. In dark mode `surface.accent` is a light neutral, so white text read at 1.09:1; it now reads 17.32:1 (light mode is unchanged at 18.88:1).

- cde9ffe: Combobox and Select accessibility fixes (hds#407, hds#408). Combobox options now sit in `<li role="none">`, so the open listbox owns its options directly: axe no longer reports `aria-required-children`, `aria-required-parent` and `listitem` on it, and a screen reader reads each option with its real position and set size ("position 2, set size 8", not "position 1, set size 1"). The no-results message now sits beside the listbox, not inside it, with the same spacing. Select and Combobox accept `id`, `aria-describedby` and `aria-invalid` and forward them to the trigger, so a `FormField` label, helper text and error now reach the control (`getByLabelText` finds it). A Select with `showLabel={false}` names its trigger by the label and the value ("Fruit: Apple"), as it already did with the label shown, not by the value alone. Combobox with `aria-label=""` names its popover and listbox by the placeholder, as it already did with no `aria-label`. New `Open` stories for both open the overlay in a play function, so the Storybook axe gate now scans the open state in light and dark.
- 08b766e: `pnpm check:full` passes its token-tier, motion, security-baseline and migration-log gates again (hds#403).
  - Two new tokens: `primitive.size.120` (120px, `--primitive-size-120`) and `semantic.size.tile` (`--semantic-size-tile`, aliasing it). `MetricTile` takes its min-height from `--semantic-size-tile` instead of `calc(var(--primitive-size-96) + var(--primitive-size-24))`. Same 120px, so no tile changes size; the tile height is now one token a theme can override.
  - `TOKEN_MIGRATION.md` now records the six primitive typography tokens removed on 2026-09-24 (`size.2xs`, `weight.light`, `weight.semibold`, `letterSpacing.tighter`, `.wide`, `.wider`), each with its nearest surviving step.
  - `Table`'s sortable header button now has hover feedback: its label and sort glyph ease to the muted foreground (`hover:text-muted-foreground`) over the productive motion token (`--hds-motion-productive-duration`, 150ms, zeroed under `prefers-reduced-motion`). Before, hovering a sortable header changed nothing. The resting header is unchanged.

- de88964: One layout-gap vocabulary (hds#404). Grid, Sidebar and Switcher `gap`, and Card and Stack `gap` (and Cluster, Cover, Bleed and Center, which this release removes, hds#394) no longer keep a private copy of the `'tight'` | `'normal'` | `'inset'` | `'spacious'` map: each resolves through the shared spacing resolver against the one copy of those names in `box-sx.ts`. Nothing renders differently. Every value each prop takes, and its default, emits the same inline style and computes the same pixels as before, in every tenant, density and breakpoint (a Chromium test locks this against 8e53a8a). A value its type rejects but a JavaScript caller can still pass computes the same pixels too. The one inline-style difference: an inherited object key such as `'constructor'` no longer writes a function's source into the style attribute. That was invalid CSS, so nothing rendered from it before either. Card's `gap` still takes the `hds.space` keys and still passes any other value through; the others still set no style for a value outside the four names. Inside HDS, `check-layout-gap-vocabulary` fails a second copy of the map anywhere in `src/` at pre-commit.
- 01183dc: `Input` now pads each side of the field with its own class and never with a `px-*` shorthand (hds#393). The shorthand used to override the side-specific padding in two ways. A `leadingVisual` with nothing trailing lost its icon inset, so the placeholder ran under the icon. At the `md` and `lg` sizes, a filled field, a `trailingVisual` and a loading field kept only the resting right padding, so long text ran under the clear button, the trailing icon or the spinner. Both now keep their inset. The new `prefix` and `suffix` slots get the same gap whether one or both are set, and the gap no longer changes on the first keystroke. A `px-*` passed through `inputClassName` still overrides both sides.
- 57de36b: Drop five runtime dependencies that nothing in the package imports after the 0.20.0 removals (hds#429), so installing the package no longer downloads them: `@radix-ui/react-context-menu` (ContextMenu), `@radix-ui/react-hover-card` (HoverCard), `@radix-ui/react-toolbar` (Toolbar), and `date-fns` and `react-day-picker` (the date pickers, ADR-034). No export changes and no bundle grows. A new test, `tests/runtime-dependencies.test.ts`, fails when a package in `dependencies` has no import site in shipped `src/`, or when the `pnpm-lock.yaml` root importer lists a different set.
- 7c86aec: The docs-site sidebar model is deleted (hds#431). `src/app/data/hds-nav-data.ts`, `nav-model.ts` and `nav-model.json` held the navigation of the docs shell, which went with the docs SPA (#51) and `HdsDocsShell` (0.20.0). Nothing imported them and the package never exported them, so no import changes. In `hds-manifest.json`, `componentSpecs.Sidebar.consumers` no longer lists `src/app/data/nav-model.ts`.

  `./manifest` (and `public/hds-manifest.json`) drops the top-level `health` field (hds#431). It was a snapshot dated 2026-06-18 that no script wrote; the token build forwarded it unchanged, so it still named removed components (NavGroup, StepperField, Sketch) and file paths that no longer exist. The token build no longer writes it, and nothing in the package read it. `SystemManifest` never declared it, so no type changes. If you read `manifest.health`, it is now `undefined`.

## 0.19.1

### Patch Changes

- 786e7e2: Clears the last nine serious axe violations in Storybook (hds#349); the axe allowlist is now empty. `StatusTile` and `StatusListItem` stories showed their trailing status as a hand-rolled label with literal white text on a feedback fill, which drops to 1.7-2.8:1 in dark because those fills flip to their 400 stops; they now use `Badge` (`tone="success" | "warning" | "danger"`), whose feedback text and background pair holds in both themes. `FoundationSwatch` stories pointed at `--semantic-color-bg-default`, `bg-subtle` and `bg-brand`, which are not tokens, so they fell back to a fixed light hex (1.03-1.09:1 against the theme-aware label in dark), and two swatches forced white text; they now use `surface.page`, `surface.raised`, `surface.accent`, `content.primary` and `content.secondary` with `content.inverse` and `content.onAccent` labels. The layout `Sketch` `WithControls` story gives its range input an accessible name (`aria-label="Speed"`). No token value, component or export changes; consumers who hand-roll a solid feedback fill with white text should use `Badge` or a dark-safe foreground.
- 2d8c1b6: Compound components no longer mutate the Radix Root export: `AlertDialog`, `Dialog` and `Card` are assembled with one pure `Object.assign` around a wrapper of their own (parts, names and types unchanged), so consumers on webpack/esbuild get smaller Button-only bundles. Every top-level `forwardRef` / `cva` / `createContext` / `withHdsPortal` call under `src/` now carries `/* @__PURE__ */`, enforced by a new pre-commit gate (`scripts/check-pure-annotations.mjs`, `--fix` available), and the Button-only budget probe also bundles with esbuild and fails if any `@radix-ui/react-dialog` or `@radix-ui/react-alert-dialog` code reaches a Button-only consumer.

## 0.19.0

### Minor Changes

- 731c669: Portalled overlays (Dialog, AlertDialog, Menu, ContextMenu, Popover, Select, HoverCard, Tooltip, Lightbox and the image-expand cursor pill) now mount inside the nearest `data-hds` scope instead of `document.body`, so `<div data-hds data-theme="dark">` themes them. Each Content part gains an optional `container` prop to override the target. The modal scrim uses the new theme-aware `semantic.color.surface.scrim` token (`role.scrim`, `bg-scrim/60`), which is black in dark mode instead of a white wash, and the dark theme now declares `color-scheme: dark`.
- a47459b: `data-density="compact"` now remaps the spacing variables components actually read (`--semantic-space-scale-*`, plus surface padding and region gutter), so compact visibly tightens the default brand, and `Table` with no `density` prop follows the ancestor `data-density` attribute (an explicit prop still fixes it). Existing compact consumers will see tighter spacing.
- 1cd40ca: Add three screen-level patterns to `@hirobius/design-system/patterns`: `PageHeader` (breadcrumb, title fixed at `heading2`, status and actions slots), `MetricTiles` with `MetricTile` (one fixed-height tile, `min(tiles, 4)` columns) and `FormActions` (primary right-most and last in DOM order, destructive on the far left). The manifest's `patternInventory` is now derived from a new `@screenPattern` JSDoc tag instead of a directory that no longer exists, `llms.txt` names the three patterns in "How To Lay Out A Screen", and `DESIGN.md` gains the page-title rule and a "Which one, when" table for `MetricTiles`, `Stat`, `Card.Metric` and `StatusTile`.
- dbba2c7: Add `DestructiveSection` (title, explanation, one danger button that opens an `AlertDialog`; `confirmLabel`, `confirmBody` and `onConfirm` required) and `DataTableSection` (heading, toolbar slot, `Table` with a consumer-supplied row-actions column, `EmptyState` for zero rows, horizontal scroll on narrow widths with no caller `minWidth`) to `@hirobius/design-system/patterns`, plus a Client detail reference screen story. Containers now share one radius that follows the tenant knob: `Surface`, `StatusTile` and the three `theme.css` card rules move from the fixed `--component-card-radius` (8 px) to `rounded-lg` (role radius + 4 px: 12 px by default, 4 px under `brutalist-demo`), matching `Card`; the shipped `./static.css` `.hds-card` rule follows suit (was a fixed 8 px). This is a visible change for those containers; `--component-card-radius` stays defined. `DESIGN.md` no longer contradicts itself on the container and action radius and gains `Card` / `Surface` / `DestructiveSection` / `DataTableSection` rows in "Which one, when". `Table` gains an optional `labelledBy` id that names the table and its scroll region when there is no caption; `DataTableSection` passes its heading.
- 91849c7: Component contract tags reach the generated files (hds#339). `@usage`, `@whenNot`, `@useInstead`, `@slot`, `@keyboard` and `@ai-rules` in a component's JSDoc are parsed into `usage`, `slots`, `keyboard` and `aiRules` on each spec in `public/hds-manifest.json` and `component-api.json`, and into a "Which one when" section of `llms.txt`; tag text no longer leaks into `description`. The agent manifest keeps `a11yRules`. In development, `<Button iconOnly>` with no `iconLeft` now warns once instead of rendering an empty square.
- df1fa12: Add a `@hirobius/design-system/icons` subpath: a curated set of 50 Lucide icons (canonical names such as `Ellipsis`, `Pencil`, `Trash2`) for `IconButton` and `Icon`, listed in the manifest `iconSet` and in `llms.txt`, so consumers no longer need to install `lucide-react` separately.

### Patch Changes

- 419e30b: Docs API data now includes Radix passthrough props (Menu, Popover, AlertDialog, Tabs, HoverCard, ContextMenu and others) and Table's nine cell-slot descriptions, rendered as a "Cell slots" list in the API reference.
- 91849c7: Button and Card.Metric usage contracts no longer point at IconButton and Stat, which hds#254 folds into them.
- e8dba56: Every core component now says when to use it: `usage`, `whenNot`, `useInstead` and, for the overlays and Combobox, `keyboard` and `slots` flow into the manifest, `component-api.json` and the "Which one when" section of `llms.txt`.
- 6596b2d: The npm package now ships the agent context: `llms.txt`, `public/llms-full.txt` (with topic slices in `public/llms/`), `DESIGN.md`, `CONSUMING.md`, `docs/CONSUMING.md` and `src/app/data/component-api.json`, and the same files are served at the Storybook host. `hds-manifest.json` now points `docs` and `llmsTxt` at `https://hirobius-design-system.vercel.app` and names `llms.txt` as `agentEntrypoint`. A new `check-pack-contents` gate (part of `smoke:consumer`) fails when the tarball is missing any of these.

## 0.18.0

### Minor Changes

- eaff950: Adds the patterns-subpath codemod (hds#316): `hds-patterns-subpath` (also `node codemods/patterns-subpath.mjs`) rewrites root imports of the 21 deprecated pattern components to `@hirobius/design-system/patterns`, with `--root`, `--check` and `--dry-run`. The deprecation cycle (deprecated in 0.17, removed from the root at 1.0 by default, per hds#254) is documented in the new MIGRATIONS.md, and the README gains an "In use" section with numbers generated by `pnpm consumer:usage`.

## 0.17.0

### Minor Changes

- 43fd957: Turn on `strict` TypeScript for the package; export the six previously `Hds`-prefixed components under bare names (`Toggle`, `Checkbox`, `Radio`, `Slider`, `Select`, `Tooltip`) with the `Hds*` names kept as `@deprecated` aliases until the 1.0 alias-removal window (hds#254); add a size-limit budget for a Button-only root import.
- 643860b: hds#206 slice 3: the two runtime-overridden spacing tokens get canonical names,
  with their overrides expressed as t-shirt scale steps. No computed value changes.
  - New `semantic.space.surface.padding` (`--semantic-space-surface-padding`,
    `hds.semantic.space.surface.padding`), default `scale.md` (24px). Tenants
    override it per brand and density (brutalist-demo: `scale.sm`, `scale.xs`
    under `[data-density="compact"]`).
  - New `semantic.space.region.gutter` (`--semantic-space-region-gutter`,
    `hds.semantic.space.region.gutter`), default `scale.md`. `theme.css` sets it
    to `scale.lg` (32px), and `scale.sm` (16px) below 640px.
  - `semantic.space.component.padding` and `semantic.space.layout.gutter` stay
    as `$deprecated` aliases of the new names. Each tenant block redeclares the
    deprecated alias next to its override, so consumers still reading the old
    var inside a `[data-brand]` subtree keep the tenant value.
  - `$deprecated` (DTCG) now marks all seven hds#206 aliases in
    `hirobius.tokens.json`.
  - hds's own `src/` now reads the new names, rewritten by
    `scripts/codemod-spacing-vocabulary.mjs`.

- d41c65e: Add `semantic.space.scale.{xs,sm,md,lg,xl}` — one monotonic t-shirt spacing
  scale (8/16/24/32/48px) per Adrian's 2026-09-26 decision on hds#206. The
  existing gap families (`layout.tight/normal/gutter/inset/spacious`,
  `component.gap/padding`) are unchanged and kept live as deprecated aliases —
  no breaking change. Adds `check-spacing-vocabulary` (warn-severity, manual/
  on-demand) flagging raw integer literals on Box `sx` spacing props (the
  px-ambiguous form hds#206 identifies), registered in
  `docs/guardrails/registry.json`. Consumer codemod off the deprecated names,
  alias removal, and unifying `Stack`'s gap resolver with `box-sx`'s are
  tracked as remaining hds#206 work.
- d41c65e: Add `semantic.size.{control,icon,avatar,row}` and `semantic.zIndex.{control,sticky}`
  to `hirobius.tokens.json` per Adrian's 2026-09-26 decision on hds#242, plus
  `semantic.radius.control` (checkbox glyph corner radius, a real design-scale
  value distinct from `semantic.radius.action`) and `semantic.motion.distance`
  (scroll-reveal `translateY` offset). Repoints all 15 `check-tier-bypass`
  judgement-call violations named in hds#242 — activity-feed, checkbox,
  code-block, radio, slider, table, `scroll-motion.css` — onto the new semantic
  tokens, and adds `// tier-ok:` exemptions (matching #186's precedent) for the
  two `radius-full` "fully round, one possible value" references that share a
  line with a now-fixed size token. `pnpm check:tier-bypass` is green (was 15).

  `scripts/lib/figma-model.mjs`: `semantic.radius.control` needed its own
  `$type` (siblings inherit it from a group `$type` that `semantic.radius`
  doesn't set); `semantic.motion.distance` is declared in `NOT_IN_FIGMA` (a
  translateY offset has nothing to bind to in Figma, same as duration/easing).

- d41c65e: Adds `@hirobius/design-system/patterns` (hds#254, ratified 2026-09-26): the 22
  `pattern`-tier components from the disposition table — `Calendar`,
  `FileInput`, `Form`, `AppShell`, `OverflowList`, `Page`, `ActivityFeed`,
  `AssetImg`, `Carousel`, `CodeBlock`, `StackedCardRail`, `DocLinkCard`,
  `NavItem`, `SideNav`, `Stepper`, `TopNav`, `TreeList`, `ErrorPattern`,
  `Toolbar`, `CommandPalette`, `Lightbox`, `Reveal` — now importable from their
  own subpath (`vite.config.lib.ts` entry, `package.json#exports`). Non-breaking:
  21 of the 22 stay re-exported from the package root too, each now carrying a
  `@deprecated`/`@removeIn 1.0.0` JSDoc notice pointing at the new subpath; the
  root re-export is dropped at the next major once consumers have a codemod
  (`StackedCardRail` is new to the published surface either way — it was
  `pattern`-tiered in the manifest but missing from `src/index.ts`, so it has no
  root re-export to deprecate).

  This is the non-breaking half of the hds#254 decision. The 41 `fold` API
  absorptions in the same disposition table wait for 1.0 and a consumer codemod —
  tracked on hds#254/hds#124, not filed as new issues.

- d41c65e: Standard type ramp (Adrian's 2026-09-26 decision on hds#283): lift Tailwind 4's
  ten default `fontSize` steps into `primitive.typography.size.*` verbatim —
  `xs` 13→12, `sm` 15→14, `base` 17→16, `lg` 20→18, `xl` 24→20, `2xl` 30→24,
  `3xl` 36→30, `4xl` 48→36, `5xl` 72→48, `6xl` 80→60 — and repoint every
  semantic composite at its new rung per the 2026-09-24 audit table:
  - Rendered size changes: `body` 17→16px, `ui` 15→14px, `display` 72→60px,
    `eyebrow`/`caption` 13→12px (closes the eyebrow/caption duplicate), `mono`
    13→14px (repointed off `xs`, since `xs` alone now gives 12px).
  - Rendered size unchanged, rung renamed to keep the primitive scale
    monotonic: `h1` (`4xl`→`5xl`, 48px), `h2` (`2xl`→`3xl`, 30px, line-height
    42px→40px onto the 4px grid), `h3` (`lg`→`xl`, 20px).
  - `component.button.size.{sm,md,lg}.fontSize` descriptions corrected
    (13/15/17px → 12/14/16px); `tag`/`badge`.fontSize already referenced
    `primitive.typography.size.xs` and pick up 12px automatically.
  - `--semantic-typography-display-font-size` clamp max in `src/styles/theme.css`
    updated 72px→60px to match.
  - Hardcoded `text-[10px]` / `text-[11px]` / `text-[15px]` classes that bypassed
    the ramp (`command-palette.tsx`, `badge.tsx`, `segmented-control.tsx`)
    replaced with ramp-driven `text-xs` / `text-sm` utilities (now that
    `tailwind.config.tokens.cjs` wires `fontSize.*` straight onto these same
    primitives, this also closes the fork with a consumer app's Tailwind
    defaults).

  Base-size rationale recorded in `DECISIONS.md`. Not in this pass: a consumer's
  duplicated display/h1 CSS clamp mins, Figma `figma:push`/`figma:snapshot
--ingest` re-sync, and a consumer app's 54 call sites on the `xs` rung (tracked as
  remaining work on hds#283).

- d41c65e: Table: `TableColumn` gains optional `sortable`, `sortDirection` (`'ascending' | 'descending' | 'none'`), and `onSort`. Sortable columns render a real button inside the header cell, set `aria-sort` on the header cell, and show a token-sized direction glyph (ArrowUp/ArrowDown/ArrowUpDown). Non-sortable columns render exactly as before (pixel parity).

### Patch Changes

- 999cc04: Storybook front door: an Introduction landing page that opens first, the Hirobius brand in the sidebar, share-preview tags, a Foundations/Primitives/Patterns sort order, spaced story titles (story ids unchanged), and six internal components hidden from the published build.
- 0b32d55: Accessibility fixes from the axe sweep (#311): StepperField label/input pairing, Card.Progress accessible name, Carousel and StackedCardRail focusable named scroll regions, OverflowList and MetadataList valid list semantics, AssetImg aria-label only on roled elements, Calendar outside-month day contrast, Tokenizer state contrast, Bleed story token colour, unconditional `:focus-visible` ring for `.hds-focus`, highlighted-row inset ring in Menu, Select, Combobox and MultiSelector.
- d41c65e: Delete dead internal (non-exported) files with zero consumers: `morph-card.tsx`,
  `CascadeText.tsx`, `controls.tsx`. None were in `src/index.ts`'s public barrel
  and none were imported anywhere in the repo — confirmed by grep before removal
  (hds#133, Tier-1 zero-risk bucket, Adrian's option-A decision 2026-09-26).
- 75cf4ab: Relocate the docs-tooling bucket (hds#133 ISSUE-09, Adrian's option-A decision:
  delete/relocate only non-exported internals, keep every exported component) out
  of `src/app/components/` into `src/docs-tooling/`: `api-reference`,
  `component-preview`, `controls-panel`, `demo-block`, `doc-page-header`
  (+ its test), `health-rail`, `page-footer`, `preview-frame`, `propTableUtils`,
  `shell-controls`, `sketch-controls`, `theme-toggle`, `variant-strip`,
  `DocPageSpec`, `TokenDisplayToggle`. None were exported from `src/index.ts` or
  `src/patterns.ts`, so this is a zero-risk, non-breaking move — only internal
  relative import paths changed. `pnpm manifest:generate` now correctly drops
  these from `public/hds-manifest.json` (component-discovery only scans
  `src/app/components/`), which is the intended effect: they were never
  consumer-facing. `lab/*` relocation stays remaining — its earlier blocker
  (extracting `lab/tokenUtils.ts` from the public `Token` primitive) was already
  resolved in hds#233/369dce5; the file lives at `src/app/components/tokenUtils.ts`
  now.
- 643860b: Relocate the internal token-lab views (hds#133, Adrian's option-A decision) from
  `src/app/components/lab/` to `src/docs-tooling/lab/`: `legacy-token-detail`,
  `legacy-token-list`, `token-collection-list`, `token-list`. None were exported
  from `src/index.ts` or `src/patterns.ts`, and the shared `tokenUtils` module the
  public `Token` primitive depends on already lives outside `lab/`
  (`src/app/components/tokenUtils.ts`, hds#233), so no exported component is
  removed or renamed and the published package is unchanged. A new
  docs-tooling boundary test keeps lab modules out of the component tree.
- 75cf4ab: Reviewer-fix follow-up to the docs-tooling relocation (hds#133, commit edb31c0):
  re-key `.token-path-baseline.txt`'s `health-rail.tsx` line to its new location
  `src/docs-tooling/health-rail.tsx` (the stale `src/app/components/` path was
  tripping `check-token-paths-ratchet.mjs`'s default-mode gate with a "new"
  violation that was really the same pre-existing one, just moved). Regenerate
  `src/app/design-system/token-usage-map.json` (`pnpm tokens:index`) and
  `docs/audits/exceptions-audit.md` (`node scripts/audit-exceptions.mjs`) so both
  reference the moved docs-tooling paths instead of the old
  `src/app/components/*` ones. No component code changed.

  Refs hirobius/hds#133

- 75cf4ab: hds#206 remaining work: codemod hds's own internal spacing-token references
  (CSS `var(--semantic-space-{layout,component}-*)` reads and
  `hds.semantic.space.{layout,component}.*` / bare `semantic.space.*` dotted
  paths in `src/`) off the deprecated aliases and onto the canonical
  `semantic.space.scale.{xs,sm,md,lg,xl}` t-shirt scale added in #297. Pure
  rename — every rewritten reference resolves to the identical px value, no
  visual or behavioral change. Added `hds.semantic.space.scale.*` to the token
  bridge (`tokens.ts`) so the canonical accessor exists in JS, not just CSS.

  Script: `scripts/codemod-spacing-vocabulary.mjs` (idempotent, `--check` for a
  dry run, unit-tested in `scripts/__tests__/codemod-spacing-vocabulary.test.mjs`).

  Out of scope for this slice (unchanged): the public `gap`/`padding` prop
  VALUES components accept (`gap="tight"`, `padding="component"`, etc.) and
  `box-sx.ts`'s own resolver (it builds the deprecated var name dynamically,
  not as a literal — unifying it with Stack's resolver is hds#206 item #4).
  The deprecated aliases in `hirobius.tokens.json` are kept live and the
  `check-spacing-vocabulary` gate stays in warn mode, per Adrian's 2026-09-26
  decision.

- 75cf4ab: hds#206 review fix: the previous codemod commit rewrote two spacing-token
  sites onto `semantic.space.scale.md` when it should not have, because that
  scale token has no runtime override where the original alias did:
  - `semantic.space.layout.gutter` — `theme.css` overrides
    `--semantic-space-layout-gutter` to 32px desktop / 16px under 639px;
    `scale.md` is a fixed 24px. Reverted `tokens.ts`'s `layout.gutter` accessor
    and `shell-controls.tsx`'s `paddingInlineStart` back to the alias var.
  - `semantic.space.component.padding` — `tenants.css` overrides
    `--semantic-space-component-padding` per tenant/density (brutalist-demo).
    Reverted the `tokens.ts` `component.padding` accessor and its 14
    consumption sites (`callout.tsx`, `code-block.tsx` x2, `container.tsx`,
    `surface-padding.ts`, `surface.tsx`, `table.tsx` x2, `static.css`
    `.hds-card`, `legacy-token-detail.tsx`, `shell-controls.tsx`
    `paddingInlineEnd`, `sketch-controls.tsx`, `sketch.tsx`) back to the alias
    var so tenant/density and responsive overrides keep working.

  `semantic.space.component.gap` and `semantic.space.layout.normal` (also
  touched by the codemod) have no such override and are left on `scale.xs`/
  `scale.md` — genuinely pure renames.

- d41c65e: Fix hds#254 review defect: the `@deprecated`/`@removeIn 1.0.0` JSDoc on the 21
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

- d41c65e: Delete the dead `componentPreviewRegistry` island: `componentPreviewRegistry.tsx`,
  `specimen-block.tsx`, `variant-preview-deck.tsx` (~900 lines). None were exported
  from `src/index.ts`'s public barrel, none were imported outside this trio, and
  knip flagged all three as unused — the remains of the docs SPA deleted in #90.
  The Storybook-built component reference site (#280) replaces what this was
  reaching for; its hand-written `DEFAULT_PREVIEW_PROPS` table had decayed to 46
  entries covering 30 of 139 manifest components. Decision and the pattern worth
  keeping (`import.meta.glob` module discovery + manifest-driven
  `preview.exportName`/`preview.sizing`) recorded in `DECISIONS.md` (hds#286,
  Adrian's decision 2026-09-26).
- d41c65e: Table: fix invalid ARIA structure from the sortable-columns change (hds#294 review). The grid now carries `role="table"`, header/data rows are wrapped in `role="row"` elements (`display: contents`, so CSS Grid layout is unaffected), every header cell has `role="columnheader"` (not just sortable ones), and data cells have `role="cell"` — so `aria-sort` no longer sits on an orphan columnheader outside any table/row ancestry. Also drops the manual `onKeyDown` on the sort button (native `<button>` already turns Enter/Space into a click; the duplicate handler risked a double-toggle in browsers with inconsistent Space-keyup behavior).

## 0.16.0

### Minor Changes

- f20513f: - **New exports:** `HdsSelect` and its `SelectProps` are now reachable from the package root (hds#231), and `HdsDocsShell` is a new 3-column docs layout with independently sticky rails (hds#280).
  - **New token:** `primitive.size.interactive.minCompact` (24px). Tokenizer's remove button now uses it, so it meets the WCAG 2.2 2.5.8 minimum target size (hds#287).
  - **Fixes:** Radio's colour transition now actually animates (hds#257); StackedCardRail no longer breaks its styles when server-rendered (hds#284).
  - **Deprecations:** `ComponentInstanceMatrix`, `FoundationSwatch`, `Sketch`, `Token` and `CinematicLink` are docs-internal and now warn once. They leave the published barrel in 1.0.0 (hds#232).
  - **Smaller bundle:** the main entry drops from 202 to 183 kB gzip, because the docs-only token corpus no longer ships in the published library (hds#279).
- Type-ramp prerequisites (hds#283, steps 0–3). **Removes six unused primitive tokens**: `--primitive-typography-size-2xs`, `--primitive-typography-weight-light`, `--primitive-typography-weight-semibold`, and `--primitive-typography-letterSpacing-tighter` / `-wide` / `-wider`. None had a consumer in hds or the apps that use it. Icons are now sized from `primitive.size.16/20/24` instead of the type scale; a `tracking-caps` utility replaces stock `tracking-wide` for eyebrow text; DateInput and DateTimeInput calendar buttons no longer collapse under flexbox; and a type specimen story documents the scale.

## 0.15.0

### Minor Changes

- a5d33b6: Every props type behind a component the package exports is now exported too, so a
  consumer can name it.

  41 of them were not. `src/index.ts` re-exports each public module with `export *`, so a
  type ships only if its module exports it — and for `Alert`, `Container`, `Stack`,
  `Grid`, `CardHeader`, `ErrorBoundary` and 35 others it did not. The single most ordinary
  thing a consumer writes,

  ```tsx
  const Wrapped = (props: AlertProps) => <Alert {...props} />;
  ```

  did not compile, and the author had to fall back to `React.ComponentProps<typeof Alert>`
  or restate the shape by hand. Nothing here could see it: `tsc` is satisfied because the
  type is in scope inside its own module, the component renders fine, and every test in
  this repo imports from `src/`, where the barrel is irrelevant.

  The rule is reachability, not the `Props` suffix. A type is exported iff it annotates the
  props of a component the module exports — directly, through a trailing `export { … }`, or
  through an `Object.assign` compound like `Grid`. That deliberately leaves internal: the 33
  `VariantProps<typeof xVariants>` cva aliases (`button.tsx` sets that convention),
  composition bases such as `NavNativeProps`, union arms such as `TokenBaseProps`, cast
  targets such as `WiredChildProps`, and the props of sub-components the module keeps to
  itself.

  Purely additive — 41 symbols added, none removed, no module changed.
  `scripts/check-props-exports.mjs` runs from `pretest` and holds the line.

### Patch Changes

- c2b9e86: Every React-bearing bundle now starts with `'use client'`, so the package works in the
  Next.js App Router that `CONSUMING.md` advertises.

  Before this, `dist/` shipped 20 `useState` calls and zero client directives. In the App
  Router a module is a Server Component until it says otherwise, and a Server Component
  that calls a hook fails at render — so the first `import { Button } from
'@hirobius/design-system'` in a Next.js page threw. No existing consumer had hit it
  (the consumer apps use Vite and Astro), which is exactly why a prospective user would have
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

## 0.14.0

### Minor Changes

- 22ec2b5: Three shipped guards were dead in every installed copy, baked by our own build.

  Library code read `import.meta.env`, which Vite's library build evaluates at HDS's build
  time rather than the consumer's. It baked to a constant inside `dist/`, so the guards had
  never run for anyone who installed the package:
  - `Icon` never warned about a missing `icon` prop (`import.meta.env.DEV` baked to `false`).
  - `warnOnce` never emitted a deprecation warning (`import.meta.env.PROD` baked to `true`),
    so the whole deprecation channel was silent.
  - `TenantProvider` never wrote `data-brand` / `data-tenant`, because `VITE_TENANT_SLUG` was
    read from HDS's environment and baked to `{}`. It was inert regardless of what a consumer
    set.

  The first two now read `process.env.NODE_ENV`, which consumer bundlers substitute at the
  build that actually knows the answer.

  **Breaking:** `TenantProvider` takes the tenant as a `slug` prop instead of reading an
  environment variable. A library component cannot read its consumer's environment, so there
  is no backwards-compatible version of the old behaviour — but nothing depended on it
  either, since it never worked once installed. Omitting `slug` writes no attribute, which is
  what every existing call site already got.

  ```tsx
  <TenantProvider slug={import.meta.env.VITE_TENANT_SLUG as TenantSlug}>
  ```

  Two standing guards keep the class from returning: `tests/no-shipped-import-meta-env.test.ts`
  fails on any `import.meta.env` reachable from shipped source, including via bracket access
  or destructuring, and `src/lib/env.test.ts` pins the source shape that makes the bundler
  substitution work.

### Patch Changes

- c1561f5: The published types did not resolve for any `node16`/`nodenext` ESM consumer.

  `tsconfig.dts.json` compiles with `moduleResolution: "Node"`, so `tsc` emitted relative
  specifiers the old CommonJS way — `from './app/components/button'`, no extension — into a
  package that declares `"type": "module"`. ESM does not guess extensions, so all 150 of them
  failed to resolve. `attw` reported `InternalResolutionError` against 7 of the 14 entry
  points: `.`, `tokens`, `manifest`, `contexts`, `form`, `brand`, `scroll`.

  In practice a Next.js app, or any `"type": "module"` project on `moduleResolution: node16`,
  installed this package and got broken types for all of it.

  Nothing here could see it. `tsc` typechecks `src/`, every test imports `src/`, and
  `smoke:consumer` proved each subpath _imports_ cleanly — which it does; it is the `.d.ts`
  resolution that was broken. The emitted output is the one artifact nothing read.
  - `scripts/add-dts-extensions.mjs` rewrites each emitted specifier to what it actually
    resolves to (`./button` → `./button.js`, `./context` → `./context/index.js`), and exits 1
    on any specifier that resolves to nothing rather than emitting a path that will fail in
    someone's install. It runs as part of `pnpm build:types`.
  - `scripts/check-published-types.mjs` runs `attw` over the packed tarball from
    `smoke:consumer`, so the regression cannot return. Profile `esm-only`, because this
    package has no CommonJS build and node10 cannot read `exports`; the four CSS subpaths are
    excluded because a stylesheet has no types to resolve.

  Every checked entry point is now green under `node16 (from ESM)` and `bundler`.

## 0.13.1

### Patch Changes

- 68df525: The published `hds-manifest.json` now carries Alert's Figma node URL in `componentSpecs.Alert.figmaUrl`, the single source the repo projects into its README, Storybook and Figma links.
- 5db84a4: Fix Figma mapping drift in the published `hds-manifest.json`. Alert declares its real `tone` axis (`success | danger | warning | info`), not `variant` / `error`. Button's `tone` is now documented. HeadingStack binds `subheading`. Dialog's Title, Description and close toggle bind to its compound parts. Avatar, Card, Divider and TextLockup declare their cva axes.
- f3268b4: **chore(pkg):** the package now declares its own front door. `license` is
  `SEE LICENSE IN NOTICE.md` — the code is MIT (root `LICENSE`), but the embedded
  fonts ship under their own terms, which no single SPDX expression covers — and
  `NOTICE.md` is added to `files` so the published tarball carries those terms.
  `repository`, `homepage`, `bugs` and `keywords` are set, so npm and GitHub link
  back to the repo instead of showing nothing.
- 65a5bf2: **fix(manifest):** `public/hds-manifest.json` no longer fills `figmaLink` with
  `TODO:hds-master:<Name>` placeholders. Each `componentSpecs[]` and `utilities[]`
  entry now carries a real Figma URL or `null`, so tooling can count linked
  components directly. Consumers that treated any non-null `figmaLink`
  as "has a Figma link" now get the right answer.
- 65a5bf2: **fix(tokens):** the generated tenant overlay CSS no longer drops the first
  brand's base rule. Its header comment contained `*/` inside a file glob, which
  closed the comment early and turned the rest of the header into an invalid
  selector prefix for the first `[data-brand]` rule. That brand's light overrides
  now apply.

## 0.13.0

### Minor Changes

- 9e9f19e: **0.13.0 — final clean cut before the shelf.** Rolls up the work merged to `main`
  after 0.12.0 and one bug fix, so the published package matches the shelved repo.
  - **fix(icon):** stop forwarding a token (`var(--primitive-*)`) to Lucide's numeric
    `size` prop, which landed on the SVG `width`/`height` **attribute** and logged a
    console error on every icon render (icons still rendered — the `style` sized them
    — but the console was noisy). Now only a numeric size is forwarded; token sizes
    flow through `style` (valid as CSS). (#123)
  - **feat(styles):** `@hirobius/design-system/static.css` — a CSS-only static-primitive
    layer so a zero-React Astro/HTML page can render `Badge`/`Card`/`Alert`/`Divider`/`Tag`
    via `.hds-*` classes, token-bound and theme-aware. (#64)
  - **docs(scroll):** the llms.txt scroll-driven-sections recipe + golden-path stories
    for the `Reveal`/`Pin`/`useScrollProgress` primitives. (#116)

## 0.12.0

### Minor Changes

- aba78d2: Promote three previously-internal components to the public API surface (#76):
  - **SideNav** (`Navigation`) — sidebar navigation row primitive (root/nested levels).
  - **CommandPalette** (`Overlays`) — Cmd-K / Ctrl-K fuzzy search over the HDS manifest.
  - **HdsLightbox** (`Overlays`, was internal `ImageLightbox`) — full-bleed image viewer on Radix Dialog.

  Each flips `@internal`→`@public`, drops `@doc-exempt`, moves from `utility`→`primitive` tier, and gains a Storybook story, a Code Connect stub, and a public barrel export. `ImageLightbox` is renamed to `HdsLightbox` to match the Radix-overlay naming convention.

  The vitest config now resolves the `virtual:hds-manifest` module (mirroring the app/lib builds) so manifest-consuming components like CommandPalette render under the story-render smoke gate.

- aba78d2: Add Tier-1 native primitives closing the Astryx coverage gap (#76), with zero new runtime dependencies:
  - **Kbd** — inline keyboard key / shortcut hint (`<kbd>`).
  - **StatusDot** — compact solid status indicator with semantic tones.
  - **Timestamp** — semantic `<time>` with date/time/datetime/relative formatting.
  - **Blockquote** — quoted passage with optional attribution.
  - **VisuallyHidden** — screen-reader-only content (`sr-only`), polymorphic `as`.
  - **AvatarGroup** — overlapping avatar cluster with a `+N` overflow chip.
  - **ButtonGroup** — attaches Button children into one segmented control.
  - **InputGroup** — text input framed with leading/trailing adornments.
  - **CircularProgress** — SVG progress ring (determinate + indeterminate).

  Each ships with tokens-only styling, colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture.

- aba78d2: Add Tier-1 Radix-skinned interactive/overlay primitives closing the Astryx coverage gap (#76). Each wraps a Radix primitive themed with the HDS overlay role tokens (matching Menu/Dialog/HdsTooltip), adding these `@radix-ui` dependencies:
  - **HdsToggleButton** (`@radix-ui/react-toggle`) — single two-state pressable button (`aria-pressed`).
  - **HdsAlertDialog** (`@radix-ui/react-alert-dialog`) — modal confirmation dialog for destructive actions; Dialog-matched skin, no dismiss-on-outside-click.
  - **HdsHoverCard** (`@radix-ui/react-hover-card`) — hover/focus preview card (not a substitute for an accessible tooltip).
  - **HdsContextMenu** (`@radix-ui/react-context-menu`) — right-click menu sharing Menu's exact SURFACE/ITEM token skin.
  - **HdsAspectRatio** (`@radix-ui/react-aspect-ratio`) — width:height ratio box that prevents media layout shift.

  Each ships colocated tests (Radix jsdom polyfills), a Storybook story (overlays render closed on mount), a Code Connect stub, and a Swiss-canon fixture.

- aba78d2: Add the Tier-2 pattern layer closing the Astryx coverage gap (#76) — 8 composite/pattern components, zero new runtime dependencies:
  - **MetadataList** (`Display`) — semantic `<dl>` of term/description pairs; the canonical metadata slot (horizontal/vertical).
  - **OverflowList** (`Layout`) — count-based list that collapses overflow into a `+N` chip (SSR/test-safe, not width-measured).
  - **TopNav** (`Navigation`) — top navigation bar with brand / links / trailing slots and optional sticky.
  - **AppShell** (`Layout`) — application scaffold with header, sidebar, and main regions (semantic `<header>`/`<aside>`/`<main>`).
  - **SelectableCard** (`Actions`) — card that behaves as a selectable option (`role="checkbox"`, full keyboard/ARIA).
  - **Tokenizer** (`Inputs`) — token/chip input composing `Tag`; Enter to add, Backspace to remove.
  - **FileInput** (`Inputs`) — styled file picker / dropzone over a real native `<input type="file">`, with drag-and-drop.
  - **HdsMultiSelector** (`Inputs`) — multi-select dropdown composing `Popover` + a checkbox option list (no new dep).

  Each ships colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture. The `virtual hds-manifest` size-limit budget was bumped 41→46 kB to accommodate the enlarged public component surface (justified in `.size-limit.cjs`).

- aba78d2: Complete the Tier-2 pattern layer (Astryx coverage, #76) with 4 more components:
  - **Toolbar** (`Actions`) — control group with roving focus on `@radix-ui/react-toolbar`; compound `Toolbar.Button` / `Separator` / `ToggleGroup` / `ToggleItem` / `Link`, skinned to match Menu.
  - **TreeList** (`Navigation`) — hierarchical expand/collapse list with correct `role="tree"` / `treeitem` / `group` ARIA (native, no dep).
  - **Stepper** (`Navigation`) — wizard/progress step indicator with complete/current/upcoming states (distinct from the existing `StepperField` number input).
  - **Carousel** (`Display`) — native CSS scroll-snap track with Prev/Next affordances (no carousel library).

  Adds one dependency: `@radix-ui/react-toolbar`. Each ships colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture.

  Also lands **ADR-020** (date/time components on react-day-picker v10 + date-fns) and installs those dependencies as groundwork for the Tier-3 date/time family — no Tier-3 components ship in this change yet.

- aba78d2: Add the Tier-3 date/time family, completing the Astryx coverage build (#76) per ADR-020 (react-day-picker v10 + date-fns):
  - **HdsCalendar** (`Inputs`, primitive) — HDS-token-skinned month calendar over `react-day-picker`; passes through `mode` (single/range/multiple), `selected`, `onSelect`, disabled/min/max, locale. The foundation the date inputs compose.
  - **HdsTimeInput** (`Inputs`, primitive) — token-skinned native `<input type="time">` (no calendar dependency).
  - **HdsDateInput** (`Inputs`, pattern) — single-date text field with a calendar Popover; date-fns parse/format.
  - **HdsDateRangeInput** (`Inputs`, pattern) — date-range trigger + range calendar Popover.
  - **HdsDateTimeInput** (`Inputs`, pattern) — combined date (calendar Popover) + time (`HdsTimeInput`) producing one `Date`.

  Each ships colocated tests (Radix Popover jsdom polyfills), a Storybook story, a Code Connect stub, and a Swiss-canon fixture. Dependencies `react-day-picker` and `date-fns` (added as ADR-020 groundwork) are now in use; they tree-shake out of consumer bundles that don't import a date component (verified by `smoke:consumer`, and the app `size-limit` main-entry budget is unchanged).

- f8f9e1f: Add `Box` — a polymorphic layout primitive with a token-first `sx` engine (#92), a deliberate subset of MUI's `sx`: spacing shorthands (`m`/`p`/`gap` family) resolve off the HDS 4px scale and named layout steps, `color`/`bgcolor`/`borderColor`/`fill`/`stroke` resolve dotted token keys to semantic CSS vars, responsive `{ xs, sm, md, lg, xl }` values compile to `min-width` media queries, and `&`-prefixed keys compose nested selectors. Resolves to a deterministic, hash-cached, SSR-safe injected CSS class (`src/app/components/box-sx.ts`).
- 0b3738f: Add the `@hirobius/design-system/brand` subpath (#64): a framework-free palette → HDS-semantic overlay bridge. `brandOverlayVars` / `brandOverlayStyle` / `brandOverlayCss` map a small brand palette (six colours + optional font/radius) onto the HDS semantic custom properties, so a downstream render target (a static Astro site, an SSR shell, an email) can theme itself from a brand palette while inheriting HDS's contrast-checked semantics, accent states, and radius. Interactive accent states are derived with CSS `color-mix()` — no colour-math dependency. Imports no React and no Node built-ins. This is the seam that lets the `hirobius/clients` Astro factory consume HDS instead of maintaining a parallel `--brand-*` token system.
- 6a4f0f6: CSS-in-JS → Tailwind (#60): migrate `ActivityFeed` to Tailwind + `cva`, formalizing the status axis as a `tone` variant (`activityToneVariants` / `activityAvatarVariants`). Typography composites (`heading3`/`body`/`ui`/`technical`) and the avatar/list resets move from inline `style` objects onto var()-bound Tailwind classes on the exact same `--semantic-*`/`--primitive-*` custom properties — no visual change.

  **Value rename (non-breaking):** `ActivityEvent`'s color axis now follows the HDS tone vocabulary (`neutral | danger | success | warning | info`) via a new optional `tone` prop, matching the fixed contract in `docs/architecture/variant-contract.md`. The old `status` prop (`ActivityStatus`, including `'error'`) is deprecated but still fully supported: `status="error"` resolves to the same `danger` tone as `tone="danger"` (proven by a byte-for-byte render-output test). New code should use `tone`; `status`/`ActivityStatus` will be removed in a future major.

- 254d9eb: Drop the `Hds` prefix from 12 net-new leaf component families — step 1 of retiring the `Hds` prefix fleet-wide. **Breaking rename shipped as a `minor` per the pre-1.0 semver-zero convention (0.x: breaking changes bump the minor)** — safe now because these families are new in this release cycle with only fresh, first-party consumers. These families shipped in 0.12.0/0.13.0 with zero external consumers, so the rename is safe to land as the first cut. Compound sub-exports (e.g. `HdsAlertDialog.Trigger`), `*Props`/`*Component` types, and source filenames (`hds-*.tsx` → `*.tsx`) all moved together. `scripts/scaffold-component.mjs` and `scripts/component-discovery.mjs` were flipped in the same PR: new components must now be plain PascalCase, and a leading `Hds` is the namespace violation going forward (not the absence of one).

  | Old                                                                                                                                                             | New                                       |
  | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
  | `HdsToggleButton`                                                                                                                                               | `ToggleButton`                            |
  | `HdsAlertDialog` (+ `.Trigger`/`.Portal`/`.Overlay`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`/`.Action`/`.Cancel`)                                 | `AlertDialog` (same compounds)            |
  | `HdsHoverCard` (+ `.Trigger`/`.Content`)                                                                                                                        | `HoverCard` (same compounds)              |
  | `HdsContextMenu` (+ `.Trigger`/`.Content`/`.Item`/`.CheckboxItem`/`.RadioGroup`/`.RadioItem`/`.Label`/`.Separator`/`.Group`/`.Sub`/`.SubTrigger`/`.SubContent`) | `ContextMenu` (same compounds)            |
  | `HdsAspectRatio`                                                                                                                                                | `AspectRatio`                             |
  | `HdsMultiSelector` (+ `HdsMultiSelectorOption`)                                                                                                                 | `MultiSelector` (+ `MultiSelectorOption`) |
  | `HdsLightbox`                                                                                                                                                   | `Lightbox`                                |
  | `HdsCalendar`                                                                                                                                                   | `Calendar`                                |
  | `HdsTimeInput`                                                                                                                                                  | `TimeInput`                               |
  | `HdsDateInput`                                                                                                                                                  | `DateInput`                               |
  | `HdsDateRangeInput`                                                                                                                                             | `DateRangeInput`                          |
  | `HdsDateTimeInput`                                                                                                                                              | `DateTimeInput`                           |

  Consumers importing any of the above must update to the new names; there is no compatibility alias. Everything else — the `hds-` CSS class namespace, `data-*` attributes, the JSX-compiler DSL tags (`HdsFrame`/`HdsHeading`/`HdsLabel`/`HdsPhosphor`/`HdsCaption`), the provider/theme surface, the manifest type surface, and the `Form`/`FormField`/`ThemeProvider`/`Tooltip` collision families — is unchanged and out of scope for this PR.

- 7f48641: Add the "every-layout" layout primitives (#96): `Cluster` (wrapping flex row with tokenized gap/align/justify), `Center` (max-width column with auto margins and an optional tokenized gutter), `Sidebar` (fixed-width rail + fluid content that wraps to stacked via flex-basis/flex-grow disparity, no media query), `Switcher` (flips a row to a column below a `threshold` via the flex-basis calc() technique, with a `limit` to force stacking), `Cover` (vertical shell with an optional header/footer and an auto-margin-centered main region), `Frame` (aspect-ratio-locked, token-clipped media box — a thin radius/overflow skin over `AspectRatio`), and `Bleed` (controlled negative-margin full-bleed within a padded container). All seven are `as`-polymorphic, `forwardRef`, and token-driven — spacing resolves off the `--semantic-space-layout-*` scale, never raw px.
- 3faaea9: CSS-in-JS→Tailwind migration (#93): convert `Table` and `Disclosure` off inline
  `CSSProperties` objects onto Tailwind semantic classNames, then adopt `cva`.
  - `Table`: `density` (`comfortable | compact`) — the variant contract's
    canonical density example — plus column `align` and `stickyHeader` are now
    `cva` axes (`tableHeaderCellVariants`, `tableDataCellVariants`) driving
    Tailwind padding/min-height/position utilities bound to the same semantic
    tokens the previous inline styles referenced. Sort/selection are not
    implemented on `Table` (none existed pre-migration); `stickyHeader`
    positioning behavior is unchanged.
  - `Disclosure`: the `variant` (`panel | nav | card`) trigger styling is now
    `cva`-driven (`disclosureTriggerVariants`). Open/closed state moved from a
    JS `hovered`-state-driven inline style to a Radix-style
    `data-state="open"|"closed"` attribute with `data-[state=open]:` Tailwind
    selectors — same visual result, no more mousemove-triggered re-renders. The
    `motion/react` height/opacity/chevron-rotation animation is untouched (still
    JS-driven, not a CSS transition).

  No public prop or export renames — both components keep their existing prop
  API. `tableHeaderCellVariants`/`tableDataCellVariants`/
  `disclosureTriggerVariants` are new `@internal` cva-helper exports (same
  pattern as `buttonVariants`) — compose via component props, not directly.

- e1a127c: CSS-in-JS → Tailwind (#93): migrate `Token` fully to Tailwind + `cva` (`tokenShellVariants` / `tokenNodeInlineVariants` / `tokenLabelVariants`), replacing `Token.module.css` (deleted) and a duplicate inline-style `isSelected` override with one variant set on the same `--semantic-*`/`--component-*`/`--primitive-*` custom properties — no visual or prop changes.

  `SegmentedControl`'s active×hover×pressed×disabled×secondary state matrix is also converted to `cva` compound variants (`segmentedControlWrapperVariants` / `segmentedControlRailVariants` / `segmentedControlItemVariants` / `segmentedControlIndicatorVariants` / `segmentedControlDescriptionVariants` / `segmentedControlLabelVariants` / `segmentedControlFocusRingVariants`), replacing the inline `style` objects with the same tokens. Per ADR-015 the component keeps its own hover/focus tracking (not the shared `useInteractionState` hook, out of scope here) — only the class composition changed.

  No breaking changes: all public props, prop vocabularies, and rendered DOM/ARIA structure are unchanged for both components. The new `*Variants` exports are additive (compose via component props instead, per the variant-contract convention).

- 36e3eb1: Remove `InfoPage` from the public API (#49) — a breaking change, bumped as
  `minor` per the pre-1.0 semver-zero convention (0.x.y: breaking changes
  increment the minor).

  `InfoPage` was dead-portfolio scaffolding: a branded profile surface built
  for the portfolio landing page that hardcoded the (already-deleted)
  `/assets/adrian.webp` asset. It had no design-system-consumer use. Also
  removes `src/app/data/projects.ts`, the portfolio project data it and the
  now-deleted portfolio pages depended on — it has zero remaining importers.

  Migration: none. `InfoPage` was never intended for consumption outside the
  portfolio landing page; there is no drop-in replacement.

- b1057ac: Add `Reveal` and `Pin` scroll primitives (#116) to the core library — CSS scroll-driven, **zero JS and zero dependencies**. `Reveal` fades/slides/scales content in as it enters the viewport via `animation-timeline: view()` (`animation`: `fade | fade-up | fade-down | scale`); `Pin` is a token-friendly `position: sticky` wrapper (`top` offset) for pinned scroll scenes. Both are progressive-enhancement-safe: content is fully visible by default and the effect applies only where `animation-timeline` is supported and the user has not requested reduced motion (a `@media (prefers-reduced-motion: reduce)` + `@supports` fallback). Composes with the opt-in `@hirobius/design-system/scroll` primitives (`SmoothScroll`, `useScrollProgress`) for the full "pinned scale-reveal" hero effect on our own stack — no GSAP, no Lenis required (Lenis remains an optional add-on for momentum). See ADR-021.
- b1057ac: Add the `@hirobius/design-system/scroll` subpath (#116): opt-in scroll-motion primitives. `SmoothScroll` is a Lenis momentum-scroll provider (reduced-motion-first — skips Lenis entirely when the user prefers reduced motion — and SSR-safe), `useLenis` re-exports Lenis's React hook, and `useScrollProgress` is a Motion-based `0→1` scroll-progress hook (no new dependency; works with or without `SmoothScroll`). `lenis` is an **optional peer dependency** (`pnpm add lenis` to use `SmoothScroll`) and is externalized from the build, so it never lands in the main barrel and consumers who don't import `/scroll` pay nothing. Refines ADR-021: GSAP stays out of the library; Lenis is in as an opt-in subpath rather than downstream-only.
- 4420596: Variant contract (#60, Phase 1): establish the standard `cva` axis vocabulary — `variant` (structural), `tone` (`neutral | danger | success | warning | info`), `size` (`sm | md | lg`), `density` (`comfortable | compact`) — documented in `docs/architecture/variant-contract.md` and enforced by the extended `check-prop-vocabulary` gate (new tone/density allowlist rules). Converts the first reference batch to the contract: `Tag`, `Divider`, `Stat`, `Field`, `AvatarGroup`, `CircularProgress`.

  Breaking (value rename): `Stat` and `Field` rename their `tone="default"` value to `tone="neutral"` to align with the fixed tone set — pass `neutral`, or omit it (it remains the default). `Divider` gains a `variant="default" | "strong"` axis; the existing `strong` boolean is retained as deprecated back-compat and still works.

- cca9ba0: Variant contract (#60, Phase 3): convert className-based composites/overlays to `cva`. New cva adopters: `Card`, `Breadcrumb`, `Carousel`, `CommandPalette` (coverage: 35/123, was 31/123). `AlertDialog`, `Dialog`, `Tabs`, `Menu`, `ContextMenu`, `HoverCard`, `Popover`, `HdsTooltip` were reviewed and have no prop-driven className branching to formalize (their Radix `data-[state=…]` styling already lives directly in a single class string, contract-compliant as-is) — skipped, nothing to convert. `AspectRatio` has no className surface at all (thin Radix passthrough). The legacy `Tooltip` (image-expand pill) is CSS-in-JS/`framer-motion`-driven — flagged for a future inline-style→Tailwind migration before it can adopt `cva`. `ToggleButton` was already cva-converted in an earlier phase.

  Breaking (value rename): `Card`'s single `tone` prop is now two axes — `variant` (`'default' | 'accent'`, the former structural values) and `tone` (fixed `neutral | danger | success | warning | info`). Migrate:
  - `<Card tone="default">` → `<Card variant="default">` (or omit both — same default)
  - `<Card tone="accent">` → `<Card variant="accent">`
  - `<Card tone="success" | "warning" | "danger">` → unchanged (still valid on `tone`)

  `Card.Progress` and `Card.Metric`'s `tone` prop drops the `'accent'` value (no known internal consumers) and renames `'default'` → `'neutral'` (same default rendering — content-accent fill for Progress, content-primary color for Metric). Both gain a new `'info'` tone value for fixed-vocab completeness.

### Patch Changes

- 157990d: Variant contract (#60): migrate `HeadingStack` from CSS-in-JS (inline `style` + a `LEVEL_STYLES` `CSSProperties` map) to Tailwind + `cva`, formalizing `level` (`heading1 | heading2 | heading3`) as a cva variant and `gap` (`px4 | px8`) as a second, layout-axis variant (mirroring `Divider`'s `orientation`). Every emitted class binds the exact same `--semantic-typography-*`/`--semantic-color-content-*`/`--primitive-space-*` custom property the removed inline styles referenced — zero visual change. Public prop API, defaults, and tag overrides (`as`/`headingAs`/`subheadingAs`) are unchanged; non-breaking.
- f86ab1a: CSS-in-JS → Tailwind (#60): migrate `SideNav` to Tailwind + `cva` (`sideNavVariants`), formalizing the `level` (`root` | `nested`) axis as a cva variant alongside the existing rest/hover/focus/active/disabled `state` matrix. Replaces the inline `style` object and the removed `BG`/`TEXT` token maps with the same `--semantic-*`/`--component-*`/`--primitive-*` custom properties, bound 1:1.

  The `useFrozenState` (Storybook demo-state freeze) override is preserved exactly, including its pre-existing quirks: only `hover`/`active`/`disabled`/`pressed`/`press` freeze values are recognized (unlike `NavItem`, `focused`/`rest` fall through to live interaction state), and a frozen `pressed` state shares `active`'s visual tokens but does not set `aria-current="page"` the way a frozen `active` state does. Resolved state is now exposed via `data-state`/`data-level` attributes for testability, mirroring `nav-item.tsx`'s established pattern (ADR-015). Modality-aware focus-visible detection now goes through the shared `useFocusVisible` hook instead of a duplicated inline implementation.

  No breaking changes: the public prop API, defaults, RTL-aware indent math, the titleLabel/button/anchor branching, and the 44px minimum interactive size are all unchanged.

- 4c72ebc: CSS-in-JS → Tailwind (#60): migrate `DocLinkCard` to Tailwind + `cva` (`docLinkCardVariants`), formalizing the `variant` (`feature` | `pager`) axis. Inline `style` objects for layout (padding, gap, flex direction, absolute positioning, margins) are replaced with Tailwind classes bound to the same `--semantic-space-*` custom properties; typography composites (`heading3`/`ui`/`caption`) stay inline per the existing HDS pattern, with color/margin moved onto the shared `text-primary`/`text-secondary` utility classes. RTL (`isRtl`) and directional-affordance logic are preserved exactly — the pager icon/title left-right decision is now a single derived boolean equivalent to the prior nested ternaries. `motion/react` icon-nudge animations (`headerIconControls` / `pagerIconControls`) are untouched.

  No breaking changes: all public props, defaults, and rendered DOM/ARIA structure are unchanged. `docLinkCardVariants` is an additive `@internal` export (compose via `DocLinkCard` props instead, per the variant-contract convention).

## 0.11.0

### Minor Changes

- 39e5e4d: Autonomous issue sweep — additive components, tokens, and tooling (non-breaking):
  - **HdsTooltip** (#69): new accessible hover/focus tooltip on Radix Tooltip — collision-aware positioning, ARIA, keyboard, delay; inverse-surface skin with arrow.
  - **HdsThemeProvider + `useHdsTheme`** (#61): framework-agnostic theming contract over the four `data-*`/CSS-var dials (theme, density, brand, font), zero-JS compatible.
  - **Textarea** (#73): new multi-line text-field primitive mirroring Input's token skin, with label/helper/error slots and Default/Focus/Error/Disabled states.
  - **`semantic.typography.caption`** (#71): new 12/16 caption type composite in the token pipeline; `hds.typeStyles.caption` now resolves to it instead of aliasing `ui`.
  - **Alert** (#72): lighter icon stroke (2 → 1.5) and title alignment nudge to match the Figma spec.
  - Tooling (not shipped in the bundle): `pnpm hds:new` one-command component scaffold (#63) and a `design.md` → brand-overlay harvester (#67); source hygiene and suppression triage (#57).

## 0.10.0

### Minor Changes

- d371372: **BREAKING:** remove the `./protocol` subpath export. It carried the signed
  WebSocket envelope for the legacy hand-rolled Figma bridge, which has been
  archived (`archive/figma-bridge` branch) in favor of the official Figma MCP
  server + Code Connect (ADR-019). No consumer app imports it — it existed only
  to share the envelope with the custom Figma plugin. All other exports
  (components, stylesheets, `tokens`, `cn`, `manifest`, `contexts`, `form`,
  `mui`) are unchanged. If you did import `@hirobius/design-system/protocol`,
  pin `<0.10.0` or vendor `protocol/envelope.mjs` from the archive branch.

## 0.9.0

### Minor Changes

- 27e293a: Add a reset-free component stylesheet on a new subpath:
  `@hirobius/design-system/styles.css`. It ships the full component styling
  (design tokens + Tailwind utilities + embedded fonts) but **no global reset** —
  HDS's own base styles are scoped to `[data-hds]`, so importing `styles.css`
  styles every HDS component and changes **zero** host-element styles (`*`,
  `html`, `body`, headings, `button`, `a`, form controls are untouched). This is
  the clean way to run HDS alongside MUI `<CssBaseline>` / Emotion or any host with
  its own global CSS.

  `tokens.css` is unchanged (batteries-included: `styles.css` **plus** the global
  Tailwind preflight) and remains the default for HDS-first apps. A scoped
  box-model reset was added to the `[data-hds]` base so components keep their
  border-box model without the global preflight. The `smoke:consumer` gate now
  asserts `styles.css` carries components/utilities/fonts and no global reset.

- 27e293a: Add a semantic **`tone`** axis to `Button` (`neutral | danger | success |
warning | info`), driven by the feedback tokens, so destructive and status
  actions read as first-class buttons instead of falling back to a host framework:
  `<Button tone="danger">Delete</Button>`. Tones apply a token-driven tonal fill
  (tinted surface + matching feedback text) that clears WCAG AA in **both** light
  and dark, composes with any `variant`, and defaults to `neutral` (no change to
  existing buttons). `Badge` gains the matching `inProgress` tone, completing its
  status set. Backed by named `feedback-*` Tailwind utilities (no arbitrary color
  values).
- 27e293a: Add an **in-progress / secondary** semantic feedback hue and gate the feedback
  palette for accessibility. New `--semantic-color-feedback-inProgress` (violet:
  `#6d28d9` light / `#a78bfa` dark) plus its tinted-surface pair
  `--semantic-color-feedback-bg-inProgress`, backed by a new `violet` primitive
  ramp. This completes the status palette (success / warning / info / error /
  in-progress) so consumers can theme status UI — Saved / Applied / Interviewing /
  Offer / Rejected — from HDS tokens alone, with no local status hex.

  `scripts/check-contrast.mjs` now asserts every hex feedback token clears WCAG AA
  for small text on **both** the page and card (`raised`) surfaces, in light and
  dark. `docs/CONSUMING.md` publishes the feedback token names for downstream
  mapping.

- 27e293a: Add an optional Material UI theme preset on a new subpath:
  `@hirobius/design-system/mui`. `hdsMuiThemeOptions()` returns an MUI
  `ThemeOptions`-shaped object whose palette is wired to HDS token CSS variables
  (`error`/`warning`/`info`/`success` map to the same feedback tokens as
  `<Button tone>` / `<Badge tone>`), so MUI-based apps theme from HDS without a
  local token-copy step. It imports no MUI code (structural return type), so it
  adds zero weight and no peer requirement unless imported. Designed for MUI v6+
  CSS-variables mode: `createTheme({ cssVariables: true, ...hdsMuiThemeOptions() })`.

## 0.8.1

### Patch Changes

- ab78052: Publish to the **public npm registry** instead of GitHub Packages. Consumers now
  install with a plain `npm install @hirobius/design-system` — no `.npmrc`, no auth
  token, and no registry configuration. The package `exports`, build output, styles,
  and API are unchanged; only the distribution target moved.

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

_Releases before 0.5.0 are in git history._
