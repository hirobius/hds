# ADR-040: One Variant Contract (cva Axes) and a Prop-Vocabulary Gate

**Status:** Accepted, retroactive (decided 2026-06-24, formalized 2026-07-07; recorded 2026-10-13 from commit and PR history). Relates to ADR-013 and ADR-014.

## Context

A prop-API audit on 2026-06-24 found the same idea spelled differently across
components. `Alert` called the destructive red `error` while Badge, Card and Callout
said `danger`. `SegmentedControl` sized itself `default` and `compact` off the shared
`sm | md | lg` ramp, and `default` is "a meaningless size name". Styling was also split
between cva (Button) and CSS-in-JS inline style objects.

The split caused real bugs. `Surface theme="dark"` was "a silent no-op": the JS branch
chose between two token refs that pointed at the same context variable, so the
ForcedDark story rendered light (`4732f6b`). `HdsSelect` carried a dead `isDark` branch
of the same kind (`de3f72a`).

## Decision

1. **Converge vocabulary** (2026-06-24): `Alert` `variant` became `tone` and `error`
   became `danger` (`7fd93b4`). `SegmentedControl` size `default` and `compact` became
   `md` and `sm` (`baa8ea9`).
2. **Ship breaking changes with tooling.** jscodeshift codemods (`82fbcf0`) back each
   rename, and a deprecation gate (`269605f`) requires a future `@removeIn`. See ADR-014.
3. **Lock it with a gate.** `check-prop-vocabulary` (`faca044`) fails on `error` as a
   tone and on `default` or `compact` as a size. Exemption: `// vocab-ok: <reason>`.
4. **Converge on cva.** Badge, Surface, Alert and Callout moved to cva with named
   feedback utilities (`9f26204`, `4732f6b`, `4a2f2aa`), following Button.
5. **Write the contract** (hds#91, 2026-07-07), `docs/architecture/variant-contract.md`.
   Four cva axes: `variant`, `tone`, `size`, `density`.
   - `tone` is `neutral | danger | success | warning | info`.
   - `size` is `sm | md | lg`.
   - `density` is `comfortable | compact`.
   - The state matrix lives in Tailwind pseudo-classes inside the cva strings.
   - The gate gained rules C and D and a `--coverage` count.
6. **Migrate the rest** (hds#94, then hds#60 and hds#93). Components that had a
   prop-driven axis in CSS-in-JS moved to Tailwind and cva as a "class-mechanism swap,
   not a value change", each bound to the same `--semantic-*` and `--primitive-*`
   variable. Examples: heading-stack (hds#112) and doc-link-card (hds#115).

## Alternatives considered

- Making `ActivityStatus` follow the tone vocabulary. The gate leaves "domain status
  enums" out of scope. In hds#60, `activity-feed` `status` became `tone` with `error`
  kept as a deprecated alias.
- Converting every component. hds#60 closed with some left off cva on purpose: thin
  wrappers around the cva `Button`, components with no paint axis, and `@tier utility`
  dev-shell chrome.

## Rationale

The commits give one reason for the gate: it "prevents the prop-value vocabulary from
re-drifting after this session's convergence". For cva, the reason is one mechanism
for paint, with states as classes. That removes the runtime branches that caused the
Surface and Select bugs.

## Consequences

- Breaking renames: Alert `variant` to `tone`, SegmentedControl sizes, and Stat and
  Field tone `default` to `neutral`. The latter shipped as a minor (see ADR-041).
- Migrations were checked for pixel parity. hds#60 reports Chromatic "433 tests
  unchanged" for its final four. hds#93 reports cva coverage 36 to 48 of 131.
- Test debt surfaced. `80f20ea` fixed 11 stale Alert, Badge and Surface contract
  assertions that read inline style on class-styled elements. The Alert tests also used
  the wrong props `variant` and `error`, "silently ignored", so they rendered the
  default tone. "The tests escaped typecheck because test files aren't in the typecheck
  config."
- Still in force on origin/main: `check-prop-vocabulary.mjs` enforces tone
  `neutral | danger | success | warning | info` and density `comfortable | compact`.
  `docs/architecture/variant-contract.md` exists.

## Lessons

- Name a concept once. A vocabulary gate costs less than an audit every few months.
- When a behaviour moves from inline style to classes, move the tests in the same
  commit, and typecheck test files so wrong props fail loudly.
- A theme override that compiles but does nothing is a silent failure. Test the
  forced-theme case.
- State what is out of scope for the contract (wrappers, utility-tier chrome), so
  coverage is not chased to 100%.

## Evidence

- `7fd93b4`, `baa8ea9` refactor(components): API-consistency batch; SegmentedControl size
- `82fbcf0` feat(tooling): codemod infra (jscodeshift)
- `faca044` feat(guardrails): add check-prop-vocabulary gate
- `269605f` feat(guardrails): deprecation-lifecycle gate + warnOnce util (#15)
- `9f26204`, `4732f6b`, `4a2f2aa`, `de3f72a`, `047dff4` CVA convergence and dead
  `isDark` branches
- `80f20ea` test(contracts): fix 11 stale Alert/Badge/Surface assertions
- `4420596` Variant contract (#60) Phase 1 (#91); `cca9ba0` Phases 2-4 (#94)
- `157990d` feat(heading-stack) (#112); `4c72ebc` feat(doc-link-card) (#115)
- hds#60: Variant contract: cva axes + complete-states matrix + gate
- hds#93: Migrate CSS-in-JS components to Tailwind classNames
