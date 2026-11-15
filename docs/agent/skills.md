# Skills

`.claude/skills/` vendors Matt Pocock's engineering skills. It is the same set as ops and site-engine.
`skills-lock.json` is the shared pin. The routing below is mandatory. It is not a suggestion.

## Routing

- Build anything (component, token work, validator, fix): `/implement` and `/tdd`. Test first, red-green-refactor. No "just write it".
- Epic or spec: `/to-spec`, then `/to-tickets`, then `/implement-spec` (ticket graph, parallel worktrees, one integration branch).
  - Run `/grill-me` first if the plan itself is unclear.
- Before you open any PR: `/code-review`, then write the body with `/pr`.
  - The body has Summary (a visual), Evidence and Merge Danger. It is the fleet's PR format.
  - `scripts/hooks/check-pr-body.mjs` enforces it. The body needs a `Reviewed:` line.
- End of a real session: `/retro`. Its output is environment fixes: checks over prose.
- A bug: `/diagnosing-bugs` (reproduce, minimize, hypothesize, fix), then `/tdd`.
- Design-touching work or a new module: `/codebase-design`.
- Periodic design-debt sweep: `/improve-codebase-architecture`.
- Board or issue-lifecycle work: `/triage`.
- A perf-budget failure (`pnpm size-limit`, `check:size`, the Button probe): `performance-optimization`. Never raise a budget to get green.
- Charting a lane with many decisions: `/wayfinder`.
- Design-touching UI: `/design-review`.
- A visual bug, in HDS or a consumer app: `/visual-fix`.
  - `/design-review` scores a screen. `/visual-fix` fixes one.
- UI polish: `/impeccable`. Detail: `docs/agents/design-quality.md`.
- Docs copy: `humanizer`. UI second pass: `web-design-guidelines`. Detail: `.claude/skills/_vendor/anti-slop/ROUTING.md`.

## Tracker config

`/to-tickets` and `/triage` ask for this.

- The tracker is GitHub Issues in this repo.
- Labels: `backlog`, `bug`, `blocked`, `needs-adrian`, plus the Ralph labels in `docs/agent/ralph.md`.
- Epic to child: sub-issues.
- Cross-task prerequisite: "Depends on #N" in the body.
- Issue tracker operations, with Wayfinding: `docs/agents/issue-tracker.md`.
- Triage labels: `docs/agents/triage-labels.md`.
- Domain docs (single-context): `docs/agents/domain.md`.

## Addy Osmani's agent-skills

- `.claude/skills/` also vendors skills from the repository `addyosmani/agent-skills` (MIT). The pin is in `skills-lock.json`.
- The Pocock skills stay the mandatory routing. Where an Osmani skill overlaps one, run the Pocock skill.
- Use an Osmani skill where Pocock has nothing:
  `security-and-hardening`, `performance-optimization`, `api-and-interface-design`, `observability-and-instrumentation`,
  `shipping-and-launch`, `ci-cd-and-automation`, `deprecation-and-migration`.
- Detail: `.claude/skills/_vendor/osmani-agent-skills/ROUTING.md`.
