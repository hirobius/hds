# Docs site consistency audit

Read-only audit. Date: 2026-10-21.
Scope: `docs-site/` (Fumadocs 16.16.2, Next static export), `content/docs/**`,
`scripts/generate-docs-components.mjs`, and a local static build
(`pnpm docs:build`, 75 HTML files) at `main` 20f32ec.
Out of scope: density (PR #862), Avatar (PR #874). Avatar appears in tables
only as a data point.

## How the pages are made

- Hand-written MDX: `index`, `engineering`, `voice`, `foundations/*` (6),
  `guides/*` except providers (4).
- Generated MDX, gitignored: `components/*` (40), `patterns/*` (13),
  `guides/providers.mdx`.
  - Writer: `scripts/generate-docs-components.mjs:35-65`.
  - Logic: `scripts/lib/docs-component-pages.mjs` (page body at lines 215-250).
  - Landing: `contentRoot` is `content/docs` (`scripts/docs-rules.json`).
  - Source read by Fumadocs: `docs-site/source.config.ts:6-12` (`dir: '../content/docs'`).
- Section roots `/docs/components` and `/docs/patterns` are not MDX.
  `app/docs/[[...slug]]/page.tsx:15-52` makes them from `ComponentIndex`.

The generated template is one fixed recipe. That is good. It is the only
consistent template on the site. Foundations and guides have none.

---

## 1. Page templates

### 1a. Component pages (40)

Same order on every page:

1. h1 title, description, Figma + Source links (`page-links.tsx`)
2. live demo (`{/* preview: X */}`)
3. fold: "Show code" (import line only)
4. `## Best practices` (the only h2 on most pages)
5. fold: "API · N props"
6. fold: "Accessibility" (if the component has a11y rules)
7. fold: "Design tokens" (if it has observed tokens)

Rendered h2 list per page, from the build:

| Pages                                    | h2 in order                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 38 pages (alert … tooltip, except below) | `Best practices`                                                                                |
| `utilities`                              | `Box`, `Container`, `VisuallyHidden` (no Best practices)                                        |
| `text`                                   | `Title`, `Best practices` (the `Title` h2 and an h1 `Display` come from the demo, not the page) |
| `card`                                   | `Best practices` (plus a demo h3 "Design tokens" before it)                                     |

Only `utilities` differs in order. It repeats the recipe three times.

### 1b. Pattern pages (13)

Same recipe, but the Best practices h2 is mostly missing.

| Section             | Pages with it                    | Pages without it |
| ------------------- | -------------------------------- | ---------------- |
| `## Best practices` | `async-state`, `status-tile` (2) | 11 others        |

Rendered h2s on pattern pages are leaked demo content, not page sections:

| Page                  | h2 / h1 in the HTML              | Source |
| --------------------- | -------------------------------- | ------ |
| `data-table-section`  | h2 `Projects`                    | demo   |
| `destructive-section` | h2 `Delete project`              | demo   |
| `page-header`         | h2 `Acme Co`                     | demo   |
| `error-pattern`       | h1 `404` (second h1 on the page) | demo   |

### 1c. Foundation pages (6)

| Page       | h2 / h3 in order                                       |
| ---------- | ------------------------------------------------------ |
| color      | `Tokens` > Primitives, Semantic & state, Accent themes |
| elevation  | `Tokens` > Levels                                      |
| motion     | `Tokens` > Presets                                     |
| radius     | `Tokens` > Roles, Scale, Primitive steps               |
| spacing    | `Tokens` > Scale, Fixed, Primitive steps               |
| typography | `Tokens` > Type ramp; then a second h2 `The ramp`      |

All have a collapsed "Principles and best practices" box after the tokens
(`principles-and-practices.tsx`). In the source its `### Principle` and
`### Best practices` sit under `## Tokens`. Principle is not a token.

Typography is the odd one: it has two h2s (`Tokens`, `The ramp`).

### 1d. Guides and top-level pages

| Page                         | h2 in order                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| guides/getting-started       | Install; Load the CSS once; Mark the HDS scope; Theming; Where to go next; For agents |
| guides/tokens                | One source, many outputs; Tiers; Using tokens; Adding or changing a token             |
| guides/upgrade               | Run the upgrade; What the ledger holds; Releases                                      |
| guides/deprecation           | How a deprecation works; Deprecated now; Removed, moved and renamed                   |
| guides/providers (generated) | none. Three h3: HdsRouterProvider, HdsThemeProvider, ToastProvider                    |
| engineering                  | Architecture at a glance; 1. … 7. (numbered); Further reading. One h3.                |
| voice                        | Who it's for; Voice; Words we don't use                                               |
| index                        | Install; Start here                                                                   |

Notes:

- `engineering` numbers its h2s ("1. The token pipeline"). No other page does.
- `voice` has an h2 "Voice" on a page titled "Voice".
- `guides/providers` jumps h1 to h3 (see section 3).

### 1e. Feature matrix

Y = present in the page body. F = present but folded (collapsed, not a heading).
`-` = missing. "All" means every page in the group.

| Feature                     | Components (40)                                                 | Patterns (13)                                              | Foundations (6)                          | Guides (5)                    |
| --------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- | ----------------------------- |
| Overview / intro            | description only (subtitle)                                     | description only                                           | description only                         | Y in prose                    |
| Usage / Best practices (h2) | 39 of 40 (not `utilities`)                                      | 2 of 13                                                    | F (all 6)                                | `-`                           |
| Do / Don't                  | text bullets only ("Not for X", "For Y use Z"); no visual pairs | text bullets in 2                                          | text bullets, "Don't ..." lines (all 6)  | `-`                           |
| Props (API)                 | F, 40 of 40                                                     | F, 13 of 13; 2 say `props: TODO` (`form`, `error-pattern`) | `-`                                      | `-`                           |
| Accessibility               | F, 26 of 40 (14 silent)                                         | F, 8 of 13 (5 silent)                                      | `-`                                      | `-`                           |
| Keyboard table              | 6 of 40                                                         | 0                                                          | `-`                                      | `-`                           |
| Tokens                      | F, 14 of 40                                                     | F, 2 of 13                                                 | Y, all (the `Tokens` h2)                 | `guides/tokens`               |
| Changelog (per page)        | `-`                                                             | `-`                                                        | `-`                                      | one global ledger (`upgrade`) |
| Figma link                  | 37 of 40 (not grid, stack, utilities)                           | 11 of 13 (not page, reveal)                                | `-`                                      | `-`                           |
| Source link                 | 39 of 40 (not utilities)                                        | 13 of 13                                                   | `-`                                      | `-`                           |
| Live demo                   | all 40                                                          | all 13                                                     | gallery visuals                          | `-`                           |
| Code beside demo            | F "Show code": import line only                                 | same                                                       | code fences                              | code fences                   |
| Related components          | in frontmatter for 38; **never rendered**                       | 0 of 13 have it                                            | `-`                                      | `-`                           |
| Status / since              | in frontmatter, **never rendered**                              | same                                                       | `status`/`since` set, **never rendered** | `-`                           |

Silent a11y gaps (no section, no note saying so):
avatar, badge, divider, empty-state, grid, kbd, meta-line, progress, skeleton,
spinner, stack, surface, text, utilities.
Patterns: metric-tiles, page-header, page, reveal, status-tile.

Order differences to flag:

1. `utilities` repeats the recipe three times under h2 per component.
2. Pattern pages drop the Best practices h2 in 11 of 13.
3. Foundations put tokens first, guidance last. Components put guidance first,
   tokens last. The two groups read in opposite orders.
4. Guides have no shared order at all.

Evidence the "Show code" fold holds only one import line: `button.mdx` lines
15-21 (a single `import { Button } from '@hirobius/design-system'`). It is not
an example of use.

---

## 2. Fumadocs UI not themed to HDS

Base: `app/globals.css:18-57` points every `--color-fd-*` at an HDS semantic
colour. That fixes colour. It does not fix radius, shadow, type size, spacing,
focus rings or icons, which Fumadocs sets with Tailwind utilities.

Colour tokens left on Fumadocs defaults (not in the list at `globals.css:37-56`):

- `--color-fd-overlay` (Fumadocs: `hsla(0,0%,0%,0.2)`, `fumadocs-ui/dist/style.css`).
  The search backdrop uses it (`search.js:182`).
- `--color-fd-idea`, `--color-fd-diff-*`. Used by Callout `idea` and diff blocks.

| Piece                                          | Used?                                             | HDS-themed?                                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar                                        | Yes                                               | Mostly. Corners and shadow, item type size, group labels. Not: padding, gaps, active bar, icon set | `globals.css:755-775` radius and shadow; `829-836` font size; `815-827` labels use HDS `Text` (`sidebar-group-label.tsx`). Active item stays `text-fd-primary` + 1px `before:bg-fd-primary` bar (in built HTML)                                                                                                                                                                                                                                                 |
| Search dialog (Cmd+K)                          | Yes (static Orama, `app/api/search/route.ts`)     | Partly: radius and shadow only                                                                     | `globals.css:281-284`. Still default: input `text-lg` (`search.js:154`), `focus-visible:outline-none` (`search.js:154`, no ring on the input), result rows `rounded-lg`, chips `rounded-md` (`search.js:308,321`), Esc button `font-mono` (`search.js:167`), backdrop `bg-fd-overlay`, `backdrop-blur-xs` (`search.js:182`). The dialog is portaled to `body`, so the radius rule at `globals.css:755-762` (scoped to `#nd-docs-layout`) never reaches the rows |
| Breadcrumb                                     | Yes (default on)                                  | No                                                                                                 | `fumadocs-ui/dist/layouts/docs/page/slots/breadcrumb.js:29-37`. `text-sm`, last crumb `text-fd-primary font-medium`, Fumadocs chevron. On a component page it is one non-link crumb ("Components"), because the page tree has one level                                                                                                                                                                                                                         |
| Page title / description                       | Yes                                               | Title yes, description no                                                                          | h1/h2/h3 sizes mapped to HDS type roles (`globals.css:75-106`). Description is Fumadocs `mb-8 text-lg text-fd-muted-foreground` (`layouts/docs/page/index.js:96`), not overridden                                                                                                                                                                                                                                                                               |
| TOC ("On this page")                           | Yes, gated                                        | No                                                                                                 | Shown only at 5+ headings (`page.tsx:12,71-72`). Default style, `text-sm`, Fumadocs thumb (`toc/default.js`). Open popover: `shadow-lg` is re-pointed (`globals.css:770-772`); its rows are not. `--fd-toc-width` hack at `globals.css:135-139`                                                                                                                                                                                                                 |
| Code blocks                                    | Yes, replaced                                     | Yes                                                                                                | Shiki off (`source.config.ts:21`). `pre` maps to HDS `CodeBlock` (`mdx-code-block.tsx:15-23`). Fallback `<pre>` for non-fence is plain Fumadocs                                                                                                                                                                                                                                                                                                                 |
| Callout                                        | Not used in content                               | No, if used                                                                                        | In `defaultMdxComponents` (`mdx-components.tsx:15`) so any author can write `<Callout>`. Default: `rounded-xl border shadow-md text-sm p-3`, lucide icons, `--callout-color` from `--color-fd-*` (`callout.js:17-20`). The `:not(#nd-page *)` guard at `globals.css:755-761` skips page-body elements, so Corners/Shadow switches would not reach it. HDS `Callout` exists and is used in `tour-releases.tsx:61`                                                |
| Cards / Card                                   | Not used in content (HDS `Card` used in `tour/*`) | No, if used                                                                                        | Same default registered via `defaultMdxComponents`. `rounded-xl border p-4 shadow-md` (`card.js:17-20`)                                                                                                                                                                                                                                                                                                                                                         |
| Tabs                                           | No                                                | n/a                                                                                                | `fumadocs-ui/components/tabs` not imported anywhere. Default would be `rounded-xl border`, `text-sm`, `border-fd-primary` underline (`tabs.js:22-60`). HDS `Tabs` exists                                                                                                                                                                                                                                                                                        |
| Accordion / Steps / TypeTable                  | No                                                | n/a                                                                                                | Not imported. HDS `Disclosure` and native `<details>` are used instead                                                                                                                                                                                                                                                                                                                                                                                          |
| Banner                                         | No                                                | n/a                                                                                                | Not used. No site-wide banner (for example for "pre-1.0" or a deprecation notice)                                                                                                                                                                                                                                                                                                                                                                               |
| Page footer, prev/next                         | Disabled                                          | n/a                                                                                                | `footer={{ enabled: false }}` at `page.tsx:25,80`. Default would be `rounded-lg border p-4 text-sm` (`footer.js:45`). Reasoned: "repeats the sidebar". No prev/next also means no linear reading path through Guides                                                                                                                                                                                                                                            |
| Mobile drawer, collapse button, sidebar shadow | Yes                                               | Mostly                                                                                             | `globals.css:764-815`: radius, shadows, 44px touch rows. Done well                                                                                                                                                                                                                                                                                                                                                                                              |
| Theme switch                                   | Replaced by HDS                                   | Yes                                                                                                | `theme-toggle.tsx`, `theme-segments.tsx`, `preview-switches.tsx`                                                                                                                                                                                                                                                                                                                                                                                                |
| Tables in prose                                | Replaced                                          | Yes                                                                                                | `mdx-prose.tsx`, `globals.css:262-276`                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Focus rings                                    | Mixed                                             | No single rule                                                                                     | HDS parts use `hds-focus`. `.hds-fold > summary` and swatches use a hand-written `outline: 2px solid var(--semantic-color-border-accent)` (`globals.css:328-331, 509-512, 713-716`). Fumadocs parts use Tailwind `ring-fd-ring` (token colour, Tailwind width and offset). Search input has none                                                                                                                                                                |
| Icons                                          | Mixed                                             | See section 3                                                                                      | Fumadocs chrome: lucide (`lucide-react@1.52.0` inside fumadocs-ui). HDS parts: lucide (`0.487.0` in root `package.json:370`). Fold chevron is a CSS-drawn border corner (`globals.css:313-322`), a third style                                                                                                                                                                                                                                                  |

Shadow switch gap: `html[data-docs-shadow='hard']` covers three tokens
(`globals.css:416-420`). Search dialog shadow is covered because it uses
`--semantic-shadow-overlay`. Fumadocs `shadow-md` on any Callout/Card is not.

---

## 3. Spacing and heading-level drift

### 3a. Skipped heading levels

| Where                                 | Skip                                                                                            | Source                                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/docs/components` landing            | h1 -> h3 (category names)                                                                       | `component-index.tsx:31`                                                                                                                                     |
| `/docs/patterns` landing              | h1 -> h3                                                                                        | same component                                                                                                                                               |
| `guides/providers`                    | h1 -> h3, no h2 at all                                                                          | `docs-component-pages.mjs:334` (`### ${n}`)                                                                                                                  |
| Foundation Principle / Best practices | h3 under an h2 `Tokens` that has nothing to do with them                                        | e.g. `foundations/color.mdx:14,20`                                                                                                                           |
| Demos with real headings              | h1 `Display` on `text`, h1 `404` on `error-pattern`, h2 `Acme Co`, `Projects`, `Delete project` | built HTML. Demos render inline (not in an iframe), so each page gets a second h1 or stray h2 in the heading outline. Hurts screen-reader heading navigation |

No page in the content jumps h2 -> h4. There is no h4 in MDX.

h3 as section head: `guides/providers` (all three sections), both landings
(category groups). On those pages h3 is doing an h2's job.

### 3b. Principle and Best practices hidden from the DOM

`PrinciplesAndPractices` is an HDS `Disclosure` (`principles-and-practices.tsx`).
The static HTML for `foundations/spacing.html` has the words "Principles and
best practices" but not the body ("4px grid" appears only in `<meta>`). So the
`### Principle` and `### Best practices` entries are in the MDX table of
contents but have no element to link to until the box is opened. They are in
the search index (built from MDX). Foundations are the only place the
guidance lives, and it ships collapsed.

### 3c. Three collapse styles

| Style                                              | Used for                                   | File                                    |
| -------------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| Native `<details class="hds-fold">`                | Code, API, a11y, tokens on generated pages | `globals.css:289-352`                   |
| HDS `Disclosure` inside bordered `Card`            | Foundations guidance                       | `principles-and-practices.tsx`          |
| `<details><summary>` per release / per token group | Deprecation ledger, colour groups          | `upgrade-ledger.tsx`, `token-table.tsx` |

Folded API, Accessibility and Tokens are not headings. They cannot be linked
to (no id), do not appear in the TOC, and Fumadocs search finds them only as
body text of the page.

### 3d. Hard-coded values in `app/globals.css` (836 lines)

| Kind                                  | Hard-coded declarations                                                                     | Token-based declarations                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| margin / padding / gap in rem         | 17 (e.g. 197, 209, 243, 301-302, 334, 340, 529-530, 556, 575, 600, 635, 640, 657, 667, 703) | 23 lines use `--semantic-space-*`                                                        |
| font-size in rem/em                   | 14 (203, 215, 221, 237, 344, 469, 474, 537, 543, 551, 607, 613, 663, 705)                   | 3 `font-size: var(--semantic-typography-*)` (headings, sidebar) plus caption role at 577 |
| font-weight numbers                   | 10 (e.g. 148, 165, 216, 305, 705)                                                           | 3 via typography roles                                                                   |
| border-radius numbers                 | 3 (250 `0.25rem`, 625 `1px`, 412 `0`)                                                       | 12 via `--semantic-radius-*`                                                             |
| width / height / top / left in rem/px | 25                                                                                          | 7 via `--semantic-size-*` / `--primitive-size-*`                                         |
| transition timing                     | 1 (`150ms ease`, line 320)                                                                  | `--hds-demo-duration` used for the motion demo only                                      |
| line-height                           | 2 (`1.4` at 721; `calc(var(--spacing) * 14)` at 125)                                        | caption role at 579                                                                      |

Total about 59 hard rem/px lines vs 23 `--semantic-space-*` uses.
Odd values that match no HDS step: `0.875rem` (302), `0.625rem` (530),
`0.375rem` (556, 600, 657), `0.8125rem` (237, 474, 663), `0.6875rem` (543, 551).
The 4px grid in `foundations/spacing.mdx:15` is broken by these.

Mixed approach: Fumadocs chrome uses Tailwind's `--spacing` (4px unit) and
`calc(var(--spacing) * N)` at `globals.css:125, 176`; the rest uses HDS tokens.
Fumadocs page frame is `px-4 py-6 gap-4 md:px-6 xl:px-8 max-w-[900px]`
(built HTML), none of it HDS.

### 3e. Icon sets

| Where                                                                                         | Set                                                                                                                                |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Fumadocs chrome (search icon, chevrons, `Hash`, breadcrumb arrow, sidebar toggle)             | lucide-react 1.52.0 (bundled inside fumadocs-ui)                                                                                   |
| HDS `Icon`, `InlineLink` external icon, tour (`tour-console.tsx:102`, `tour-releases.tsx:19`) | lucide-react 0.487.0 through `@hirobius/design-system/icons`                                                                       |
| Fold chevron                                                                                  | CSS borders, no icon (`globals.css:313-322`)                                                                                       |
| Demo image placeholders                                                                       | inline SVG data URIs (`component-demos.tsx:970`, `tour-releases.tsx:25`), hard-coded `#808080`, `#e5e5e5`, `#111` (demo art, fine) |

So one family (lucide) but two versions and a hand-drawn third chevron.
Cost: two copies of lucide shipped to the browser, and stroke width or
corner details can differ by version.

---

## 4. Per-page features vs mature design-system docs

Reference: Material, Carbon, Polaris, Atlassian, Primer, Radix (known patterns).

| Feature                                  | Common in mature docs                   | HDS today                                                                                                                                                                                         | Evidence                                                                                                      |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Consistent component template            | Yes (Polaris, Carbon)                   | **Yes** for components and patterns; **No** for foundations and guides                                                                                                                            | Generator `docs-component-pages.mjs:215-250`                                                                  |
| Auto prop tables                         | Yes (Radix, Primer)                     | **Yes**, generated from `component-api.json`, as markdown tables in a fold. Not Fumadocs `AutoTypeTable`. Long unions are not collapsed; some props have `—` descriptions (Button `size`, `tone`) | `button.mdx` API fold; `fumadocs-ui/components/type-table.js` exists, unused                                  |
| Live demo with code                      | Yes (all)                               | **Partly**. Live demo yes. Code fold shows only the import line, never the demo's JSX. No variants matrix, no state grid (hover, focus, disabled), no playground controls                         | `button.mdx:15-21`; `component-demos.tsx` is separate from the MDX, so docs readers cannot copy what they see |
| Per-component a11y notes                 | Yes (Carbon, Atlassian)                 | **Partly**. 26 of 40 components, 8 of 13 patterns. Good split "You provide" and "Built in". 6 keyboard tables. Silent gap on 14 components, no "none needed" line                                 | `docs-component-pages.mjs:130-170`                                                                            |
| Status / maturity badge                  | Yes (Carbon, Atlassian, Polaris)        | **No**. `status:` is set, is "stable" on 66 of 67 pages (one `experimental`, voice.mdx), and never shown                                                                                          | `page.tsx:81-85` renders only title, description, links                                                       |
| `since` / version                        | Often                                   | **No**. Generator emits `since` only if semver; none emitted for components                                                                                                                       | `docs-component-pages.mjs:224`                                                                                |
| Per-component changelog                  | Some (Primer, Atlassian)                | **No**. Only one global ledger at `guides/upgrade`. No link from a component to its entries                                                                                                       | `upgrade-ledger.tsx`                                                                                          |
| Figma links                              | Yes                                     | **Yes**: "Figma" and "Source" links under the subtitle for 37 of 40 components, 11 of 13 patterns                                                                                                 | `page-links.tsx`. Missing: grid, stack, utilities, page, reveal. No Figma embed or node screenshot            |
| "Copy page as Markdown" / "Open in AI"   | Newer (Vercel, Stripe, Fumadocs `llms`) | **No** on the site. `public/llms.txt` and `llms-full.txt` exist at repo root but are not in the static export, so no per-page `.md`                                                               | `ls out` has no llms files; no route under `app/`                                                             |
| Last-updated dates                       | Some (Polaris, Primer)                  | **No**. Fumadocs `lastUpdate` is not wired                                                                                                                                                        | grep: no `lastModified`, no footer date                                                                       |
| Versioned docs                           | Rare for small systems                  | **No**                                                                                                                                                                                            | Single `content/docs` tree                                                                                    |
| Edit on GitHub                           | Yes (Fumadocs, Primer)                  | **Partial**. A "Source" link goes to the component `.tsx`, not to the doc page. Doc content is generated, so an edit link would point to the data, not a file                                     | `page-links.tsx:6-9`                                                                                          |
| Related components                       | Yes (Polaris, Carbon)                   | **No on screen**. `related:` frontmatter on 38 components, 0 patterns, never rendered. The "For X use Y" bullets in Best practices do link to siblings                                            | `button.mdx:5-7`                                                                                              |
| Search                                   | Yes                                     | **Yes**, static Orama. Index is page text and headings; folded sections are not headings                                                                                                          | `app/api/search/route.ts`                                                                                     |
| Prev / next                              | Yes                                     | **No**, disabled                                                                                                                                                                                  | `page.tsx:25,80`                                                                                              |
| TOC on component pages                   | Yes                                     | **No**. Hidden under 5 headings, and component pages have 1-2                                                                                                                                     | `page.tsx:12,71-72`; built HTML has no `nd-toc` on `button.html`                                              |
| Do / Don't with examples                 | Yes (Polaris, Atlassian)                | **No**. Text bullets only                                                                                                                                                                         | `status-tile.mdx`                                                                                             |
| Content/voice guidance per component     | Yes (Polaris, Atlassian)                | **No**. One site-wide `voice.mdx`                                                                                                                                                                 | `content/docs/voice.mdx`                                                                                      |
| Dark/light preview + corner/shadow dials | Rare                                    | **Yes**, a strength                                                                                                                                                                               | `preview-switches.tsx`, `globals.css:383-445`                                                                 |

---

## 5. Ranked gaps

Impact: H, M, L. Effort: S (under a day), M (days), L (week or more).

### Top 10

| #   | Gap                                                                                                            | Impact | Effort | Concrete fix                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Folded API, Accessibility, Tokens have no heading, id, TOC entry or deep link                                  | H      | S      | In `docs-component-pages.mjs:70`, emit `## API`, `## Accessibility`, `## Design tokens` as real h2s (keep fold inside); then TOC and search can hit them. Lower `MIN_TOC_ITEMS` (`page.tsx:12`) to 3                 |
| 2   | `status`, `since`, `related` frontmatter are set but never rendered                                            | H      | S      | In `page.tsx`, read `status` and render it in the `PageLinks` row with an HDS `Badge`; render `related` as a "Related" `InlineLink` list under Best practices                                                        |
| 3   | Demo headings leak into the page outline (h1 on `text`, `error-pattern`; h2 on 3 patterns)                     | H      | S      | Wrap `ComponentDemo` output in `role="group"` with headings demoted to `div role="presentation"`, or render demo text as `Text as="p"` in `component-demos.tsx`. Add a check to `check-docs-axe` for one h1 per page |
| 4   | "Show code" shows only the import line, never the demo's JSX                                                   | H      | M      | Store each demo's source next to its renderer in `component-demos.tsx` (or a sibling `.demo.tsx` read at build) and feed it to the existing `CodeBlock` fold                                                         |
| 5   | Pattern pages skip Best practices (11 of 13) and a11y (5 silent); `form` and `error-pattern` say `props: TODO` | H      | M      | Fill `usage` and `a11yRules` in `component-api.json` for those patterns; make the generator write "No accessibility requirements" instead of dropping the fold; fail `check-docs` on `props: TODO`                   |
| 6   | Foundations guidance ships collapsed and is not in the static HTML                                             | M      | S      | Replace `PrinciplesAndPractices` Disclosure with normal `## Principles` and `## Best practices` h2s (move out of `## Tokens`)                                                                                        |
| 7   | Fumadocs `Callout`/`Card` are live in MDX and un-themed (`rounded-xl`, `shadow-md`, lucide)                    | M      | S      | In `mdx-components.tsx`, map `Callout` and `Cards`/`Card` to HDS `Callout` and `Card`; drop them from `defaultMdxComponents`                                                                                         |
| 8   | Search dialog radius/type/focus not themed past radius+shadow                                                  | M      | S      | Extend `globals.css:281-284` to rows (`rounded-lg/md` -> `--semantic-radius-control`), map `--color-fd-overlay`, add a visible focus ring to the input; set input size from a type role                              |
| 9   | No "Copy as Markdown / Open in AI" or per-page `.md`; `llms.txt` not served                                    | M      | M      | Add `app/docs/[...slug]/route.ts` that emits `content/docs` as `.md`; copy `public/llms*.txt` into the export; add a "Copy page" button in `page-links.tsx`                                                          |
| 10  | 59 hard rem/px lines in `globals.css` vs 23 token uses; off-grid values (0.625, 0.375, 0.6875 rem)             | M      | M      | Replace spacing and font-size literals with `--semantic-space-*` and `--semantic-typography-*`; add a stylelint rule or a `check-docs` grep that fails new literals                                                  |

### The rest

| #   | Gap                                                                                          | Impact | Effort | Concrete fix                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Five pages with no Figma link: grid, stack, utilities (components), page, reveal (patterns)  | M      | S      | Add nodes to `figma/links.json`; fail `check-docs` when a stable page has none                                                     |
| 12  | 14 components silent on a11y                                                                 | M      | M      | Add `a11yRules` or an explicit "No special requirements" (Avatar listed as data only)                                              |
| 13  | Component pages have no TOC and no prev/next                                                 | M      | S      | Falls out of #1; enable prev/next for Guides only (`page.tsx` footer by section)                                                   |
| 14  | Landings and providers jump h1 -> h3                                                         | M      | S      | Change `component-index.tsx:31` and `docs-component-pages.mjs:334` to h2                                                           |
| 15  | Per-component changelog missing                                                              | M      | M      | Filter the existing release ledger by component into a "Changes" fold on each page                                                 |
| 16  | `foundations/typography` has two h2s; `engineering` numbers h2s; guides share no order       | L      | S      | Write one foundation template and one guide template in `docs/rules/` and check them in `check-docs.mjs`                           |
| 17  | Two lucide versions shipped (0.487 vs 1.52)                                                  | L      | S      | Pin one with a pnpm `overrides` entry and rebuild                                                                                  |
| 18  | Fold chevron is hand-drawn CSS, third icon style                                             | L      | S      | Use the HDS `Disclosure` chevron icon in the `summary`                                                                             |
| 19  | Focus ring is three different recipes                                                        | L      | M      | One `.hds-docs-focus` class from the focus-visible utility; use it in `globals.css`                                                |
| 20  | No last-updated date, no versioned docs, no edit-on-GitHub for doc text                      | L      | M      | Wire Fumadocs `lastModified` for hand-written pages; skip versioning until 1.0                                                     |
| 21  | Description under title is Fumadocs `text-lg`; prose body size not tied to the HDS body role | L      | S      | Override `#nd-page > p:first-of-type` and `.prose` size from `--semantic-typography-body-*`                                        |
| 22  | Breadcrumb is one non-link crumb in accent colour                                            | L      | S      | Hide it for one-level pages or add a Home crumb; use `--semantic-color-content-secondary` for the last crumb, not `surface-accent` |

---

## Library-level findings (in `src/`, not `docs-site/`)

These are components that still set non-code text in mono. HDS rule in
`globals.css:583` says mono is for code, token names and token values.

| Component | Where                                                                                                 | What is mono                                      | Note                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Slider    | `src/app/components/slider.tsx:78` (`hds.typeStyles.mono`)                                            | The numeric value readout (a number, not code)    | Use a tabular-number body role instead                                          |
| Field     | `src/app/components/field.tsx:29-31` (`mono` variant -> `hds-type-mono`)                              | Any `Field` value when `mono` is true             | Prop invites mono for non-code values; document "code or tokens only" or rename |
| CodeBlock | `src/app/components/code-block.tsx:265-273, 315-321` (`TECHNICAL_TYPE_CLASSES` on the language label) | The language label ("terminal", "tsx"), a UI word | Set the label in the caption role, keep the code itself mono                    |

The docs-site mirrors the same rule in its own CSS: `.hds-specimen-values`
(`globals.css:584-587`) is mono only for token values, which is the right
pattern to copy.

---

## What is already good

- One generated recipe for 53 pages, with a contract in `docs-rules.json`.
- Heading sizes come from HDS type roles (`globals.css:75-106`).
- Corners and Shadow switches reach sidebar, search dialog, tables, images,
  code blocks and the mobile drawer.
- Code fences are the real HDS `CodeBlock`, so docs and library agree.
- Accessibility folds split "You provide" from "Built in".
- Landings, sidebar group labels, theme switch and display settings all use
  HDS parts instead of Fumadocs defaults.
