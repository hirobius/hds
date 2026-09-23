# Staging inventory — components drawn by an agent, awaiting promotion

Every component below lives ONLY in the staging file
`2VgBbVpKiDnu0aftJEVyBQ`. Per ADR-026 the published library
(`c8MaVgwxOlxm4wr8wnH0Z4`) is read-only to agents, so promotion is a manual
step Adrian performs.

**Do not add an `@figma` JSDoc tag for anything on this list yet.** Staging node
IDs do not survive promotion — `figma/COMPONENT-DRAWING-RECIPE.md` §Promotion is
the sequence: promote, take the NEW library node id, add the tag, then
`pnpm manifest:generate`.

Link pattern: `https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/?node-id=<id>`

## Why the gate still reports these as missing

`check-sync-map` counts a library component as linked when it carries an
`@figma` tag or a `figma/mapping-overrides.json` entry. The recipe forbids
tagging a component that lives only in staging. So **staging work is
structurally invisible to the gate**, and Figma coverage will read 47/88 until
promotion — not because the components are absent, but because the only record
the gate can read is the one the recipe says not to write yet. That is a known
gap in the measurement, not drift.

## Drawn 2026-09-23 (39 components)

| Component        | Kind      | Variants | Node       |
| ---------------- | --------- | -------- | ---------- |
| ActivityFeed     | set       | 4        | `2043-184` |
| AlertDialog      | component | —        | `2035-24`  |
| AssetImg         | set       | 2        | `2041-67`  |
| AvatarGroup      | set       | 6        | `2030-63`  |
| Blockquote       | set       | 6        | `2024-18`  |
| ButtonGroup      | set       | 2        | `2028-118` |
| Calendar         | component | —        | `2043-3`   |
| Carousel         | component | —        | `2042-71`  |
| CinematicLink    | set       | 2        | `2040-34`  |
| CircularProgress | set       | 15       | `2029-48`  |
| CommandPalette   | component | —        | `2043-99`  |
| ContextMenu      | component | —        | `2034-7`   |
| DateInput        | component | —        | `2039-3`   |
| DateRangeInput   | component | —        | `2039-37`  |
| DateTimeInput    | component | —        | `2039-23`  |
| DocLinkCard      | set       | 2        | `2044-51`  |
| FileInput        | set       | 4        | `2036-29`  |
| Frame            | set       | 4        | `2038-36`  |
| HeadingStack     | set       | 6        | `2025-21`  |
| HoverCard        | component | —        | `2034-3`   |
| InputGroup       | set       | 3        | `2036-15`  |
| Kbd              | set       | 3        | `2026-9`   |
| Lightbox         | component | —        | `2043-125` |
| MetadataList     | set       | 4        | `2041-47`  |
| MultiSelector    | component | —        | `2042-54`  |
| OverflowList     | component | —        | `2038-16`  |
| SelectableCard   | set       | 2        | `2032-9`   |
| StackedCardRail  | component | —        | `2044-53`  |
| Stepper          | set       | 2        | `2033-50`  |
| Text             | set       | 14       | `2022-31`  |
| TextLockup       | set       | 12       | `2044-39`  |
| TimeInput        | set       | 3        | `2039-21`  |
| Timestamp        | set       | 4        | `2031-11`  |
| Token            | set       | 4        | `2041-61`  |
| ToggleButton     | set       | 12       | `2028-27`  |
| Tokenizer        | set       | 2        | `2042-52`  |
| Toolbar          | component | —        | `2038-3`   |
| TopNav           | component | —        | `2042-3`   |
| TreeList         | component | —        | `2040-3`   |

Drawn earlier, same status: **Icon** (`27-2`, 70 glyphs) and **StatusDot**
(`2003-2`).

## Repair made to an existing component

**Button (`28-138`) — 57 of 84 variants had an unwired `Label` property.** Every
non-neutral tone (danger, success, warning, info) and every Loading state. A
designer could set Tone=danger, type a label, and watch nothing happen. Found
because an AlertDialog footer instance rendered "Button" while its property
value read "Delete". All 84 are wired now; re-audited from scratch rather than
trusting the fix loop.

## Three components whose Figma master deliberately disagrees with the code

These are drawn as INTENDED, and the browser is wrong. A rendered-geometry sweep
(`pnpm check:rendered-geometry`) measured each one.

- **DateTimeInput** — code renders two controls at 0×0, unclickable, and the
  date field is missing the calendar icon its time sibling has. Both trigger
  icons are drawn.
- **StackedCardRail** — code gives the first two cards 168px and 203px to hold
  295px of content, so titles run under the neighbouring card. All cards are a
  uniform 240px here.
- **Tokenizer** — 8 dismiss buttons fall below the WCAG 2.2 AA 24px target. The
  12px glyph is drawn as the code has it; enlarging the hit area is the
  code-side fix.

## Token debt surfaced while drawing

Recorded in each component's Figma description rather than papered over. Binding
a Figma-only variable to make a component _look_ tokenized would manufacture
drift (ADR-025: code is the source of truth, sync is one way).

- **The size axis is raw Tailwind in most components** — `h-8/10/12`,
  `px-2/3/4`, `text-xs/sm/base` have no HDS token behind them. Affects Kbd,
  ToggleButton, InputGroup, TimeInput, Stepper, Toolbar, Carousel and others.
- **`rounded-lg` / `rounded-sm` cannot be bound.** They are
  `calc(var(--role-radius) ± Npx)`, and a Figma variable cannot hold a calc.
  Binding `radius/12` would be a lie: the `brutalist-demo` brand mode sets
  `role/radius` to 0, where `lg` resolves to 4, not 12.
- **Lightbox has no scrim token.** `surface/overlay` is a raised surface, not a
  scrim, so the 80% black is literal. The fix is a scrim token in code.
- **`space/px4` does not exist in Figma** though code references it.
- **ActivityFeed's `info` tone maps to `--semantic-accent-rest`** — an accent,
  not a feedback colour, unlike its four siblings. Worth reconciling in code.
- **Blockquote's whole size axis** is raw Tailwind type scale.

## What Figma structurally cannot hold

Stated in the relevant descriptions so nobody reads these as drift:

- **Motion** — CinematicLink's 500ms masked reveal, CircularProgress's
  `indeterminate` spin, StackedCardRail's 4000px scroll choreography.
- **State selectors** — `:hover`, `:focus-within`, `data-[highlighted]`,
  `has-[input:disabled]`. Where a state is meaningful it is drawn as an explicit
  variant and labelled as such.
- **`tabular-nums`** — Figma has no API for the OpenType feature, so Timestamp's
  digit advance width will differ from the browser.
- **Breakpoints** — already one of the four documented `NOT_IN_FIGMA` exclusions.
