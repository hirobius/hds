---
name: visual-fix
description: Visual bug fix in HDS or a consumer app (Roleforge/job-hunt, ops), at the root and guarded. Use when a screen looks wrong or a visual bug returns.
---

**v0, meant to be tuned.** Each time you run it, append one line to the Tuning log at the bottom: what helped, or what was missing.

The Figma "delight" screens came out clean because every element sat on a rule; the apps grew ugly one patch at a time. This skill makes each fix a rule, applied at the lowest layer and guarded. Five steps, in order.

## 1. See

Screenshot every affected route at **390 and 1440, light and dark**: four captures per route. Use the repo's gallery where one exists (job-hunt: `npm run gallery`); otherwise the capture script in `.claude/skills/design-review/SKILL.md` (set the widths to 390 and 1440). Read every image. Keep these files: they are the "before" for step 5.

**Done** when every affected route has all four captures and you have looked at each one. A fix planned from reading code alone has skipped this step.

## 2. Name the rule

State which design rule the pixels break, in one line per finding:

- **scale**: spacing off the token scale.
- **nesting**: inner padding larger than the outer gap around the box.
- **meta**: more than two meta items on one line.
- **rhythm**: cards in one row or list with mixed heights.
- **decoration**: status dots or coloured accent bars (status is implied by content, hds#759).
- **hierarchy**: the title is not the dominant element, or there is more than one primary action.
- **placement**: a hand-placed box (margins, offsets) where a Stack, Grid or gap belongs.
- **raw**: raw px or letter-spacing instead of a token.
- **base**: a responsive map with no base value, so the layout disappears below the first breakpoint (hds#652; use `base` in Box `sx`).

If no rule covers it, write the rule you would add, in the same one-line shape, and put it in the PR for Adrian.

**Done** when every visible defect maps to a named rule.

## 3. Fix at the lowest layer

Walk down the ladder and stop at the first layer that owns the defect: **token → component → pattern → page**.

- A defect seen on two or more pages lives below the page. Fix it there once.
- HDS before the app: when the cause is an HDS token or component, fix HDS and let the app pick it up. Patch the app only for app-owned markup, and file an HDS issue for any shim you leave behind.
- Delete before you add: removing a wrapper, an override or a one-off class is the preferred fix. Count lines: a good visual fix is often net negative.

**Done** when the fix sits at the lowest layer that owns it, and no page-level override remains for that defect.

## 4. Guard

Add a check that goes red if the defect comes back: a lint rule, a unit test, a layout test (`test:layout` where the repo has one; in HDS the docs site plus Chromatic is the visual surface), an axe rule, or a layout-shift assertion. Prove it: run the check on the broken code first and watch it fail, then on the fix and watch it pass.

Model it on the existing guards: job-hunt's F1/F3/F4 layout guards (in that repo; they are not in HDS), and in HDS `check-no-status-clutter` (decoration), `check-layout-discipline` (placement, raw), `check-hardcoded-spacing` (scale).

Register it where the repo lists guardrails. In HDS: an entry in `docs/guardrails/registry.json` with its `firingChannel` (field reference: `docs/guardrails/SCHEMA.md`) and a `passing` plus a `violating` example under `fixtures/<check-id>/`. In a consumer repo, follow that repo's guardrail list.

**Done** when the check was seen red on the bug, green on the fix, and is registered.

## 5. Prove

Re-shoot the same captures from step 1, same routes, widths and themes. Put before and after side by side in the PR body (the `/pr` skill's Evidence section), with the rule name from step 2 beside each pair.

**Done** when every "before" capture has its "after" in the PR body.

## Anti-patterns

- **One-page patch**: the reported page is fixed while the defect lives on in the component, so the next page shows it again. Fix the component.
- **Raised budget**: a size, layout-shift or snapshot threshold lifted to get green. Keep the budget; fix the cause or report it.
- **Magic px**: a hand-tuned `13px` or `-2px` offset that makes one capture look right. Use a token, a gap or a layout primitive.

## When not to use it

- A one-off content or copy change with no rule behind it.
- Scoring a screen without fixing it: use `/design-review`.
- A functional bug that happens to show on screen (wrong data, a crash): use `/diagnosing-bugs`.
- New visual design from scratch: start from `DESIGN.md` and the Figma library.

## Tuning log

One dated line per run: what helped, or what was missing. Newest last.

- 2026-10-17: v0 written from Adrian's process notes; not yet run on a real bug.
