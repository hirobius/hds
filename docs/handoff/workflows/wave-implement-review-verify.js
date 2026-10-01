export const meta = {
  name: 'hds-wave4a-burndown',
  description: 'Implement hds#365 and hds#369 in isolated worktrees, review, fix, and adversarially verify each',
  phases: [
    { title: 'Implement', detail: 'one implementer per ticket, test-first, commits only' },
    { title: 'Review', detail: 'standards + spec review, fix round if blocking' },
    { title: 'Verify', detail: 'independent gate re-run and refutation' },
  ],
}

const COMMON = `
Repo: hirobius/hds (Hirobius Design System), main at 1a3e4a4 (design-system 0.19.1). Work ONLY inside the worktree path given below; never cd to /home/user/hds or any other worktree. node_modules is a symlink to the main checkout's install: do not run pnpm install. Chromium for Playwright is at /opt/pw-browsers (PLAYWRIGHT_BROWSERS_PATH is set); never run "playwright install".
Rules that are not negotiable: never read or write .env* files; never edit .github/workflows/*; never use --no-verify; never run pnpm check:release, deploy commands, or bulk pnpm lint:fix; never push (the orchestrator pushes); never rewrite commits already on the branch; never raise the Button-only 119 kB size budget or any other budget in .size-limit.cjs; never skip, disable or quarantine a test; never touch Figma.
Method: /implement + /tdd. Write the failing test first, make it pass, refactor. Keep the diff to what the ticket needs.
Before committing run, in this order, and fix anything red: pnpm typecheck; pnpm lint; pnpm exec vitest run <the test files you touched or added>; node scripts/check-manifest-drift.mjs (after pnpm manifest:generate if you changed component JSDoc, exports or story attribution); pnpm api:check (if exports changed, run pnpm api:update first and explain); node scripts/check-story-coverage.mjs; node scripts/check-sync-map.mjs --check (use --write and commit the regenerated docs/sync-map.json when attribution legitimately changes). Then commit with git (pre-commit hooks run prettier, typecheck, eslint, verify-tokens, check-contrast, check-sync-map, story-coverage, check-contract-coverage, check-pure-annotations; if a hook fails, fix and re-commit, never bypass). Add a .changeset/*.md (patch) in the same commit when src/ changes; use "skip-changeset" in the commit message when only scripts/ or docs change. Do NOT bump status.json; the orchestrator does that at merge time.
Commit message: "<scope>(<area>): <summary>" body explaining the why, then these two trailer lines exactly:
Co-Authored-By: <the trailer named in the session attribution reminder>
Claude-Session: https://claude.ai/code/session_01YaJAxDFfxi1XRSGfV8i6ck
Your final output is data for an orchestrator, not prose for a human: fill the structured output honestly, including gates you could not run and why.`

const TICKETS = [
  {
    key: '365',
    wt: '/home/user/wt/w4-365',
    branch: 'claude/dsr-30-compounds-gate',
    title: 'Six compounds still write parts onto the Radix Root; pure-annotation gate misses bare Object.assign',
    spec: `Issue hds#365 (read it: gh is unavailable; the body is reproduced here). Background: hds#363 (merged as #367) moved AlertDialog, Dialog, Card and Grid onto "/* @__PURE__ */ Object.assign(<own wrapper>, { ...parts, displayName })" and added scripts/check-pure-annotations.mjs (pre-commit; 46 unit tests in scripts/__tests__/check-pure-annotations.test.mjs) plus an esbuild Button-only probe inside scripts/build-button-probe.mjs (metafile at dist/probe/button-only.esbuild.meta.json). The esbuild probe passes for the two packages the ticket named but its metafile still lists 33 @radix-ui/* packages in a bundle that imports only Button, because the same "X.Part = …" write shape survives in six files (37 writes): src/app/components/context-menu.tsx (12), menu.tsx (12), toolbar.tsx (5), popover.tsx (4), hds-tooltip.tsx (2), hover-card.tsx (2, the exact "Root as unknown as Component" cast that #367 removed elsewhere).
Change:
(a) Move the six files onto the same "/* @__PURE__ */ Object.assign(wrapper, { parts, displayName })" shape as AlertDialog/Dialog/Card (see src/app/components/alert-dialog.tsx and dialog.tsx on main for the exact form: a plain function wrapper over the Radix Root, inner calls also pure). Keep every static member name, identity and declared type: after pnpm build:lib, dist/types/src/app/components/<file>.d.ts for those six files must declare the same members and types as main (diff them against a build of main or reason from the emitted .d.ts), src/app/data/component-api.json unchanged, pnpm api:check unchanged. Existing tests (including tests/primitive-contracts/keyboard.contract.test.tsx, which exercises Menu, ContextMenu, Popover, HoverCard, HdsTooltip) must pass. Add a test per file in the style of the #367 tests (src/app/components/alert-dialog.test.tsx or wherever they live) asserting part identity, displayName, and that the Radix Root carries no parts.
(b) Extend scripts/check-pure-annotations.mjs to flag (1) any top-level Object.assign( whose first argument is a capitalised identifier or a call and that lacks /* @__PURE__ */, and (2) any top-level "<Identifier>.<Name> = …" write where <Identifier> is capitalised (a component), including "X.displayName = …". Unit-test both in scripts/__tests__/check-pure-annotations.test.mjs (fixtures that must be flagged and fixtures that must pass, including the wrapped form). The gate must pass on src/ after (a); annotate or restructure any other offender it finds instead of exempting it (list them in your summary).
(c) Tighten the esbuild probe's assertion from "no dialog packages" to an allow-list of @radix-ui/* packages Button legitimately needs: derive it by reading what src/app/components/button.tsx and its imports actually pull in (expected @radix-ui/react-slot and its transitive utils only; verify with the metafile) so the probe fails when a new compound leaks in. Print the reached list on failure. Keep the check inside scripts/build-button-probe.mjs (CI's Bundle budgets step calls that script; no workflow edit).
Done when: grep -rn "^\\(export const \\)\\?[A-Z][A-Za-z]*\\.[A-Z][A-Za-z]* = " src/app/components returns nothing; node scripts/check-pure-annotations.mjs flags the two new fixture shapes and passes on src/; pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit green with the esbuild metafile listing only allow-listed @radix-ui packages and the rollup Button-only probe at or below 119 kB gzip (report the numbers before and after; the budget is not to be raised); pnpm typecheck && pnpm lint green; the touched vitest files and the whole scripts/__tests__ directory green; pnpm api:check unchanged; changeset patch.`,
  },
  {
    key: '369',
    wt: '/home/user/wt/w4-369',
    branch: 'claude/dsr-31-story-subject-meta',
    title: 'Story attribution follows import order; honour the CSF component: field instead',
    spec: `Issue hds#369. Background: resolveStorySubject in scripts/lib/story-link.mjs credits a story file to the first relative import that resolves to a known component file. That bit twice on 2026-09-30: the Client detail screen stories (#358) are credited to PageHeader because it is imported first, and #366 put a Badge import above StatusTile / StatusListItem, which made both components read as story-less on main (check-story-coverage reads public/hds-manifest.json componentSpecs, which generate-manifest fills from story-link). #370 pinned the subject-first order for those two files with scripts/__tests__/story-subject-order.test.mjs.
Change: in resolveStorySubject, read the CSF meta's "component: <Identifier>" from the default export object (the same region parseMetaTitle reads: the object literal after "export default" or the "const meta" it references; handle both "export default { title, component: X }" and "const meta: Meta = { … component: X }; export default meta"), map the identifier to its import specifier (named or default import, including "import { X as Y }"), resolve that module against knownFilePaths with the same suffix rules, and use it as the subject when it resolves. Fall back to the current first-import rule when there is no component: field or it does not resolve (e.g. component: names a helper or a non-component). Unit-test in scripts/__tests__/story-link.test.mjs: component after a helper import; no component: field; component: naming a non-component; aliased import; "const meta" form. Then regenerate public/hds-manifest.json and docs/sync-map.json (pnpm manifest:generate, node scripts/check-sync-map.mjs --write, plus the rest of the chain if anything else drifts: node scripts/generate-component-api.mjs, node scripts/enrich-manifest.mjs, node scripts/generate-llms-txt.mjs, node scripts/build-readme-counts.mjs, node scripts/generate-consumer-skill.mjs) and list in your summary exactly which story files change subject and to what; the Client detail screen stories will move off PageHeader only if their meta names a component in the manifest, otherwise they stay. Do not hand-edit generated files. Check the story-link parity test (scripts/__tests__ has one against storybook-static index.json; it skips when storybook-static is absent; run pnpm build-storybook and run it so it does not skip).
Done when: the unit tests above pass; node scripts/check-story-coverage.mjs and node scripts/check-sync-map.mjs --check green with regenerated files committed; scripts/__tests__/story-subject-order.test.mjs still passes; pnpm typecheck && pnpm lint && pnpm exec vitest run scripts/__tests__ green; node scripts/check-manifest-drift.mjs exit 0; commit message carries skip-changeset unless the manifest attribution change is worth a patch note (say which you chose and why).`,
  },
]

const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    commits: { type: 'array', items: { type: 'string' } },
    gates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['name', 'ok'] } },
    measurements: { type: 'array', items: { type: 'string' } },
    humanSteps: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'commits', 'gates'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['approve', 'changes'] },
    blocking: { type: 'array', items: { type: 'string' } },
    specGaps: { type: 'array', items: { type: 'string' } },
    nits: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'blocking', 'specGaps', 'nits'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    findings: { type: 'array', items: { type: 'string' } },
    measurements: { type: 'array', items: { type: 'string' } },
    head: { type: 'string' },
  },
  required: ['ok', 'findings', 'head'],
}

function implPrompt(t) {
  return `${COMMON}
Worktree: ${t.wt} (branch ${t.branch}, based on main 1a3e4a4).
Ticket: hds#${t.key} — ${t.title}
${t.spec}`
}
function reviewPrompt(t, impl, round) {
  return `You are the /code-review stage (dual axis: repo standards + the ticket spec) for hds#${t.key} — ${t.title}. Round ${round}.
Worktree: ${t.wt} (branch ${t.branch}). Read-only except for running commands; do not commit or edit files; never use git stash. Compare against main with: git -C ${t.wt} diff 1a3e4a4...HEAD and git -C ${t.wt} log --oneline 1a3e4a4..HEAD.
Implementer's report: ${JSON.stringify(impl)}
Spec to check against:
${t.spec}
Standards to check: hds CLAUDE.md and docs/rules/REACT_COMPONENTS.md (read it), generated files regenerated not hand-edited (public/hds-manifest.json, llms.txt, public/llms*.txt, DESIGN.md, docs/sync-map.json, README counts, skills/hds-consumer/SKILL.md, src/app/data/component-api.json), a changeset present when src/ changed (or skip-changeset for tooling-only), no .github/workflows edits, no budget raised, no test skipped, commit trailers present, test-first evidence (the new tests fail without the change: prove it by running them against a scratch copy of the pre-change file, e.g. git show 1a3e4a4:<file> > /tmp/scratch/... and a temporary vitest alias, never by editing the worktree).
Actually run: pnpm typecheck, pnpm lint, the touched vitest files, node scripts/check-manifest-drift.mjs, pnpm api:check, node scripts/check-story-coverage.mjs, node scripts/check-sync-map.mjs --check; for #365 also pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit and diff the six files' emitted .d.ts against main's; for #369 also pnpm build-storybook and the story-link parity test.
Blocking = anything that would fail CI ("Lean gate set": typecheck, eslint zero warnings, verify-tokens+check-contrast, figma drift, pretest chain + vitest, size-limit, consumer smoke incl. publint and consumer typecheck, storybook build, axe gate light+dark) or violates the spec's Done list or a hard rule. specGaps = Done-list items not met. nits = optional. Verdict "changes" if blocking or specGaps is non-empty.`
}
function fixPrompt(t, review) {
  return `${COMMON}
Worktree: ${t.wt} (branch ${t.branch}). A review of your branch for hds#${t.key} found blocking items and spec gaps. Fix every one, add or adjust tests, re-run the gates, and commit (new commits on top; do not amend or rebase).
Review: ${JSON.stringify(review)}
Spec:
${t.spec}`
}
function verifyPrompt(t, impl) {
  return `Adversarially verify the branch for hds#${t.key} — ${t.title}. Try to REFUTE that it is mergeable. Worktree ${t.wt} (branch ${t.branch}); do not edit or commit; never git stash; only run commands and read.
Claims to refute: ${JSON.stringify(impl)}
Spec:
${t.spec}
Run independently (do not trust the report): git -C ${t.wt} status --porcelain (must be clean); git -C ${t.wt} log --oneline 1a3e4a4..HEAD; pnpm typecheck; pnpm lint; pnpm exec vitest run (full suite, ~3 min); node scripts/check-manifest-drift.mjs; pnpm api:check; node scripts/check-story-coverage.mjs; node scripts/check-sync-map.mjs --check; node scripts/check-template-source-of-truth.mjs; node scripts/generate-consumer-skill.mjs --check; node scripts/check-status-claims.mjs --check; node scripts/check-pure-annotations.mjs; git -C ${t.wt} diff --name-only 1a3e4a4..HEAD -- .changeset (a changeset must exist when src/ changed). For #365 also: pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit (record the rollup Button-only number and the esbuild reached-package list) and the grep from the Done list; for #369 also: pnpm build-storybook, the story-link parity test, and a diff of docs/sync-map.json subjects vs main listing every story file whose subject changed.
Report ok=true only if everything is green and every Done item in the spec is met. Put the branch head sha in "head". List every concrete failure in findings with the command and the error text.`
}

log('Wave 4a: #365 and #369 implement in parallel; each is reviewed (up to two fix rounds) and then refuted before the orchestrator pushes.')

const results = await pipeline(
  TICKETS,
  (t) => agent(implPrompt(t), { label: `implement:${t.key}`, phase: 'Implement', schema: IMPL_SCHEMA }),
  async (impl, t) => {
    let review = await agent(reviewPrompt(t, impl, 1), { label: `review:${t.key}`, phase: 'Review', schema: REVIEW_SCHEMA })
    let rounds = 0
    let last = impl
    while (review && review.verdict === 'changes' && rounds < 2) {
      rounds++
      log(`#${t.key}: review round ${rounds} found ${review.blocking.length} blocking, ${review.specGaps.length} spec gaps; fixing`)
      last = await agent(fixPrompt(t, review), { label: `fix:${t.key}:${rounds}`, phase: 'Review', schema: IMPL_SCHEMA })
      review = await agent(reviewPrompt(t, last, rounds + 1), { label: `review:${t.key}:${rounds + 1}`, phase: 'Review', schema: REVIEW_SCHEMA })
    }
    return { impl: last, review, rounds }
  },
  async (r, t) => {
    const verify = await agent(verifyPrompt(t, r.impl), { label: `verify:${t.key}`, phase: 'Verify', schema: VERIFY_SCHEMA })
    return { ticket: t.key, branch: t.branch, wt: t.wt, ...r, verify }
  },
)

return results.filter(Boolean)