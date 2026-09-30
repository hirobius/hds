export const meta = {
  name: 'hds-wave4c-repo-refs',
  description: 'Implement hds#373 (repoint pre-rename repo references) with review and refutation',
  phases: [
    { title: 'Implement', detail: 'one sonnet implementer, test-first, commits only' },
    { title: 'Review', detail: 'standards + spec review, fix round if blocking' },
    { title: 'Verify', detail: 'independent gate re-run and refutation' },
  ],
}

const WT = '/home/user/wt/w4-373'
const BR = 'claude/dsr-35-repo-refs'
const BASE = '1a3e4a4'

const COMMON = `
Repo: hirobius/hds, main at ${BASE} (design-system 0.19.1). FIRST STEP: create your worktree if it does not exist: git -C /home/user/hds fetch -q origin main && git -C /home/user/hds worktree add -B ${BR} ${WT} origin/main && ln -s /home/user/hds/node_modules ${WT}/node_modules. Then work ONLY inside ${WT}; never cd to /home/user/hds or any other worktree; do not run pnpm install.
Rules: never read or write .env* files; never edit .github/workflows/*; never use --no-verify; never push (the orchestrator pushes); never rewrite commits on the branch; never run pnpm check:release, deploy commands or bulk pnpm lint:fix; never skip, disable or quarantine a test; never touch Figma. Method: /implement + /tdd (red test first). Do NOT bump status.json (orchestrator does it at merge time).
Commit message: "<scope>(<area>): <summary>" body explaining the why, then these two trailer lines exactly:
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YaJAxDFfxi1XRSGfV8i6ck
Your final output is data for an orchestrator, not prose: fill the structured output honestly, including gates you could not run and why.`

const SPEC = `Issue hds#373 (read it with the GitHub MCP tools: ToolSearch "select:mcp__github__issue_read", then issue_read get owner hirobius repo hds issue_number 373; the body is the spec and carries the Done list). Summary: nine tracked lines still name the pre-rename repo hirobius/hirobius-design-system (git grep -n "hirobius/hirobius-design-system" on main lists them: scripts/generate-consumer-skill.mjs:36 LINT_INSTALL_LINE, docs/CONSUMING.md:435, skills/hds-consumer/SKILL.md:226 (generated; run pnpm skill:generate, never hand-edit, it is prettier-ignored), scripts/eslint-plugin-hds/README.md:28, four meta.docs.url values in scripts/eslint-plugin-hds/rules/*.mjs, README.md:54 PR link, plus the docs/CONSUMER_READINESS_BACKLOG.md:22 GitHub Packages row to delete). Repoint all of them at hirobius/hds exactly as the issue says; add the regression test to scripts/__tests__/front-door.test.mjs (readdirSync walk over README.md, docs/, scripts/, skills/; no git spawn) and the LINT_INSTALL_LINE assertion in scripts/__tests__/generate-consumer-skill.test.mjs, both red first on main; add a patch changeset (docs/CONSUMING.md ships in the tarball). Verify the replacement install line resolves in a scratch directory outside the repo (network works through the proxy): pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hds#path:/scripts/eslint-plugin-hds" and import 4 rules. Gates before committing: pnpm typecheck; pnpm lint; pnpm exec vitest run scripts/__tests__/front-door.test.mjs scripts/__tests__/generate-consumer-skill.test.mjs; node --test "scripts/eslint-plugin-hds/__tests__/*.test.mjs"; pnpm check:consumer-skill; node scripts/check-template-source-of-truth.mjs --all; node scripts/check-manifest-drift.mjs. Commit with hooks. Do not touch the Human steps (mirror archive, Packages listing); do not touch ops.`

const IMPL_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, commits: { type: 'array', items: { type: 'string' } }, gates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['name', 'ok'] } }, blockers: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'commits', 'gates'] }
const REVIEW_SCHEMA = { type: 'object', properties: { verdict: { type: 'string', enum: ['approve', 'changes'] }, blocking: { type: 'array', items: { type: 'string' } }, specGaps: { type: 'array', items: { type: 'string' } }, nits: { type: 'array', items: { type: 'string' } } }, required: ['verdict', 'blocking', 'specGaps', 'nits'] }
const VERIFY_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, findings: { type: 'array', items: { type: 'string' } }, head: { type: 'string' } }, required: ['ok', 'findings', 'head'] }

const GATES = `git -C ${WT} status --porcelain (clean); git -C ${WT} log --oneline ${BASE}..HEAD; git -C ${WT} grep -n "hirobius/hirobius-design-system" (must be empty); pnpm typecheck; pnpm lint; pnpm exec vitest run scripts/__tests__ (whole dir); node --test "scripts/eslint-plugin-hds/__tests__/*.test.mjs"; pnpm check:consumer-skill; node scripts/check-template-source-of-truth.mjs --all; node scripts/check-manifest-drift.mjs; grep -c "execFileSync('git'\\|spawnSync('git'" scripts/__tests__/front-door.test.mjs (0); ls .changeset (a new patch changeset vs main); every Done item in hds#373`

log('Wave 4c: hds#373 on sonnet (docs and strings, well specified); review and refute follow.')

const impl = await agent(`${COMMON}\n${SPEC}`, { label: 'implement:373', phase: 'Implement', schema: IMPL_SCHEMA, model: 'sonnet' })
let review = await agent(`You are the /code-review stage for hds#373. Read the issue (GitHub MCP issue_read) and compare ${WT} (branch ${BR}) against ${BASE} with git diff ${BASE}...HEAD; read-only, never edit, commit, push or git stash. Implementer's report: ${JSON.stringify(impl)}. Run: ${GATES}. Blocking = anything that would fail CI or violates the issue's Done list or a hard rule (no workflow edits, generated files regenerated not hand-edited, changeset present, trailers present, tests red-first evidence); specGaps = Done items not met; nits optional. Verdict "changes" if blocking or specGaps non-empty.`, { label: 'review:373', phase: 'Review', schema: REVIEW_SCHEMA })
let rounds = 0
let last = impl
while (review && review.verdict === 'changes' && rounds < 2) {
  rounds++
  log(`#373: review round ${rounds} found ${review.blocking.length} blocking, ${review.specGaps.length} spec gaps; fixing`)
  last = await agent(`${COMMON}\n${SPEC}\nA review found blocking items and spec gaps on your branch. Fix every one, re-run the gates, commit new commits on top. Review: ${JSON.stringify(review)}`, { label: `fix:373:${rounds}`, phase: 'Review', schema: IMPL_SCHEMA, model: 'sonnet' })
  review = await agent(`You are the /code-review stage for hds#373, round ${rounds + 1}. Same instructions as before: read the issue, diff ${WT} against ${BASE}, read-only, run: ${GATES}. Implementer's latest report: ${JSON.stringify(last)}.`, { label: `review:373:${rounds + 1}`, phase: 'Review', schema: REVIEW_SCHEMA })
}
const verify = await agent(`Adversarially verify the branch ${BR} in ${WT} for hds#373. Try to REFUTE that it is mergeable; do not edit, commit, push or git stash. Claims: ${JSON.stringify(last)}. Run independently: ${GATES}; also pnpm exec vitest run (full suite) and, in a scratch directory outside the repo, pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hds#path:/scripts/eslint-plugin-hds" then import the plugin and count its rules (expect 4). ok=true only if everything is green and every Done item in the issue is met; put the head sha in "head"; list every concrete failure with command and error text.`, { label: 'verify:373', phase: 'Verify', schema: VERIFY_SCHEMA })

return { ticket: '373', branch: BR, wt: WT, impl: last, review, rounds, verify }