# ADR-015: Scope Interaction-State Sharing to Single-Element Primitives

**Status:** Accepted (2026-06-26)

## Context

An architecture review of `src/app/components` flagged that four primitives each
hand-roll a hover/press/focus state machine layered over the demo-state freeze
(`useFrozenState`): `HdsToggle` and `HdsRadio` (`controls.tsx`), `SegmentedControl`,
and `NavItem`. The review's headline recommendation was a single `useInteractionState`
hook adopted by all four to "remove the duplication."

Grilling that recommendation against the actual code showed the four machines are
**not** the same machine wearing four hats — they differ on axes a shared hook would
have to absorb as parameters:

- **State vocabulary.** Toggle/Radio resolve to `rest · hover · focused · pressed ·
disabled`. NavItem resolves to a different enum — `default · hover · focus · active ·
pressed · disabled` — with an `active` (current-route) state that has _priority over_
  hover/focus, and it normalizes the demo-state token `focused → focus`.
- **Cardinality.** Toggle/Radio track one element, so booleans (`hovered`, `pressed`,
  `focused`) suffice. SegmentedControl tracks _which segment_ is hovered/focused, so it
  holds `hoveredValue / focusedValue: string | null` and gates every visual on
  `=== option.value`. A boolean hook cannot express "segment 3 is hovered."
- **Focus model.** Toggle/Radio treat any focus as `focused`. NavItem and `side-nav.tsx`
  instead compute **focus-visible** from input modality
  (`:focus-visible` + `document.documentElement.dataset.inputModality === 'keyboard'`)
  so a mouse click doesn't paint a focus ring.

A hook that served all four would need `disabled`, `frozenState`, a cardinality key, an
enum remap, an `active`-priority flag, and a focus-visible toggle — an
over-parameterized shallow module whose interface is as complex as the code it replaces.
That is the opposite of the depth the review was chasing.

What _is_ genuine duplication, after the `HdsToggle` disabled-bug fix (71f453f) aligned
its machine with `HdsRadio`'s, is the **single-element** machine those two now share
verbatim, and the **focus-visible-from-modality** snippet duplicated between `NavItem`
and `side-nav.tsx`.

## Decision

Extract two narrow, separately-justified seams; do **not** build a four-way mega-hook.

1. **`useInteractionState({ disabled, frozenState })`** — owns the single-element
   `rest · hover · focused · pressed · disabled` machine and returns
   `{ visualState, isHover, isFocused, isPressed, isDisabled, handlers }`. Adopted by
   **`HdsToggle` and `HdsRadio` only**. The hook takes `frozenState` as a parameter (the
   component still calls `useFrozenState()`) so it stays a pure, context-free state
   machine that is unit-tested directly with `renderHook` — same testability rationale as
   the `hds-search` extraction (ADR-011).

2. **`useFocusVisible()`** — owns the modality-aware focus-visible detection and returns
   `{ isFocusVisible, onFocus(target), clearFocusVisible() }`. Adopted by **`NavItem`**
   now; `side-nav.tsx` is a ready second consumer. The component keeps wiring it into its
   own machine.

**Explicitly out of scope** (these primitives keep their own deeper machines):

- **`SegmentedControl`** — its per-segment `string | null` cardinality is not expressible
  in the boolean hook and must not be flattened into one.
- **`NavItem`'s** `active`-priority enum and `focus → focus` remap stay in `NavItem`; only
  the focus-visible sub-seam is shared via `useFocusVisible`.

## Rationale

- **Depth, not parameter count.** Ousterhout's test for a good module is a simple
  interface hiding real complexity. `useInteractionState` clears it for Toggle/Radio
  (two args in, derived state out, the boolean bookkeeping hidden). A four-way variant
  fails it — every divergence becomes a flag, and the caller must understand all of them.
- **The duplication that's left is real and verbatim.** Toggle and Radio run byte-identical
  resolution logic after 71f453f; that is worth one hook. NavItem/side-nav repeat the same
  five-line modality dance; that is worth the other.
- **Cardinality and priority are structure, not noise.** SegmentedControl's segment keys
  and NavItem's `active`-over-everything ordering encode genuine behavioral differences.
  Collapsing them into a shared hook would relocate complexity into the interface (the
  "deletion test" failure mode), not remove it.

## Consequences

- Two small hooks land under `src/app/hooks/`, each with a focused unit test; Toggle/Radio
  and NavItem shed their inline bookkeeping without changing rendered behavior.
- `SegmentedControl` and `NavItem`'s core machines are deliberately left alone. Re-opening
  toward a universal interaction hook requires new evidence that the cardinality/priority/
  focus-model differences have actually converged — not just that "there are still four
  state machines."
- `side-nav.tsx` should migrate to `useFocusVisible` opportunistically to retire its
  duplicate copy; it is not blocked on this ADR.
