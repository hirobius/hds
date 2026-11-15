# Checks and merge

## Work protocol

1. Pre-filter. Before you write code, decide if the request affects UI, layout, CSS or components.
2. Auto-validate. If it does, run `pnpm typecheck` and `pnpm test` after your changes and before your final answer.
3. Self-heal. If a test fails, do not ask the user for help. Read the output, find the error, fix it, run again.
4. Finalize. Report only when the tests are green. Do not call a task complete while a test fails.

- The visual surface is the docs site, `docs-site/`.
- `check-docs-axe` gates its accessibility.
- Chromatic is off. Attach screenshots.

## GitHub Actions

- `release.yml` runs on each push to `main`. It opens the "Version Packages" PR and publishes when that PR merges.
- Do not wait on CI, Chromatic, `ralph-gate` or `claude.yml` for a pull request.
- A missing check is not a pass and not a fail.
- Do not edit `.github/workflows/`. Write the change for Adrian.

## Local checks before a push

- The husky hooks run on commit and on push. Do not skip them.
- Run `pnpm typecheck && pnpm test`.
- Run `pnpm smoke:consumer` for anything that ships.
- Paste the results in the pull request.
- The full gate list is in `docs/CONTRIBUTING-DETAIL.md`.

## Merge rule

- A merge needs an independent review comment on the pull request: `Reviewed: PASS — <sha>`.
- The comment names the head commit. It comes from someone other than the author.
- A new push voids it.

## Release

- Agents never run `npm publish` by hand.
- Agents never run `pnpm check:release` or a deploy command.
- The release runs from GitHub Actions when the "Version Packages" PR merges.
- The orchestrator can cut the release. It merges the Version PR after the Figma meta sync and an independent PASS on its head. Then it reports to Adrian.
- Who merges the Version PR, and the steps: `docs/RELEASING.md`.
