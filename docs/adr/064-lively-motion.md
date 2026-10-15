# ADR-064: HDS motion is lively, not restrained

**Status:** Accepted (Adrian, 2026-10-15). Plan: hds#751.

## Context

DESIGN.md said "Don't make motion playful or bouncy by default" and kept the spring
(`expressive`) for rare teaching moments. Adrian wrote that rule to counter poor default
motion from an older model, not as a statement of the brand. The result is a system
where 19 interactive components opt out of motion and menus and dialogs appear with no
transition. He wants HDS and the apps to feel lively, with many more micro-interactions.

## Decision

- The bar is "effective and intentional", not "restrained". Springs, settles and small
  overshoots are welcome on arrivals, confirmations and state changes.
- Motion that delays the user, loops for no reason, or moves something the user did not
  act on stays out.
- Press feedback still uses colour, border and contrast, not a scale transform.
- Every motion comes from tokens and named recipes and has a reduced-motion version
  (the existing reduced-motion gate).
- The engine stays Motion plus native CSS (ADR-021).

## Consequences

The DESIGN.md "Don't" rule on bounce is replaced. The motion tokens grow (springs,
stagger, enter scale, blur; hds#751), and components gain enter, exit and state motion
one recipe at a time. The `motion-ok` exemptions are retired as each component gets
its recipe.
