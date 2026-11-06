# ADR-065: HDS motion is lively, not restrained

**Status:** Accepted, retroactive (decided 2026-10-17, when #786 landed Adrian's 2026-10-15 call in hds#751; recorded 2026-11-06 from commit and PR history). The old motion branch called it ADR-064, a number that soft surfaces now hold.

## Context

DESIGN.md said "Don't make motion playful or bouncy by default" and kept the spring
(`expressive`) for rare teaching moments. Adrian wrote that rule to counter poor default
motion from an older model. It did not describe the brand. The result was a system where
19 interactive components carried a `motion-ok` exemption and did not animate, and menus and dialogs appeared with no
transition. He wants HDS and the apps to feel lively, with many more micro-interactions.

## Decision

- The bar is "effective and intentional", not "restrained". Springs, settles and small
  overshoots are welcome on arrivals, confirmations and state changes.
- Motion that delays the user, loops for no reason, or moves something the user did not act
  on stays out.
- A small press transform (such as a `whileTap` scale) is welcome where it adds delight
  (#786). Under reduced motion the transform goes, and the colour and state change stay.
- Every motion comes from tokens and named recipes, and has a reduced-motion version that
  the reduced-motion gate checks.
- The engine stays Motion plus native CSS (ADR-021).

## Consequences

- The DESIGN.md "Don't" rule on bounce is replaced (#786).
- The motion tokens grow: springs, stagger, enter scale, blur and travel (hds#751). The
  bundle budgets do not grow with them (ADR-054).
- Components gain enter, exit and state motion one recipe at a time, and each `motion-ok`
  exemption goes when its component gets a recipe.

## Evidence

- 19 components: `git grep -l motion-ok 78ad4097 -- src/app/components` on main at 2026-10-15
  lists 19 files (alert-dialog, asset-img, button, checkbox, combobox, destructive-section,
  form, inline-code, inline-link, input, menu, pagination, popover, radio,
  segmented-control, select, textarea, toast, toggle). The hds#751 comment of 2026-11-01
  agrees: #1052 retired 3 and "~16" remained.
- Adrian's intent ("lively", and that the old rule countered an older model's defaults)
  is from the hds#751 body. The record keeps his decisions as the issue states them, not
  his own words.
- hds#751: Adrian's decisions of 2026-10-15, item 1: "HDS should feel lively. Replace the 'no bouncy motion by default' rule with 'motion must look effective and intentional'; record it in an ADR."
- `4645fbc0` docs(design): allow delightful motion and press scale (PR #786, 2026-10-17): the DESIGN.md rule this record describes.
- `40980006` docs(adr): ADR-064, HDS motion is lively, on `claude/design-evolution-pipeline-v0vi13` (not merged): the first draft. Its "press feedback stays colour" line was dropped, because #786 allows a press transform.
