# HDS hiring-readiness burndown — thread-agnostic handoff

Written 2026-09-30 ~19:20 UTC at the end of session `session_01YaJAxDFfxi1XRSGfV8i6ck`.
Everything a fresh session needs is on GitHub (branches, issues) or in this folder. Nothing depends on the old container.

## Kickoff prompt for the next thread

```
Continue the HDS hiring-readiness burndown. Read hds issue "Burndown handoff 2026-09-30" first (it links docs/handoff/ on branch claude/burndown-handoff). Ultracode is on: use workflows (implement → review ≤2 fix rounds → adversarial verify) for every ticket. Drive every PR you open to green and merge it. Never push ops; hds pushes only to your claude/* branch. Start with: open PRs for the four pushed branches (#365, #322, #369, #373), merge in that order, then re-run the stopped wave 4d (hds#300 text-style bindings) and the prune audit, then the queue below.
```

## State of main

| repo | main | note |
| --- | --- | --- |
| hds | `31965f9` | #378 figma snapshot merged last. 0.19.1 on npm via OIDC Trusted Publishing (provenance ok). NPM_TOKEN and the npm granular token are deleted. |
| ops | `01fce2f` | 6 local commits NOT on GitHub (see "ops commits" below). |

## Branches on GitHub with finished work (open PR → CI → merge, in this order)

| order | branch | issue | head | status | PR title / body notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `claude/dsr-30-compounds-gate` | hds#365 | bf4b94b + hook-label commit | reviewed + refuted green; merge-regen'd on 31965f9 | `fix(gate): pure-annotation gate covers compound Object.assign and X.Part writes (#365)` · body "Closes #365". Changeset patch. |
| 2 | `claude/dsr-34-pressed-token` | hds#322 (code half) | 9f07702 | reviewed + refuted green; merge-regen'd on 31965f9 | `feat(tokens): pressed-state overlay token for Button (#322)` · body "Refs #322" (NOT Closes: the Figma binding half is Adrian's). Changeset minor. |
| 3 | `claude/dsr-31-story-subject-meta` | hds#369 | 7c53552 | reviewed + refuted green; **not** merge-regen'd (older base) | run `merge-regen.sh <wt> 369` first, then PR `fix(scripts): story subject honours CSF component: (#369)` · "Closes #369". Gates were run by hand (hooks did not fire in that worktree). |
| 4 | `claude/dsr-35-repo-refs` | hds#373 | 5b05a00 | implemented; review round 2 was running when the session stopped | treat as needs `/code-review` + refute, then merge-regen, PR "Closes #373". |

Pushes for 1, 2, 4 were launched at session end; if a branch is missing on GitHub, that push failed at pre-push (`pnpm test` + `smoke:consumer` + `check-record-freshness`) and the work is lost with the container — redo from the issue spec.

## Stopped mid-flight — restart from scratch

- **hds#300 text-style bindings (wave 4d).** Adrian's push reported `updated 6 · created 0 · deleted 0`, yet the ingested snapshot (main `figma/snapshot.json`, taken 18:44Z) still shows drift on six text styles (display, h2, body, ui, eyebrow, mono: `bound:fontSize/lineHeight/letterSpacing`) and `lastPush` still `8f136b88 / 2026-09-23`. Diagnose the dev-plugin carrier (`scripts/figma-push*`, `figma/push/plugin/`), fix, test against the committed snapshot. Then regenerate the plugin with `pnpm figma:push --prune` (Adrian said **yes** to prune: it deletes the 41 unmanaged extras only), zip `figma/push/plugin/` and send it to Adrian; he re-runs Push + Take snapshot; ingest with `pnpm figma:snapshot --ingest <file>`; `pnpm check:figma-drift` should go to 0. Script: `workflows/hds-wave4d-textstyle-bindings-wf_bc084903-1a9.js`.
- **Prune audit (aggressive).** Adrian: "the design system is a bit bloated. so let's hack away at it once we've landed all of our current issues" / "maybe do an aggressive prune audit and spec buildout". Read-only audit: sweep usage (ops, folio, site-engine consumers) + surface (exports, manifest, stories, docs) → per-component disposition (keep core / keep tier / demote / delete) → adversarial refute → `prune-plan.html` published as an Artifact → one Decision issue (reopens hds#133 option A, default + date) + batch Work issues. Execution only after wave 4 lands and Adrian ratifies. Script: `workflows/hds-prune-audit-wf_8c1bbbcf-02b.js`.

## Queue (after the four PRs merge)

1. hds#372 Button/Card tone `!` modifiers — after #322 (both touch `src/app/components/button.tsx`).
2. hds#374 core-set publication + hds#376 screen-reader smoke suite / README §Accessibility — after #369 (generator + README regen).
3. hds#377 adoption ledger — after the ops bump lands on ops main (needs `git fetch --unshallow` in ops).
4. "lane": hds#206 hds-side finish — remove deprecated spacing aliases, gate to error, **minor** release.
5. hds#375 Decision tier-vs-disposition — default "keep tier", resolves 2026-10-14 by silence.
6. hds#379 build-tokens.mjs overwrites merged slots (Dialog `trigger` drop) — bug, `/diagnosing-bugs` + `/tdd`.

## ops commits (not on GitHub — agents never push ops)

Branch `claude/design-system-hiring-review-4esxm7`, 6 ahead of `01fce2f`, head `fe16f76`:
`dc8e181` handoff wave 2 · `bd79b3e` handoff wave 3 · `350ddc1` pin `@hirobius/design-system` ^0.19.1 · `6cc789a` codemods (hds-patterns subpath: 11 files / 4 names; spacing vocabulary: 10 refs / 3 files) · `15d3367` HANDOFF + SESSION-BOARD release · `fe16f76` board fix.
The bundle `ops-claude-design-system-hiring-review-4esxm7.bundle` was sent to Adrian. To land it:

```
cd ops && git fetch ~/Downloads/ops-claude-design-system-hiring-review-4esxm7.bundle claude/design-system-hiring-review-4esxm7:claude/design-system-hiring-review-4esxm7 && git push -u origin claude/design-system-hiring-review-4esxm7
```

If the bundle is lost too: redo = bump the pin to ^0.19.1, run the two codemods, update `docs/ai/HANDOFF.md`, `docs/ai/DONE-LOG.md`, `docs/ai/SESSION-BOARD.md`, `status.json`.

## Adrian's lane (only he can)

- Push the ops branch (above).
- hds#301: "accept" or the default fires 2026-10-11.
- hds#126 Chromatic secret/variable · hds#263 gitleaks CI step (workflows: agents never edit `.github/workflows/*`).
- hds#303 / #317 promotion to the library + link sharing (steps on PR #325).
- Figma half of hds#322 (bind the pressed overlay in staging), rebind/delete the three moved variables (shadow/color, badge/bg, button/primary/textDisabled) — the plugin API cannot move variables between collections.
- Open PRs not mine: #325 (draft, his steps A–G), #304 (draft), #275 (Part 2 taxonomy decision).

## Standing constraints (verbatim from the session)

- NEVER read, write, create, or delete `.env*` files.
- hds: never push from local machines; remote sessions push only to their designated `claude/*` branch; never push to `main`.
- ops: NEVER git push (local commits only).
- NEVER run `pnpm check:release` or deploy commands. NEVER bulk `pnpm lint:fix`. Never `--no-verify`. Never rewrite pushed history.
- Never raise the Button-only 119 kB budget or any `.size-limit.cjs` budget.
- Agents never edit `.github/workflows/*`. `.husky/` is fine.
- Figma: write only to staging `2VgBbVpKiDnu0aftJEVyBQ`; library `c8MaVgwxOlxm4wr8wnH0Z4` is read-only; 200 MCP reads/day; never retry a rate-limit error.
- Commit trailers: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` + `Claude-Session: <session url>`. PR footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)` + session url. Issue/comment footer `_Generated by [Claude Code](https://claude.ai/code)_`. No model identifiers in repo artifacts.
- ops: claim on `docs/ai/SESSION-BOARD.md` before touching ops files; release when done.
- Adrian's prefs: concise, glanceable, one step at a time, copyable blocks, clickable deep links, paste-ready text.

## Tooling that worked

- `merge-regen.sh <worktree> <issue>`: merges `origin/main`, takes main's copy for generated/status conflicts, runs the regen chain (generate-manifest, generate-component-api, enrich-manifest, generate-llms-txt, build-readme-counts, check-sync-map --write, generate-consumer-skill), bumps status if needed, commits. Caveats: its `git add -A` folds uncommitted edits into the merge commit (commit first), and it drops branch-specific `status.json` entries (re-add after).
- Push loop (pre-push runs the full suite, so run it detached): `rm -rf storybook-static; setsid nohup bash -c 'for n in 1 2 3; do git push -u origin <branch> > push$n.log 2>&1 && break; sleep 5; done; echo done >> pushloop.log' & disown`, then an until-loop waiter in the background. Plain push, never `--force-with-lease` after GitHub auto-deleted a branch.
- `check-record-freshness`: `status.json updatedAt` must be ≥ the newest non-merge commit touching `src/`, `scripts/`, `docs/adr/`; the bump is a separate later commit. `src/` commits need a `.changeset/*.md`.
- Worktrees under `/home/user/wt/` lack `.husky/_`, so hooks may not fire there: run the gates by hand (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `node scripts/check-record-freshness.mjs`).
- Workflow scripts in `workflows/` (implement → review ≤2 rounds → refute per ticket; triage; prune audit; text-style diagnosis). Pass `args` for timestamps; never `Date.now()` in scripts.
- GitHub MCP: `search_issues` returns nothing for this org — use `list_issues`; save big outputs to files and parse with python.
- Never `pkill`/`pgrep -f` with a pattern that appears in your own command (kills the shell); kill by explicit PID.
