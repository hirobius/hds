# ADR-055: Test accessibility by behavior: axe in CI, keyboard and screen-reader suites

**Status:** Accepted, retroactive (decided 2026-09-30; recorded 2026-10-13 from commit and PR history). Partly superseded by `742408e` and `4626131` (the axe gate moved from Storybook to the docs-site demos).

## Context

By 2026-09-29 the accessibility claims in the repo rested on tools nobody ran. The
commit that added the axe gate says why: "The addon-a11y panel needs a human to open it
and ci.yml never ran axe, so serious failures shipped unnoticed." The keyboard commit
says "None of the 168 test files drove a component with a keyboard, so the Radix
wrappers were trusted rather than tested." The README also claimed visual review in
Chromatic, which "diffs nothing today" (`9868e5d`).

The screen-reader commit adds a third gap: "Nothing asserted what the accessibility
tree reads: coverage was attribute-level". The first axe sweep also found a defect that
no attribute test could have caught. The focus ring was gated on
`html[data-input-modality=keyboard]`, "which nothing sets in Storybook or consumer
apps, so keyboard focus never showed" (`0b32d55`).

## Decision

Check accessibility by what the product does, with gates that run automatically.

- **axe in CI.** `scripts/check-storybook-axe.mjs` scanned every story in light and dark
  (wcag2a/2aa/21aa/22aa) and failed on serious or critical violations (`7b3f237`,
  hds#310). `170548c` wired it into `ci.yml` (hds#347).
- **An allowlist that cannot rot.** Known failures live in an allowlist, and an entry
  that matches nothing also fails the gate.
- **Keyboard contract suite** (`d912c00`, hds#312). A table-driven suite drives ten
  primitives (Dialog, AlertDialog, Popover, Menu, ContextMenu, HoverCard, Select,
  Tooltip, Combobox, MultiSelector) with `user-event`: open from keyboard, Escape and
  focus return, Tab trapping, arrow keys, typeahead, `aria-expanded` wiring.
- **Screen-reader contract suite** (`8bf13a6`, hds#376). It uses
  `@guidepup/virtual-screen-reader` under jsdom and asserts on the spoken phrases for
  Dialog, Menu, Select, Combobox, Table and Alert. It runs in `pnpm test`.
- **Known defects are pinned, not hidden.** A failing behavior is recorded as
  `test.fails` with the issue number. When fixed (`c148051`, hds#398, hds#399) the test
  flips to a plain `it()` first, "Red on purpose", then the fix lands.
- **Docs say only what is checked.** `9868e5d` removed the Chromatic claim and listed
  only real checks. `8bf13a6` made an honesty test run `check-focus-states` and fail if
  the README contradicts it.

## Alternatives considered

None recorded at the time.

## Rationale

- Gates that need a human to open a panel do not run. The axe commit moved the check
  into CI.
- Attribute checks pass while behavior is broken. The ring gated on an attribute that
  nothing set looked correct in CSS. The fix made the ring unconditional on
  `:focus-visible`, with tests that fail if an input-modality gate returns.
- A stale allowlist hides progress. The first scan of main "matched only 9 of 183
  entries; #307 and #331 fixed the other 174", and the gate failing on stale entries
  forced the prune (`170548c`).
- The suites state their limit. The screen-reader suite "reads the jsdom accessibility
  tree, not a real desktop or mobile screen-reader".

## Consequences

- `786e7e2` (hds#349) fixed the last nine allowlisted failures. They were story code,
  not tokens, and the allowlist became empty.
- `0b32d55` (hds#311) fixed axe findings across 14 components, and `c148051` named the
  open Select listbox and Combobox popover.
- The screen-reader suite was flaky once. Its Alert case raced a live-region
  announcement and failed 3 of 3 runs on one shuffle seed, until it waited with
  `waitFor`.
- Storybook is gone (`4626131`, PR #590). `742408e` (PR #584) had already added
  `scripts/check-docs-axe.mjs`, which scans every `/docs/components` and
  `/docs/patterns` demo in light and dark. It runs in `ci.yml`, with a passing and a
  violating fixture, and `scripts/docs-axe-allowlist.json` is empty.
- On origin/main the keyboard and screen-reader suites remain under
  `tests/primitive-contracts/`. No `test.fails` pins remain there.

## Lessons

- A check that depends on someone opening a tool is not a gate. Put it in CI.
- Test the behavior a user hits (keys pressed, phrases spoken), not only the attributes
  that should produce it.
- Make allowlists fail when they go stale, or they become the place defects hide.
- Pin a known defect as an expected failure with an issue link, so the fix has a red
  test to turn green.

## Evidence

- `7b3f237` feat(a11y): Storybook axe gate scanning every story light and dark (PR #327, hds#310)
- `0b32d55` fix(a11y): axe sweep fixes across 14 components (PR #331, hds#311)
- `d912c00` test(primitives): keyboard contract suite for overlay and listbox primitives (PR #324, hds#312)
- `9868e5d` docs(readme): front door with badges, live Storybook, dial screenshot, honest a11y (PR #328)
- `170548c` ci(workflow): axe gate in CI, size-budget wiring, pruned allowlist (PR #348)
- `786e7e2` fix(stories): clear the nine allowlisted axe failures (PR #366)
- `8bf13a6` test(a11y): screen-reader contract suite for six primitives (PR #400)
- `c148051` fix(a11y): name the open Select listbox and Combobox popover (PR #409)
- `742408e` feat(gates): accessibility and visual checks run on the docs site (PR #584)
- `4626131` chore: delete Storybook (PR #590)
