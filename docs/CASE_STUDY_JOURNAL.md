# Case Study Journal

Dev Notes for autonomous visual fixes and self-heals, required by
`docs/rules/REACT_COMPONENTS.md` → **Automated Auto-Journaling**: "Every
autonomous visual fix or self-heal must append a timestamped Dev Note to
`docs/CASE_STUDY_JOURNAL.md` describing the layout drift and how it was
reconciled."

The rule predates the file. It was written, nothing created the target, and
every fix since has satisfied it vacuously — the same fail-open shape as
`empty-render` and the `play()` grep. Creating the file does not close that
hole; nothing yet checks that a visual fix added an entry. Newest entry last.

---

## 2026-09-24 — the calendar button was being annihilated by flexbox

**Components:** `src/app/components/date-time-input.tsx`, `src/app/components/date-input.tsx`

**Drift.** `check-rendered-geometry` reported the date-time-input's calendar
trigger as a `zero-size-control`: measured **0 × 16**. A control with zero width
is not small, it is unclickable — the icon painted, but the button's box had no
horizontal extent to hit.

**Root cause.** Three things had to line up, and none of them is wrong alone:

1. `src/styles/index.css:30-37` gives every `svg.lucide` `max-width: 100%`. That
   is correct for containment, but it means the icon contributes **nothing** to
   its parent's min-content width — it will shrink to zero rather than hold the
   button open.
2. The trigger is a bare `<button>` (not the `Button` primitive), so it carries
   flexbox's default `flex-shrink: 1` and no `shrink-0`.
3. Its sibling `<input type="datetime-local">` has an _unshrinkable_ automatic
   minimum width — measured **187px** — because it had no `min-w-0`.

So the row was over-budget, the input refused to give ground, and the only
flexible thing left was the button. It shrank all the way to zero.

**Reconciliation.** Two utility classes, no shared CSS touched:

- `min-w-0` **appended** to the input's className — lets it yield.
- `shrink-0` **appended** to the button's className — stops it yielding.

Fixed at the two call sites rather than in `index.css`, because that rule is
systemwide and correct; only these two components declare a bare icon-only
`<button>` outside the `Button` primitive. `input-group.tsx` already does both.

**Appended, not prepended — deliberately.** `fingerprint()` in
`scripts/lib/rendered-geometry.mjs` keys a baseline entry on a selector built
from the element's **first three class names**. Prepending would have retired the
existing baseline entry and raised a brand-new one in the same commit, which
reads as "one finding fixed, one finding appeared" instead of "this finding
changed severity". Appending keeps the identity stable so the baseline diff is
legible.

**Measured after.** Button 0 × 16 → **16 × 16**. Input 187px → **171px**. The
two baseline entries converted `zero-size-control` → `small-target`, and the
repo now has **zero** `zero-size-control` entries — down from two.

**Still open.** 16 × 16 is under the 24px WCAG 2.2 AA target size, so the
entries are `small-target`, not gone. That is tracked with the rest of the
target-size work in hds#287, where the spacing exception (§2.5.8) cuts 32
findings to 5.
