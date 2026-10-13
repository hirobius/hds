# ADR-049: A neutral accent, and a separate border for controls

**Status:** Accepted, retroactive (decided 2026-09-19; recorded 2026-10-13 from commit and PR history). The neutral accent was later replaced by other defaults (see Consequences). The accent as a per-tenant knob, and the border split, still hold.

## Context

Until 2026-09-19 the accent was blue (`primitive.color.blue.500`, `#1E2EFD`). Two
separate problems came up the same day.

The first was a brand direction. hds#208 repointed "every interactive accent surface —
primary buttons, focus rings, links, hover and selection" from blue to monochrome
neutrals. The commits do not record why Adrian's brand moved that way.

The second was a contrast defect. `semantic.color.border.default` (`neutral.200`) was
1.26:1 on white and was doing two jobs: decorative hairlines and the boundaries of
controls. WCAG 1.4.11 needs 3:1 for the second. Input, Textarea, Select, Combobox and
the secondary Button "carry no fill to make up the difference" (hds#244, closing
hds#230).

## Decision

- **Accent becomes neutral and inverts per theme.** Near-black fill in light, near-white
  in dark, with `content.onAccent` flipping to match. `accent.rest`, `surface.accent` and
  `content.accent` were `neutral.900` light and `neutral.100` dark.
- **`feedback.*` stays coloured.** "Status is not accent, and feedback.info remains
  blue."
- **The accent is a per-tenant knob** that defaults to neutral. Tenant overlays keep
  their coloured fills, so each sets its own `content.onAccent`. The tenant-contrast
  contract now resolves `onAccent` tenant-first, so it tests the effective pair.
- **Controls get their own border token.** `semantic.color.border.interactive` is
  `primitive.color.neutral.500` in both modes (4.74:1 on white, 4.43:1 on black). It
  feeds `role.input`, `component.input.border` and the secondary button border.
  Decorative consumers stay on `border.default`.
- **`check-contrast` gains a non-text 3:1 tier** beside the 4.5:1 text tier, registered
  in the guardrail registry with both proof-of-firing fixtures updated.

## Alternatives considered

None recorded at the time.

## Rationale

For the accent, the PR states one gain and one cost. Contrast improved: `onAccent` over
`surface.accent` went from 7.3:1 to 18.9:1 light and 17.3:1 dark. The cost is "links and
accent text are now the same near-black as body text, so colour alone no longer signals a
link and affordance leans on underline and weight. Inherent to a monochrome accent."

For the border, the commit says one token "was doing two jobs". Decorative consumers
stay on `border.default` and only control boundaries move to the 3:1 token.

## Consequences

- **Documentation drifted for days (hds#272).** `DESIGN.md` still opened with "a single
  electric-blue accent" and `#1E2EFD` while `semantic.accent.rest` resolved to `#111111`.
  `CLAUDE.md` sent every agent to that file first. `check-brand` stayed green because it
  read the brand from the same hardcoded blue primitive as the generators. The accent is
  now read from `semantic.accent.rest` at six sites. The gate is a claim check: it fires
  when a line asserts a hex or hue is the brand while naming another, and does not ban
  blue, which `feedback.info` still uses. Tenant-scoped hues are exempt.
- **The default accent changed twice more in October.** `c88ab39` (hds#571, 2026-10-09)
  set a bright apple green, with `onAccent` dark in both modes. `72800bc` (hds#600,
  2026-10-11) replaced it with graphite, a warm charcoal. Its changeset says graphite
  keeps the "inverts per theme" rule and `onAccent` over accent is 10.5:1 light and
  10.0:1 dark. `77af4b3` (hds#607) synced the Figma library to match. A mauve scale
  (`primitive.color.mauve`) was added but its changeset says nothing maps to it.
- **What holds on origin/main today.** The accent is `semantic.accent.rest`, currently
  `graphite.700`, and `DESIGN.md` calls it "a per-tenant knob, not a fixed hue (#208)"
  and says to "read the token, never assume a hue". It still inverts per theme and
  `feedback.*` stays coloured. `border.interactive` is still `neutral.500` in both
  modes, and `check-contrast` still has the non-text tier. The monochrome neutral
  accent itself, and its 18.9:1 figure, no longer apply.

## Lessons

- A gate that sources its expected value from the thing it checks cannot see drift in it.
- Read a brand value from one token, resolved by the same function that builds the CSS.
- A colour that carries meaning cannot be removed without naming what replaces it. Here
  the replacement was underline and weight, and the PR said so.
- One border token should not serve both decoration and control boundaries.

## Evidence

- `a21662a` feat(tokens): neutralize the accent system, blue to monochrome neutrals (#208)
- `ddc81fc` fix(brand): the accent is a token, not a hardcoded blue in six places (#272)
- `43a78f1` fix(tokens): split border.interactive from border.default for WCAG 1.4.11
  (#244, closes hds#230)
- `c88ab39` feat(brand): bright apple green accent (#571)
- `72800bc` feat(brand): graphite accent, working font dial (#600)
- `77af4b3` chore(figma): sync graphite + mauve to the library (#607)
