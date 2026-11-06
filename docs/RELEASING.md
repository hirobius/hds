# Releasing @hirobius/design-system

GitHub Actions is disabled on hirobius/hds (Adrian, 2026-10-30) to keep the repo
free. `.github/workflows/release.yml` never runs, so every release is cut by hand
by the owner. Agents never merge, publish or release.

## Who

Owner only (Adrian), from his own laptop, signed in with `npm login` on an
account that can publish the package. npm asks for 2FA at publish.

## Steps

1. **Version PR.** On a branch, run `pnpm changeset:version`. It applies the
   pending `.changeset/*.md`, bumps the version, writes the changelog and
   rebuilds the release artifacts. Open it as the "Version Packages" PR.
2. **Check locally.** Run `pnpm typecheck && pnpm test && pnpm smoke:consumer`
   and paste the results into the PR. No CI will run them.
3. **Review.** The PR needs an independent `Reviewed: PASS — <sha>` comment for
   its head commit, from someone other than the author. A new push voids it.
4. **Merge** the PR (owner), then pull `main` locally.
5. **Dry run.** `pnpm release:local`: every check, the build, the consumer smoke
   and `pnpm publish --dry-run`. Publishes nothing, needs no login.
6. **Publish.** `pnpm release:local --publish`. It refuses unless HEAD is a clean
   checkout of `origin/main` with no pending changesets, and stops if the
   version is already on npm. After the publish it runs
   `pnpm release:announce <version> --apply`: one standing upgrade issue per
   consumer repo that is behind (filed, retargeted, or reopened; never closed),
   and five lines on Discord unless every change is none or additive. Export
   `HDS_FLEET_TOKEN` and `DISCORD_WEBHOOK_URL` in your shell first; a missing
   one skips its step. It never fails the release: re-run it by hand with the
   same command once a token is fixed.

## What changed from the Actions release

- **No provenance.** npm provenance came from OIDC in Actions. Don't pass
  `--provenance`; it fails outside a supported CI.
- **The tag stays local.** `changeset publish` tags `v<version>` on the laptop;
  pushing from a laptop is forbidden (CLAUDE.md §0).
- **No Chromatic, no CI.** Visual changes carry before/after screenshots in the
  PR; checks are the husky hooks plus the commands in step 2.

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
