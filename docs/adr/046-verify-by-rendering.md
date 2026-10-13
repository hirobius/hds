# ADR-046: Verify by Rendering, Not by Reading Source

**Status:** Accepted, retroactive (decided 2026-09-23; recorded 2026-10-13 from commit and PR history). Partly superseded by ADR-058 (Storybook, and the rendered-geometry gate with it, was deleted in October).

## Context

On 2026-09-19 `0a0d871` (hds#239) fixed four broken form controls: radio, toggle,
segmented control and alert. Each defect was "measured in headless Chromium before
and after rather than read off source", and the message adds: "the repo's ~60
validators are all textual and every one of them passed on all four." Examples from
the commit: the radio ring was `display: inline`, so its declared width never
applied. The toggle showed a bare 16x16 native checkbox. The segmented control's
active item measured 1.04:1 contrast.

The commit also records that hds#225 had been auto-closed by hds#228, a change that
"never touched radio.tsx at all". The rendered-geometry gate from hds#225's
definition of done was "carried forward as #240 rather than faked".

## Decision

Add gates that open the component in a real browser and read what it painted.

- `5a28439` (hds#278): `check-rendered-geometry` "drives a real browser over all 447
  stories". It reports overflow, clipping, zero-size controls, targets under 24px,
  links with no affordance and misaligned rows. 57 findings were accepted into a
  baseline, fingerprinted "without magnitude".
- `a696a03`: three more finding kinds, `rendered-contrast` (WCAG 1.4.11, 3:1),
  `text-contrast` (1.4.3) and `zero-size-decorative`. They read "the actually-painted,
  composited color a browser produced rather than a declared token pair". The first
  sweep surfaced 239 findings, accepted as existing debt in the baseline.
- `8516609` (hds#282): freeze CSS animations with `addInitScript` before first paint,
  so measurements are the same on every run.
- `07ac0df` (hds#287): clear three finding clusters and add
  `primitive.size.interactive.minCompact` (24px, the WCAG 2.2 AA 2.5.8 floor).

## Alternatives considered

- Screenshots of the UI. The user asked for the opposite in hds#278: "I also don't
  want pictures of the ui, actually render it". The PR keeps screenshots behind
  `--shots` and says "a PNG can't be inspected, themed, or tabbed into".
- Textual gates alone. They passed on all four broken controls, as above.
- Measuring after the page loads, without freezing animation. `8516609` records that
  three sweeps on the same commit gave one transient overflow on a progress story.

## Rationale

- Token and source checks resolve declared values. `a696a03` notes borders at 1.26:1
  "passed check-contrast.mjs because that gate only resolves the token graph".
- Debt is baselined, not blocked, so the gate could land with 57 and then 239
  accepted findings. Baseline entries are removed by hand when fixed, "not a blanket
  --update-baseline", so the fix stays visible (`07ac0df`).
- The gate can be wrong. In `07ac0df`, for Breadcrumb, "not a defect; the gate was
  wrong". The detector took any `<a>` in an `<li>` as prose. It was narrowed, with a
  canary that a prose `<li>` still fires.
- hds#278 also found a flaw in the gate. Run on another design system, three cases
  failed to mount and returned "zero findings ... indistinguishable from a clean
  pass". An `empty-render` detector now catches that.

## Consequences

- The geometry gate did not survive Storybook. `46261310` (hds#590, 2026-10-11)
  deleted the Storybook "axe/deploy/rendered-geometry/component-page scripts and
  their tests", `check-rendered-geometry.mjs`, its library and its baseline. It was
  not moved to the docs demos. No `rendered` or `geometry` entry is in the registry now.
- What replaced it covers less: a test that every docs demo mounts and server-renders
  (hds#590), `check-docs-axe` for accessibility, and the Chromatic docs job.
  Contrast measured on painted pixels and the 24px target check have no gate today.
- `minCompact` is still in `hirobius.tokens.json`.

## Lessons

- A passing textual validator says the source matches a rule. It says nothing about
  what the browser paints. Check the rendered result for layout and contrast.
- A new gate over an old codebase will find debt. Baseline it with a fingerprint that
  ignores magnitude, and delete entries by hand as they are fixed.
- Check the gate for false positives and for silent passes. Both were found in the
  first two weeks (Breadcrumb, `empty-render`).
- A gate tied to one tool leaves with it. When Storybook went, nothing carried the
  geometry checks over.

## Evidence

- `0a0d871` fix(components): radio, toggle, segmented-control and alert render correctly (PR #239)
- `5a28439` feat(docs): a component reference site that renders, and the first gate that reads pixels (PR #278)
- `a696a03` feat(guardrails): add rendered-contrast measurement to check-rendered-geometry
- `a7a4f7d` fix(guardrails): correct firingChannel and label the three new finding kinds
- `8516609` fix(guardrails): freeze animations before measuring rendered geometry (hds#282)
- `07ac0df` fix(guardrails): clear the three remaining rendered-geometry defects (hds#287)
- `46261310` chore: delete Storybook (PR #590)
- hds#225, hds#234, hds#240: the defects and gate requests behind the above
