# ADR-065: HDS motion is lively, not restrained

**Status:** Accepted (Adrian, 2026-10-15). Plan: hds#751. The DESIGN.md rule shipped in #786
(2026-10-17); this record was written on 2026-11-06. The old motion branch called it ADR-064,
a number that soft surfaces now hold.

## Context

DESIGN.md said "Don't make motion playful or bouncy by default" and kept the spring
(`expressive`) for rare teaching moments. Adrian wrote that rule to counter poor default
motion from an older model. It did not describe the brand. The result was a system where
19 interactive components did not animate, and menus and dialogs appeared with no
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
