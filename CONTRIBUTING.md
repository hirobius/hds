# Contributing to Hirobius Design System (HDS)

Issues and pull requests are welcome. This page is the short form.
The gate list and the less common tasks are in [docs/CONTRIBUTING-DETAIL.md](docs/CONTRIBUTING-DETAIL.md).

## Setup

You need Node.js `v25` (see `.nvmrc`) and pnpm `10.x` (`npm install -g pnpm@10`).

```bash
pnpm install
pnpm dev          # Vite dev server
```

## Check your change

```bash
pnpm typecheck && pnpm test
```

- The husky hooks run more gates on commit and on push. Never use `--no-verify`: when a gate fails, fix the cause.
- Run `pnpm smoke:consumer` for a change that ships in the package.
- Run `pnpm check:repo-docs` after you edit `README.md`, this file, `CLAUDE.md` or `AGENTS.md`.
- Do not hand-edit a generated file. `docs/state-surfaces.json` marks them. Edit the generator or its source.
- For a visual change, check the visual baselines ([detail](docs/CONTRIBUTING-DETAIL.md)).

## Find and record work

- Work is tracked as GitHub Issues in this repo, never in a local file.
- Pick an open issue whose `Blocked by` section lists only closed issues.
- The label vocabulary is in `docs/agents/triage-labels.md`.
- Project state (what is next, what is blocked, what shipped) is read from issues, `package.json` and `CHANGELOG.md`.
- The one hand-written line is `focus` in `status.json`.

## Branch and commit

- Never push to `main`. Work on a branch. Remote Claude Code sessions push to their `claude/*` branch only.
- Never `--amend` to hide breakage. Make a fix-up commit and say what went wrong in its message.
- Never `git reset --hard main` without explicit instruction.
- The full list of hard rules is in `CLAUDE.md`, "Hard rules".

Commit format:

```
<type>(<scope>): <one-line summary> (#<issue>)

<body explaining the why>

Co-Authored-By: <agent name> <noreply@example.com>
```

Commits written by an agent end with one plain `Co-Authored-By` trailer, as above.

## Pull request

- `.github/PULL_REQUEST_TEMPLATE.md` fills the body when you open a PR on GitHub.
- Pasted validator output is mandatory. Run the gates locally and paste the terminal output before you request review.
- A visual change needs screenshots in the PR body.
- A merge needs an independent `Reviewed: PASS — <sha>` comment on the head commit.

## Questions and reports

- Open a GitHub issue on this repository for a bug, a feature request or a question.
- For a security report, follow [SECURITY.md](SECURITY.md).
