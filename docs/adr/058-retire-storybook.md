# ADR-058: Retire Storybook; the docs site is the one surface

**Status:** Accepted, retroactive (decided 2026-10-11; recorded 2026-10-13 from commit and PR history). Partly supersedes ADR-042 (the Storybook-as-visual-surface part).

## Context

ADR-018 cut the old docs SPA down to Storybook, and ADR-042 put visual coverage on
Storybook and Chromatic. By October there were two sites. hds#506 (2026-10-06) says
"HDS is moving off Storybook to one Fumadocs site (chosen 2026-09-25 over Nextra;
both POCs on `claude/docs-poc-fumadocs` and `claude/docs-poc-nextra`)". It lists the
decisions as Adrian's: "Fumadocs (Next.js), single docs surface. Nextra explored and
dropped" and "Storybook retires only after docs parity."

The Fumadocs build started in October. The MDX content model landed on 2026-10-04
(`22c55b9`, hds#490), with the `check-docs` MDX guardrail the same day (`cf4e53b`,
`9995c4e`). The site's first slice landed on 2026-10-07 (`c7c844a`, PR #516).

Both Vercel projects, Storybook and the docs site, built on every push. `a35fef3`
says: "Build CPU minutes were half of the fleet's Vercel bill."

## Decision

Make the docs site the one visual and documentation surface, in three steps, then
delete Storybook.

- **Step 1** (PR #579, #581): the README, CONSUMING and design links point at the
  docs site. The docs build also serves the llms files, manifest, DESIGN.md,
  `component-api.json` and the Figma Sync plugin bundle. The plugin prefers `docsUrl`.
- **Step 2** (PR #584, #586, #587): `check-docs-axe` and a Chromatic lane (a
  Playwright spec over the docs demos) replace the Storybook gates. The old
  Storybook address 308-redirects to the docs site. The manifest field `docsPage`
  replaces `storyFiles` and `storyIds`. `hds:new` registers a docs demo instead of
  a story.
- **Step 3** (PR #590): delete `src/stories`, `.storybook`, the Storybook scripts,
  CI jobs, devDependencies and `storybookUrl`. PR #590 quotes Adrian: "it's gone,
  retired."

## Alternatives considered

- Nextra for the docs site. Dropped after a proof of concept (hds#506), with no
  reason recorded.
- Keep Storybook alongside the docs site. The hds#506 rule was "Storybook retires
  only after docs parity", so the two ran together only during the migration.

## Rationale

The only cost reason on record is `a35fef3`: build minutes. The same commit also added
`scripts/vercel-ignore-build.mjs`, which skips preview builds and notes-only
production builds. The commits and issues do not record a reason beyond cost for
moving off Storybook. hds#506 states the goal as a "single docs surface" and does not
say what was wrong with Storybook.

## Consequences

- Still in force on origin/main. `.storybook` and the root `vercel.json` are gone,
  `docs-site/` exists, and `figma/links.json` has `docsUrl` and no `storybookUrl`.
- Per-story render and SSR gates (682 tests) were replaced by the same two checks over
  the 52 docs demos (105 tests). PR #590 reports the total test count falling from
  5500 to 4680.
- CLAUDE.md now names the docs site, with `check-docs-axe` and the Chromatic docs job,
  as the visual verification surface.
- A first production build of the docs site failed (`04e6d09`). `docs:publish` copied
  `public/hds-manifest-agent.json`, which "is generated, not committed", so a clean
  Vercel checkout had none. The build now generates it first.
- The paused Storybook Vercel project still needed disconnecting from Git in Vercel,
  which PR #590 assigned to Adrian. The commits do not show it done.
- The lockfile still holds a transitive `storybook` through `@chromatic-com/playwright`.

## Lessons

- Move each job off the old surface before deleting it. Three steps, each green, let
  the final delete be a plain removal that `git revert` could undo.
- Replace a deleted gate with the same check on the new surface, and count the tests
  you lost. The 682-to-105 drop was explained in the PR, not left to be discovered.
- A build step that copies a generated file must generate it first. A local checkout
  hides the gap that a clean CI checkout exposes.
- When cost is the only recorded motive, write that down. The unstated ones are lost.

## Evidence

- `22c55b9` docs(mdx): T0.0 inventory + T0.1 content model for Fumadocs (PR #490)
- `cf4e53b` ci(docs): Docs guardrails workflow for MDX checker (PR #500)
- `eb6f9d6` feat(docs-site): Vercel config for the Fumadocs site; retire the old gallery workflow (PR #558)
- `a35fef3` build(vercel): skip preview builds and notes-only production builds (PR #576)
- `d907e73` feat(docs-site): the docs site is the front door (PR #579)
- `051ee4c` feat(figma): Sync plugin fetches its bundle from the docs site (PR #581)
- `04e6d09` fix(docs-site): production build generates the agent manifest before copying it (PR #582)
- `742408e` feat(gates): accessibility and visual checks run on the docs site (PR #584)
- `65ee680` feat(vercel): the old Storybook address redirects to the docs site (PR #586)
- `9f1acfc` feat(docs-site): point everything that required a story at the docs site (PR #587)
- `4626131` chore: delete Storybook (PR #590)
- hds#506: Build the Fumadocs docs site and retire Storybook
