# Releasing @hirobius/design-system

Releases publish from GitHub Actions: `.github/workflows/release.yml` runs on
every push to `main` (checked 2026-11-06). Agents never merge the release PR,
publish or release.

## Who

The owner (Adrian) merges the "Version Packages" PR. The Release workflow then
publishes through npm Trusted Publishing (OIDC): no npm token, no laptop login.

## Steps

1. **Version PR.** Each push to `main` makes the Release workflow open or update
   the "Version Packages" PR (`changeset-release/main`): it applies the pending
   `.changeset/*.md`, bumps the version and writes the changelog.
2. **Figma first, on the Version PR.** `pnpm release` starts with
   `pnpm check:figma-release`, which refuses to publish when the committed
   `figma/snapshot.json` differs from code, above all `meta/version` against the
   version being released. So, before the merge, the ops agent runs the meta
   delta sync (`figma/README.md`, "Agent sync (zero clicks)") from the Version PR
   head, ingests the snapshot and commits `figma/snapshot.json` to that PR. The
   squash merge gives that commit a new sha, so `meta/commit` cannot equal it;
   the gate instead takes Figma's `meta/commit` when the snapshot's `syncedHash`
   (the content of the synced inputs at ingest) equals main's (hds#1359). One
   Release run, no snapshot PR after the merge.
3. **Review.** The PR needs an independent `Reviewed: PASS — <sha>` comment for
   its head commit, from someone other than the author. A new push voids it.
4. **Merge** the PR (owner). The Release workflow runs `pnpm release`:
   `check:figma-release`, `pnpm audit`, `build:lib`, the consumer smoke, the pack
   scan, then `changeset publish`.
5. **Announce.** The workflow does not announce. After the publish, run
   `pnpm release:announce <version> --apply` by hand. It files one standing
   upgrade issue per consumer repo that is behind and posts five lines on Discord
   unless every change is none or additive. It needs `HDS_FLEET_TOKEN` and
   `DISCORD_WEBHOOK_URL`; a missing one skips its step, and it never fails the
   release.

## Fallback: release from the laptop

When the workflow cannot publish (Trusted Publisher entry missing, Actions
down), the owner releases by hand, signed in with `npm login` (npm asks for 2FA):

1. Pull `main` after the Version Packages merge.
2. **Dry run.** `pnpm release:local`: every check, the build, the consumer smoke
   and `pnpm publish --dry-run`. Publishes nothing, needs no login.
3. **Publish.** `pnpm release:local --publish`. It refuses unless HEAD is a clean
   checkout of `origin/main` with no pending changesets, and stops if the
   version is already on npm. It then runs `pnpm release:announce` as in step 5.

A laptop release differs from the workflow: it has no npm provenance (do not pass
`--provenance`), and the `v<version>` tag stays local, because pushing from a
laptop is forbidden (CLAUDE.md §0).

Script: `scripts/release-local.mjs` (ops#771). The rest of this file is what
to do when a release goes wrong.

## If a release is bad

npm never unpublishes a version people may already have installed, so a bad
release is **deprecated** and `latest` is moved back to the last good version.
These two commands need Adrian's own npm login (an owner of the package).

1. See what the yank will do. It is a dry run unless you pass `--apply`:

   ```sh
   pnpm release:yank <bad> "<what is broken>"
   ```

   It prints the two npm commands, the GitHub Release edit, the Discord post,
   and every standing upgrade issue it would edit or close. The last good
   version is the newest published one below `<bad>` that npm does not mark
   deprecated; pass `--good <version>` to pick another.

2. Run the npm commands it printed, logged in as an owner (`npm login`):

   ```sh
   npm deprecate @hirobius/design-system@<bad> "Broken: use <good>. <what is broken>"
   npm dist-tag add @hirobius/design-system@<good> latest
   ```

   Check both on https://www.npmjs.com/package/@hirobius/design-system/access
   and with `npm view @hirobius/design-system dist-tags`.

3. Apply the rest:

   ```sh
   HDS_FLEET_TOKEN=<token> GITHUB_TOKEN=<token> DISCORD_WEBHOOK_URL=<url> \
     pnpm release:yank <bad> "<what is broken>" --apply
   ```

   - The GitHub Release `v<bad>` gets "(yanked)" in its name and the reason
     above its notes (`GITHUB_TOKEN`: Contents read and write on hirobius/hds).
   - Discord gets five lines (`DISCORD_WEBHOOK_URL`).
   - Every open standing upgrade issue in a consumer repo that targets `<bad>`
     moves back to `<good>`, with a comment carrying the rollback steps below,
     or is closed when that repo is already on `<good>` (`HDS_FLEET_TOKEN`:
     Issues read and write on the consumer repos).

   A missing variable skips its step and names the variable; run it again
   with the variable set. A re-run leaves an already-yanked Release and
   already-moved issues alone, but Discord posts again: leave
   `DISCORD_WEBHOOK_URL` unset on a re-run. Without `HDS_FLEET_TOKEN` the dry
   run cannot list the issue edits either.

4. Ship the fix as a new release. The upgrade command
   (`npx @hirobius/design-system@latest upgrade`) skips versions npm marks
   deprecated, so consumers move straight past `<bad>`.

### What a consumer does

The upgrade command refuses downgrades and codemods only run forward, so the
way back is git. The same steps are in UPGRADING.md and in the yank comment:

1. Revert the upgrade PR (`git revert -m 1 <merge commit>`), so the code,
   package.json and lockfile go back together.
2. Pin the exact last good version, with no `^`, then install.
3. Once a fixed version ships, run `npx @hirobius/design-system@latest upgrade`
   again.

### Policy

There are no backports before 1.0: a fix ships as a new release, never as a
patch to an older line.
