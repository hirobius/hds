export const meta = {
  name: 'hds-wave4b-pressed-and-ops-bump',
  description: 'hds#322 pressed-state token (code half) in a worktree, and the ops pin bump to 0.19.1 with both codemods as local commits',
  phases: [
    { title: 'Implement', detail: 'two implementers in parallel, commits only' },
    { title: 'Review', detail: 'standards + spec review, fix round if blocking' },
    { title: 'Verify', detail: 'independent gate re-run and refutation' },
  ],
}

const TRAILERS = `Commit message: "<scope>(<area>): <summary>" body explaining the why, then these two trailer lines exactly:
Co-Authored-By: <the trailer named in the session attribution reminder>
Claude-Session: https://claude.ai/code/session_01YaJAxDFfxi1XRSGfV8i6ck
Never read or write .env* files; never use --no-verify; never push (the orchestrator, or Adrian for ops, pushes); never rewrite commits already on the branch; never run pnpm check:release, deploy commands or bulk pnpm lint:fix; never skip, disable or quarantine a test; never touch Figma. Your final output is data for an orchestrator, not prose: fill the structured output honestly, including gates you could not run and why.`

const TICKETS = [
  {
    key: '322',
    repo: 'hds',
    wt: '/home/user/wt/w4-322',
    branch: 'claude/dsr-34-pressed-token',
    title: 'Tokenise the pressed-state overlay (code half of hds#322)',
    spec: `Repo hirobius/hds, worktree /home/user/wt/w4-322 (branch claude/dsr-34-pressed-token, main 1a3e4a4, design-system 0.19.1). Work ONLY in that worktree; node_modules is a symlink to the main checkout's install (do not run pnpm install); Chromium at /opt/pw-browsers. Never edit .github/workflows/*. Do NOT bump status.json (orchestrator does it at merge). Method: /implement + /tdd.
Issue hds#322 (Figma binding half is Adrian's after hds#300; this ticket is the code half). Today Button (src/app/components/button.tsx base classes) and IconButton express pressed as "active:brightness-95 dark:active:brightness-110", a filter with no token behind it; Figma's staging Pressed variants are Hover plus a hard-coded 5% black fill because Figma has no brightness filter, and that hex is the only unbound colour on those sets.
Change: (1) add a semantic token for the pressed overlay to hirobius.tokens.json in the strict DTCG dialect the file uses (read docs/adr/003-dtcg-tokens-as-source.md, docs/rules/MANIFEST_SYNC.md and neighbouring semantic.state or semantic.color entries for the shape and $description style; the file may keep Light/Dark as a mode pair the way other theme-aware colours do): e.g. semantic.color.state.pressed.overlay, an opaque colour (black in light, white in dark, or whatever the existing pressed accents at primitive stone-800/stone-400 suggest; read their $description lines) with the alpha kept in the class, matching the scrim precedent from hds#335 (role.scrim + bg-scrim/60). Add the role alias so buildTailwindThemeExtend emits a Tailwind colour, then run pnpm tokens (regenerates src/styles/tokens.css, tokens.generated.css, tailwind.config.tokens.cjs, the manifest, DESIGN.md, llms.txt and friends; commit the regenerated files, never hand-edit them) and pnpm figma:model so figma/model.json carries the variable; do not push to Figma; pnpm check:figma-drift may list the new variable as the only new extra, and check-contrast must stay green. (2) Make Button and IconButton read the token instead of the brightness filter, without extra DOM: the inset-shadow overlay trick "active:shadow-[inset_0_0_0_9999px_<overlay-with-alpha>]" or a pseudo-element overlay are both acceptable; pick the one that keeps focus rings, disabled state and the existing transition-[colors,filter] working, and explain the choice in the component's JSDoc. If after trying you conclude the filter must stay, keep it, make the token mirror it, and write the reason in the JSDoc and the changeset (the issue allows this). Keep the "// motion-ok:" comment at the top of button.tsx accurate. (3) Tests first: a vitest in the house style (see src/app/components/*.test.tsx and src/styles/__tests__/interactive-surface-tokens.test.ts) asserting tokens.css defines the new variable in :root and in [data-theme="dark"] with different values, and that button.tsx/icon-button.tsx no longer contain "brightness-95" (or, if the filter stays, that they reference the token). (4) Storybook: the existing Button and IconButton stories must keep rendering; if no story shows the pressed state, add a "Pressed" story using the play/pseudo-state approach the repo already uses for Hover/Focus (check .storybook and existing stories for a pseudo-states addon before inventing one; if none exists, skip the story and say so). (5) Gates before committing: pnpm typecheck; pnpm lint; node scripts/verify-tokens.mjs; node scripts/check-contrast.mjs; pnpm exec vitest run on touched tests plus src/styles/__tests__; node scripts/check-manifest-drift.mjs; pnpm api:check (no export change expected); node scripts/check-sync-map.mjs --check; pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit (Button-only must stay at or below 119 kB gzip; report the number). Commit with hooks; changeset: minor if the pressed visual changes for consumers, patch if the filter stays; say which and why.
Done when: the token exists in hirobius.tokens.json and tokens.css (light and dark values differ); Button and IconButton read it or a written reason says why the filter stays; figma/model.json includes the variable; all gates above green; changeset present.`,
    gates: `pnpm typecheck; pnpm lint; node scripts/verify-tokens.mjs; node scripts/check-contrast.mjs; pnpm exec vitest run (full); node scripts/check-manifest-drift.mjs; pnpm api:check; node scripts/check-sync-map.mjs --check; node scripts/check-template-source-of-truth.mjs; node scripts/generate-consumer-skill.mjs --check; node scripts/check-pure-annotations.mjs; pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit; pnpm build-storybook; git diff --name-only 1a3e4a4..HEAD -- .changeset (must be non-empty)`,
    base: '1a3e4a4',
  },
  {
    key: 'ops-bump',
    repo: 'ops',
    wt: '/home/user/ops',
    branch: 'claude/design-system-hiring-review-4esxm7',
    title: 'ops: bump @hirobius/design-system to 0.19.1 and run the patterns + spacing codemods (local commits, Adrian pushes)',
    spec: `Repo hirobius/ops, checkout /home/user/ops on branch claude/design-system-hiring-review-4esxm7 (HEAD bd79b3e carries two docs-only commits from this session; build on top, do not touch them). HARD RULES of this repo: NEVER git push (local commits only; Adrian pushes); never read/write .env*; never run pnpm check:release or deploy; never bulk lint:fix. Before touching code, read docs/ai/SESSION-BOARD.md and add a claim row for "package.json / pnpm-lock.yaml (@hirobius/design-system pin), src/** files rewritten by the two hds codemods" held by session_01YaJAxDFfxi1XRSGfV8i6ck, and release it in your final commit (state RELEASED with a one-line summary), exactly in the table's format. Read the GitHub issue hirobius/ops#440 first (load the GitHub MCP tools with ToolSearch "select:mcp__github__issue_read" and call issue_read get on owner hirobius repo ops issue_number 440) and follow its Done list where it is more specific than this spec. Also read docs/ai/HANDOFF.md "Now" for the hds line.
Work: (1) pnpm install in /home/user/ops if node_modules lacks @hirobius/design-system (network goes through a proxy; it works). (2) Bump "@hirobius/design-system" in package.json to "^0.19.1" and run pnpm install so pnpm-lock.yaml updates; confirm node_modules/@hirobius/design-system/package.json version is 0.19.1. (3) Run the patterns-subpath codemod the package ships (bin "hds-patterns-subpath", see node_modules/@hirobius/design-system/codemods/patterns-subpath.mjs; try --dry-run and --check first, then apply to src/) so pattern-tier imports move to "@hirobius/design-system/patterns". (4) Run the spacing-vocabulary codemod from the hds checkout: /home/user/hds/scripts/codemod-spacing-vocabulary.mjs (read its header for flags such as --check / --root / a target directory; if it only knows the hds tree, copy it into a scratch location and point it at /home/user/ops/src; do not edit the hds checkout). It rewrites deprecated spacing names (gap="tight"|"normal"|"inset"|"spacious", var(--semantic-space-layout-*), var(--semantic-space-component-*)) to the t-shirt scale; the grep 'gap="tight"\\|gap="normal"\\|gap="inset"\\|gap="spacious"\\|semantic-space-layout\\|semantic-space-component' over src should drop from 19 hits to 0, or each survivor gets a one-line reason. (5) 0.19.1 changes three visible things: containers use a 12 px radius (Card, Surface, StatusTile, static .hds-card), data-density="compact" tightens spacing, and overlays (Dialog, Menu, Popover, Select, Tooltip, AlertDialog) portal into the nearest [data-hds] scope instead of body. Run pnpm typecheck, pnpm test and pnpm test:layout (Playwright: node scripts/check-route-coverage.mjs && playwright test tests/layout-integrity.spec.ts; Chromium is at /opt/pw-browsers, PLAYWRIGHT_BROWSERS_PATH is set, never run playwright install) and fix what breaks with the smallest change; if the DOM-node budget or a layout baseline moves because of the radius/density change, update the baseline the way the repo's docs say (docs/guardrails, tests/layout-integrity.spec.ts header) and say so. Start pnpm dev in the background and screenshot /ops/standing and one dialog-bearing page with Playwright to confirm overlays render inside the dark scope; keep the screenshots in the scratchpad and describe what you saw. (6) Update docs/ai/HANDOFF.md (the hds line in Now: ops now pins ^0.19.1; the Next item 2 sentence about the bump) and root status.json (updatedAt, one headline sentence) in the final commit, per this repo's "before ending a session" rule. (7) Commit in two or three local commits: the pin bump + lockfile; the codemod rewrites; docs/board/status. Do not push.
Done when: package.json pins ^0.19.1 and the lockfile matches; the two codemods applied with the grep at 0 (or reasons); pnpm typecheck, pnpm test and pnpm test:layout green; screenshots taken and described; SESSION-BOARD claim added and released; HANDOFF and status.json updated; commits local on claude/design-system-hiring-review-4esxm7 with the trailers.`,
    gates: `pnpm typecheck; pnpm test; pnpm test:layout; git -C /home/user/ops status --porcelain (must be clean); git -C /home/user/ops log --oneline bd79b3e..HEAD; grep -rn 'gap="tight"\\|gap="normal"\\|gap="inset"\\|gap="spacious"\\|semantic-space-layout\\|semantic-space-component' /home/user/ops/src | wc -l; node -e "console.log(require('/home/user/ops/node_modules/@hirobius/design-system/package.json').version)"; grep -n '@hirobius/design-system' /home/user/ops/package.json; grep -c 'design-system/patterns' -r /home/user/ops/src; git -C /home/user/ops diff bd79b3e..HEAD --stat | tail -3; confirm no push happened: git -C /home/user/ops status -sb shows ahead of origin`,
    base: 'bd79b3e',
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
  return `${t.spec}
${TRAILERS}`
}
function reviewPrompt(t, impl, round) {
  return `You are the /code-review stage (dual axis: repo standards + the spec) for ${t.title}. Round ${round}. Checkout ${t.wt} (branch ${t.branch}); read-only except for running commands; do not commit, edit, push or git stash. Compare against the base with git -C ${t.wt} diff ${t.base}...HEAD and git -C ${t.wt} log --oneline ${t.base}..HEAD.
Implementer's report: ${JSON.stringify(impl)}
Spec:
${t.spec}
Actually run these gates: ${t.gates}. Check generated files were regenerated, not hand-edited; a changeset exists when the hds src/ changed; no .github/workflows edits; no test skipped; trailers present; SESSION-BOARD claim (ops only) added and released in the table format; no push happened (ops: git status -sb must show the branch ahead of origin, never "up to date" with new commits). Blocking = anything that would fail the repo's CI or violates the spec's Done list or a hard rule; specGaps = Done items not met; nits = optional. Verdict "changes" if blocking or specGaps is non-empty.`
}
function fixPrompt(t, review) {
  return `${t.spec}
${TRAILERS}
A review found blocking items and spec gaps on your branch. Fix every one, add or adjust tests, re-run the gates, and commit new commits on top (no amend, no rebase). Review: ${JSON.stringify(review)}`
}
function verifyPrompt(t, impl) {
  return `Adversarially verify ${t.title}. Try to REFUTE that it is done and safe. Checkout ${t.wt} (branch ${t.branch}); do not edit, commit, push or git stash; only run commands and read.
Claims to refute: ${JSON.stringify(impl)}
Spec:
${t.spec}
Run independently (do not trust the report): ${t.gates}. Report ok=true only if everything is green and every Done item is met; put the head sha in "head"; list every concrete failure with the command and the error text.`
}

log('Wave 4b: hds#322 code half and the ops 0.19.1 bump run in parallel; each is reviewed (up to two fix rounds) and refuted. ops commits stay local: Adrian pushes.')

const results = await pipeline(
  TICKETS,
  (t) => agent(implPrompt(t), { label: `implement:${t.key}`, phase: 'Implement', schema: IMPL_SCHEMA }),
  async (impl, t) => {
    let review = await agent(reviewPrompt(t, impl, 1), { label: `review:${t.key}`, phase: 'Review', schema: REVIEW_SCHEMA })
    let rounds = 0
    let last = impl
    while (review && review.verdict === 'changes' && rounds < 2) {
      rounds++
      log(`${t.key}: review round ${rounds} found ${review.blocking.length} blocking, ${review.specGaps.length} spec gaps; fixing`)
      last = await agent(fixPrompt(t, review), { label: `fix:${t.key}:${rounds}`, phase: 'Review', schema: IMPL_SCHEMA })
      review = await agent(reviewPrompt(t, last, rounds + 1), { label: `review:${t.key}:${rounds + 1}`, phase: 'Review', schema: REVIEW_SCHEMA })
    }
    return { impl: last, review, rounds }
  },
  async (r, t) => {
    const verify = await agent(verifyPrompt(t, r.impl), { label: `verify:${t.key}`, phase: 'Verify', schema: VERIFY_SCHEMA })
    return { ticket: t.key, repo: t.repo, branch: t.branch, wt: t.wt, ...r, verify }
  },
)

return results.filter(Boolean)