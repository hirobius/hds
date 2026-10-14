# Design refs: the nightly run

You are the nightly design-refs run for HDS. Work in the `hds` repository on your
session's designated `claude/*` branch. Background: [`README.md`](README.md). Settings:
[`config.json`](config.json). Do the steps in order and stop early when a step says so.

Budget per night: at most **3 new images** and **2 new proposals**. Leave the rest for
the next night.

## 0. Start

1. `git fetch origin main` and merge it into your branch if your branch's PR was merged
   or `main` moved (merge, never rebase).
2. `pnpm install --frozen-lockfile` if `node_modules` is missing.
3. `pnpm eval:refs -- --check` must pass before you change anything. If it fails on
   `main`'s data, fix that first.

## 1. Collect decisions

1. If `config.json` `board.url` is null, skip to step 3.
2. Read the board's decisions: `ArtifactData` `list`, `url` = `board.url`, `collection`
   = `decisions`. Write them to `reports/refs/board-decisions.json` as
   `[{ "id": <doc id>, "decision", "reason", "decidedAt" }]`, then run
   `pnpm eval:refs -- --merge-decisions reports/refs/board-decisions.json`.
   A reject without a reason is skipped: ask Adrian for the reason in your final message.

## 2. Apply approved proposals

For each `approve` in `decisions.json` that has no later `approve` entry carrying a `pr`:

1. Apply `proposals/<id>.json` `change` exactly: token edits in `hirobius.tokens.json`,
   then the repo's token build and generators (`pnpm tokens:build`; follow
   `docs/rules/MANIFEST_SYNC.md`); component work follows `/implement` + `/tdd`.
2. Add the changeset and upgrade note the push gate asks for (CLAUDE.md "GUARDRAILS").
3. Update each evidence ref's `src/App.tsx` to use the change, run
   `pnpm eval:refs -- --render <evidence ids> --record`, and re-score each rubric. The
   change is confirmed when the scores rise as the proposal said; if they do not, stop
   and tell Adrian instead of opening the PR.
4. `pnpm typecheck && pnpm test` must be green.
5. Commit, push, and open (or update) the PR for your branch with `/pr`. Title:
   `refs: apply <id>`. The body names the evidence refs and their before and after scores.
6. Append `{ "proposal": <id>, "decision": "approve", "at": <same at>, "refCount": <same>,
"pr": <PR URL> }` to `decisions.json`.

## 3. Ingest new images, one at a time

List the folder: Google Drive `search_files`, query
`parentId = '<config.drive.folderId>' and mimeType contains 'image/'`. A file is new when
no `eval/refs/refs/*/ref.json` has its id as `source.drive.fileId`. Take the oldest first.
For each new image:

1. **Download** in a subagent, so the base64 never enters your context: it calls
   `download_file_content` with the file id; the harness saves an oversized result to a
   file; it runs `jq -r '.content' <that file> | base64 -d > reports/refs/sources/<ref-id>.<ext>`
   (a small result arrives inline: write it to a file and decode the same way). HEIC
   cannot be rendered: log it in your final message and skip it.
2. **Look** at the image (Read the file). Pick a ref id `YYYY-MM-DD-<slug>` (today's
   date, 2 to 4 words), a title, `surface`, `viewport` (390 for a phone screen, else 1280)
   and `theme`. Then:
   `pnpm eval:refs -- --scaffold <ref-id> --drive-id <id> --name "<file name>" --surface <s> --viewport <w> --theme <t> --title "<title>"`
3. **Read the system first**: `DESIGN.md`, `public/llms.txt`, `public/hds-manifest.json`
   (components), the scales in `hirobius.tokens.json`, `INDEX.md` (earlier rebuilds to
   reuse), and `pnpm eval:refs -- --vocab`.
4. **Rebuild** the image in `src/App.tsx` with only `@hirobius/design-system` imports: no
   raw hex, px, Tailwind classes, raw HTML controls, custom CSS or `style` spacing. Use
   the image's own words where they are generic; replace names, emails, phone numbers
   and anything personal with invented placeholders (`555-01xx`, `example.com`).
5. **Render and compare**: `pnpm eval:refs -- --render <ref-id>`, then look at
   `reports/refs/renders/<ref-id>.png` beside the original. Improve the rebuild with the
   system, up to 3 rounds. Never reach for a one-off to close a gap; log it instead.
6. **Score**: fill `fidelity.rubric` (layout, spacing, type, color, components, 0 to 4
   each, judged honestly against the original) and `fidelity.score` (sum x 5), then
   `pnpm eval:refs -- --render <ref-id> --record`. If it prints a `check` line, look
   again and correct the rubric or say why in `fidelity.notes`.
7. **Log every gap** in `gaps.json`: what the image needs that the rebuild could not
   match, and why. Be specific (`"measured": "~160px between sections"`, `"nearest":
"space.32 = 128px"`, `"want": { "scale": "primitive.space", "px": 160 }`). Reuse ids
   from `--vocab`. Write `[]` only when nothing was missed.
8. **Write `card.md`**: what works (the patterns a build agent can copy), the closest
   tokens, and every gap id. Text only, 30 lines at most.
9. `pnpm refs:index`, then `pnpm eval:refs -- --check` must pass.
   Commit: `refs: add <ref-id>`.

## 4. Propose

1. `pnpm eval:refs -- --candidates --json`. A candidate with no `proposals/<id>.json`, or
   with `state: "resurfaced"`, needs a proposal.
2. Design the change. Prefer extending an existing scale (`--scale <scale> <px>`); a
   `high` risk from `--scale` needs a strong reason or a different change. Respect
   `docs/ai/NORTH_STAR.md`: a `driftRisk` candidate defaults to `reject` unless app or
   dashboard work also needs it.
3. Measure it in a scratch worktree: `git worktree add ../hds-<id> HEAD` and
   `ln -s "$PWD/node_modules" ../hds-<id>/node_modules`, apply the change there, update the evidence rebuilds to use it, and from the worktree run
   `node scripts/eval-refs.mjs --render <evidence ids> --out <this repo>/reports/refs/proposals/<id>`.
   Score each "after" rubric by looking at the render beside the original. For a change
   to an existing token, also render every ref there with
   `--render --all --out <this repo>/reports/refs/proposals/<id>/all` and run
   `pnpm eval:refs -- --diff reports/refs/renders reports/refs/proposals/<id>/all` for
   the visual diff of existing pages; `--blast <token>` lists what reads it. Remove the
   worktree after.
4. Write `proposals/<id>.json` (fields: README "Proposals"; validator:
   `scripts/lib/refs/proposal.mjs`). `--check` must pass. Commit: `refs: propose <id>`.

## 5. Publish the board

1. `pnpm eval:refs -- --board reports/refs/board.html`.
2. If `board.url` is null: publish it with the Artifact tool (`file_path` the board,
   `icon` "review", `capabilities` = `BOARD_CAPABILITIES` from
   `scripts/lib/refs/board.mjs`), save the URL in `config.json` `board.url`, and commit.
   Otherwise read `board.url` once (`action: "read"`), then publish the new file with
   `url` = `board.url`, omitting `icon` and `capabilities`.

## 6. Finish

1. `pnpm eval:refs -- --check` and `pnpm test` green; push your branch.
2. Message Adrian only when there is something for him: new proposals on the board (the
   link), a PR for an approved change (the link), a reject that needs a reason, or a
   blocker. Five lines at most, plain words. A night with nothing new ends silently.
