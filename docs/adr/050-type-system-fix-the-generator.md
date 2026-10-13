# ADR-050: Type: fix the generator, then cut the ramp

**Status:** Accepted, retroactive (decided 2026-09-19 to 2026-10-07; recorded 2026-10-13 from commit and PR history). Typeface licensing is a separate decision, see ADR-059.

## Context

hds#283 reported that the smaller type "looks way off". Over 2026-09-19 to 2026-09-24
the commits traced that to several defects in the type tokens, not to taste.

- `primitive.typography.size.5xl` held 80px while `7xl` held 72px, and there was no `6xl`.
  The docs showed "a scale running backwards at the top" (hds#241, closing hds#227).
- Five components wrote `uppercase tracking-wide` where `semantic.typography.eyebrow`
  specifies `letterSpacing.caps` = 0.06em. Tailwind's stock `tracking-wide` is 0.025em,
  "42% of the token".
- Icon sizes pointed at the type ramp. `hds.iconSize.*` and `--hds-icon-*` used
  `typography.size.base/lg/xl`, which happened to read 16/20/24.
- Dead tokens and a hand-authored second ramp (`--hds-font-size-xs/sm/base/lg/xl`,
  11/13/16/20/28 as literal px) existed with no consumers.
- Nothing rendered the scale. Chromatic ran with `exitZeroOnChanges: true`, so it
  "can never fail a PR".

Later, on 2026-10-07, the ramp itself was cut (epic hds#483).

## Decision

- **Renumber, do not swap values.** Old `7xl` (72px) became `5xl`, old `5xl` (80px)
  became `6xl`. `semantic.typography.display` still resolves to 72px; only its alias
  moved. `check-token-structure` gained a monotonicity assertion for t-shirt-named groups.
- **Fix the generator, not the call sites.** `build-tokens.mjs` emitted no `letterSpacing`
  block, so there was no `tracking-caps`. It now emits `letterSpacing` for token names
  Tailwind does not already own, which leaves only `caps`.
- **Icons are geometry.** They were repointed at `primitive.size.16/20/24`, as
  `component.button.size.*.iconSize` already did. This landed before the ramp change so
  the two stayed distinguishable in a diff.
- **Delete the dead ramps.** Removed `size.2xs`, `weight.light`, `weight.semibold`,
  `letterSpacing.tighter/wide/wider` and the second `--hds-font-size-*` ramp, each
  checked unused across hds, ops and concrete. A later commit removed four dangling
  `var()` refs in the hand-maintained bridge and a third copy of the scale in
  `foundations/typography.json`.
- **Add a runtime type specimen** (Ramp, Composites, Rhythm). It reads CSS custom
  properties at runtime and transcribes nothing.
- **Adopt Tailwind 4's default font sizes** (Adrian's decision, 2026-09-26, hds#283,
  commit `d41c65e`). Its ten steps were lifted into `primitive.typography.size.*`
  verbatim (for example base 17 to 16, 5xl 72 to 48, 6xl 80 to 60) and every semantic
  composite was repointed. Display went 72 to 60px, body 17 to 16px, ui 15 to 14px.
  Hardcoded `text-[10px]`, `[11px]` and `[15px]` in three components moved onto the ramp.
- **Cut to six roles** (hds#521, hds#483): display, title, body, ui, caption, mono.
  `h1` to `h3` and `eyebrow` stay as deprecated aliases holding their role's value.
  `check-type-ramp` runs at pre-commit and gates raw sizes, weights, line heights and
  deprecated composites. Its header calls the ramp "Adrian's decision, 2026-10-07".
- **Fonts are opt-in** (hds#479): `dist/fonts.css` plus `dist/fonts/*.woff2`, exported as
  `@hirobius/design-system/fonts.css`. They are no longer base64-embedded in `tokens.css`
  and `styles.css`.

## Alternatives considered

- **Swap the raw values of `5xl` and `7xl`.** Costs the same edit but leaves "the
  bigger-sounding 7xl holding 80px that nothing uses while 5xl is what display actually
  renders".
- **Redefine Tailwind's stock tracking names.** Rejected. Five of the six HDS names are
  also Tailwind's. Changing `tracking-tight` from -0.025em to -0.01em would be "a
  different value under an unchanged name, the hardest kind of change to catch in review".

None other recorded at the time.

## Rationale

The tracking commit puts it directly: "The gap in the generated config was the bypass;
five people independently picked the nearest stock utility, which is what anyone would
do." So the generator was fixed. For icons, the coupling was invisible because the values
matched, and "no gate would have said a word", since `check-css-integrity` only asserts
the bridge matches the token. For the specimen, a ramp change "had nowhere to be looked
at".

## Consequences

- Removing `size.2xs` dropped `hds.fontSize['2xs']` and `text-2xs`, a breaking change on
  a 0.x. Nothing in hds, ops or concrete used them.
- The specimen's first version probed element width, which fails for the unitless
  `lineHeight.none`. The invalid assignment was ignored and a row could report the
  previous row's value. It was replaced with `getComputedStyle` readback.
- A standing contradiction was found and recorded: `check-source-canon` said
  "font-medium for emphasis, never bold" while headings used weight 700.
- The Oct 7 cut found a face mismatch. "Body asked for 400 but only the 500 and 700 faces
  shipped, so body rendered Medium." Satoshi Regular (400) was added. Title was set to
  700 because "Satoshi has no 600 face". An earlier fix had already changed a
  `font-semibold` heading to `font-medium` for the same reason.
- On origin/main, `check-type-ramp.mjs` is in `.husky/pre-commit`, `./fonts.css` is an
  export, and `semantic.typography` has display, title, body, ui, caption and mono, with
  h1 to h3 and eyebrow deprecated. It also has a later `titleSm` (16px, 700), so the ramp
  is no longer exactly six. The commits here do not record that addition.

## Lessons

- When many people reach for the wrong utility, the missing utility is the defect. Fix the
  generator.
- A coupling that works because two numbers coincide breaks silently when one moves. Land
  the decoupling before the change that exposes it.
- A review surface that restates its own numbers is a second opinion. Read computed
  values at runtime.
- Check that each weight in the ramp has a shipped face.

## Evidence

- `9e1634e` fix(tokens): renumber the type scale so it stops inverting at the top (#241)
- `686c8f6` refactor(tokens): icons were sized off the type ramp
- `39ddf43` feat(foundations): a type specimen, because the scale had no review surface
- `36957b7` fix(typography): the missing tracking utility WAS the bypass
- `87afaf0` refactor(tokens): delete six tokens and a second, shadow type ramp
- `955e3e4` fix(specimen): the measurement reproduced the bug the page exists to catch
- `d5efedf` fix(tokens): the deletion left four dangling refs and a third shadow ramp
- `d41c65e` Fleet burndown round 2 (hds), including "standard type ramp — Tailwind 4
  defaults" (#297)
- `14eb027` feat(tokens): cut the type ramp to 5 roles plus mono (#521; hds#483, hds#479)
- `8edd926` feat(tokens): replace Geist Mono with IBM Plex Mono 400 as the code font (#535)
- hds#283: the type issue every Sept commit cites as "Part of #283" (body not read)
