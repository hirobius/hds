# ADR-030: Tone Precedence Without the Important Modifier

**Status:** Accepted (2026-09-30)

## Context

Button and Card each have two colour axes in one `cva()` call: `variant` (the
component's structural treatment) and `tone` (the fixed feedback vocabulary of
the variant contract, `docs/architecture/variant-contract.md`). When both are
set, the tone has to win.

PR #41 (0.9.0) made Button's tone win with Tailwind's important modifier, a
`!` written in front of each tone utility, after any variant prefix:
`border-transparent`, `bg-feedback-bg-<tone>`, `text-feedback-<tone>`,
`hover:brightness-95` and `dark:hover:brightness-110`. Card copied the pattern
in PR #94 for its tone's `border` width and feedback border colour, citing
Button as precedent. No ADR recorded the choice, and ADR-016 names "no
`!important`" as a principle. An external review (2026-09-30, hds#372) flagged
the modifier as a token-governance smell.

The `!` was not needed for the base colours. `cn` is `twMerge(clsx(…))`, cva
emits variant classes before tone classes, and tailwind-merge keeps only the
last class in each group, so a later `bg-feedback-bg-danger` already replaces
`bg-primary`. The one real reason was the hover state: Button's variants set
`hover:bg-primary/90`, `hover:bg-accent` and `hover:border-ring`, and the tone
string set no hover fill or hover border, so without `!` those variant hover
classes leaked through and a toned button changed colour on hover.

The modifier also had a side effect. tailwind-merge files an important
utility in a different group from the plain one, so a consumer `className`
could override a variant colour but not a tone colour, which contradicts the
escape-hatch model in `docs/rules/REACT_COMPONENTS.md` (className is the
sanctioned override).

## Decision

Tone beats variant by **class-group replacement in `cn`**, not by `!important`.

- A tone string sets **every class group the variants set**, including the
  state groups. Button's status tones are
  `border-transparent bg-feedback-bg-<tone> text-feedback-<tone> hover:bg-feedback-bg-<tone> hover:border-transparent hover:brightness-95 dark:hover:brightness-110`;
  Card's are `border` plus the feedback border colour, danger's being
  `border border-[var(--semantic-color-feedback-error)]`. A new variant
  that sets a new group (say `active:bg-*`) needs the matching group in every
  tone string.
- **No `!` in cva strings.** `tests/no-important-modifier.test.ts` scans the
  string literals in `src/app/components/*.tsx` for an important-modified
  utility in either form: a `!` opening the utility, alone or after variants
  (Tailwind v3's form), or v4's `!` closing the class. Its `ALLOWED` list is
  empty.
- **cva output is only ever rendered through `cn`.** Without tailwind-merge
  both the variant and the tone class reach the DOM and CSS source order picks
  the winner. `buttonVariants` and `cardVariants` stay `@internal`, and both
  components pass their cva output through `cn`.
- **A consumer `className` overrides tone the same way it overrides variant.**
  cva appends `className` last, so it wins its group.
- No `compoundVariants` for tone. Button's compound list stays the three
  `iconOnly` sizes.

## Rationale

- Precedence then lives in one mechanism (tailwind-merge) that every other
  className override in the system already relies on, rather than in CSS
  specificity that tailwind-merge cannot see.
- Rendered CSS is unchanged: each state resolves to the same colour as before,
  and Card's `border` replaces `accent`'s `border-2`, giving the same 1px
  feedback border the important `border` gave.
- The contract tests in `tests/primitive-contracts/` pin all 12 Button
  variant x tone combos and Card's accent + danger combo at the class level,
  and the `ToneMatrix` story puts every Button combo in front of the axe gate
  and the Chromatic modes matrix.

## Consequences

- A consumer can now recolour a toned Button or Card through `className`. This
  is the documented escape hatch, the same power they already had over
  variants; no in-repo or known consumer passes a colour `className` to a toned
  Button or Card.
- Adding a state group to a variant without adding it to every tone string
  lets the variant's state colour leak into toned buttons. The Button contract
  test reads each variant's classes off `buttonVariants` rather than a list of
  its own, so the variant x tone combos go red as soon as a variant gains a
  group that the tone strings do not replace.
- Rendering `buttonVariants(...)` or `cardVariants(...)` without `cn` would
  break tone precedence. Both helpers are `@internal` for that reason.
- The published CSS carries no important utility rule, and keeping it that way
  reaches past `src/`. Tailwind v4's automatic source detection reads every
  file the repo does not .gitignore, tests and docs included, so an
  important-modified class written literally in a test fixture or a doc
  example (this ADR's included) compiles into `dist/styles.css` as an
  `!important` rule that nothing renders. The same test's last case scans
  test and doc text for such a token. Fixtures add the `!` at run time, and
  docs name the modifier apart from the class, as this ADR does.
