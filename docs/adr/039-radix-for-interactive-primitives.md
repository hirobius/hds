# ADR-039: Rebase Hand-Rolled Interactive Primitives on Radix

**Status:** Accepted, retroactive (decided 2026-06-27; recorded 2026-10-13 from commit and PR history). Related: ADR-008 (slot vocabulary aligned to Radix).

## Context

On 2026-06-27 an accessibility pass found four interactive components that built
their own focus and keyboard behaviour, each with gaps:

- The image lightbox had `role="dialog"` and `aria-modal` but no focus trap and no
  focus restore on close. Tab left the dialog into the page behind. The commit calls
  these "hard WCAG 2.4.3 / 2.1.2 failures".
- `HdsSelect` was a hand-rolled combobox and listbox. Radix "owns the listbox a11y
  contract that the hand-rolled version only half-implemented".
- `ThemeToggle` hand-rolled a menu with manual focus restore on top of `useDropdown`.
- `SegmentedControl` was a group of `aria-pressed` buttons "with no arrow-key roving
  focus".

## Decision

Replace the hand-rolled behaviour with Radix primitives and keep each component's
public interface and visual design.

- Lightbox: raw `@radix-ui/react-dialog` (`c1e20a7`). Radix owns focus trap, focus
  restore, Escape and scroll lock. Motion is kept with `forceMount`, `AnimatePresence`
  and `asChild`.
- HdsSelect: `@radix-ui/react-select` (`aba25ea`). "Public SelectProps interface is
  unchanged."
- ThemeToggle: `@radix-ui/react-dropdown-menu` with RadioGroup and RadioItem
  (`592c144`).
- SegmentedControl: `@radix-ui/react-toggle-group`, `type="single"`, items via
  `asChild` (`0e7c12b`). Items become `role="radio"` inside a `radiogroup`. A deselect
  guard keeps one item always selected.
- Where Radix was not proportionate, fix the gap natively: a real `<button>` plus
  `inert` on the faded bio for the profile zoom (`145da5d`), and a focus-return guard
  on collapse for Disclosure and CodeBlock (`d4a0ecb`).

## Alternatives considered

- A shared `useDropdown` hook for outside-click and Escape dismissal, extracted in
  `8fbe2ae` as a "behavior-preserving" seam for HdsSelect and ThemeToggle. It was
  deleted the same day in `592c144`, once both consumers moved to Radix: "the
  abstraction is dead, per the campaign plan."
- The card `Dialog` wrapper for the lightbox. Rejected because it is "a centered card
  unsuited to a full-bleed viewer".
- A Radix Dialog for the profile zoom. Rejected as not proportionate; it is "a
  lightweight inline overlay".

## Rationale

The accessibility contract for dialogs, listboxes, menus and radio groups is large
and easy to get half right. Radix implements it and is already used elsewhere in
the repo. The commits list what Radix added: managed focus, active-descendant,
typeahead, collision-aware positioning, focus restore and dismissal.

## Consequences

- Some motion was dropped on purpose: the per-item select stagger and the menu panel
  slide, "consistent with the repo's animation-free Radix surfaces".
- Markup semantics changed for SegmentedControl: `aria-pressed` buttons became
  `radio` items, and its contract test was rewritten.
- The lightbox gained five tests; it "previously had zero coverage".
- The hook cost an extra commit, then a deletion. Six `renderHook` tests went with it.
- Still in force on origin/main: `package.json` depends on `react-select`,
  `react-dropdown-menu`, `react-dialog` and `react-toggle-group`, and `select.tsx`
  and `segmented-control.tsx` import them. No lightbox or theme-toggle file
  exists on origin/main any more (the commits do not record when they were removed),
  and `useDropdown` is gone.

## Lessons

- Do not hand-roll focus management for dialogs, menus or listboxes. Start from the
  primitive that owns the contract.
- Keep the prop interface fixed during a rebase, so consumers do not change.
- A shared hook built for two hand-rolled components dies when both move to a
  primitive. Check for that before extracting one.

## Evidence

- `c1e20a7` refactor(image-lightbox): rebase on Radix Dialog (focus trap + restore)
- `aba25ea` refactor(controls): rebase HdsSelect on Radix Select
- `592c144` refactor(theme-toggle): rebase on Radix DropdownMenu; delete useDropdown
- `0e7c12b` refactor(segmented-control): rebase on Radix ToggleGroup
- `8fbe2ae` refactor(controls): extract useDropdown dismissal seam
- `145da5d` fix(info-page): native button + inert containment for the profile zoom (#5)
- `d4a0ecb` fix(disclosure,code-block): restore focus to trigger on collapse (#6)
