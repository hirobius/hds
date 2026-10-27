# Releasing @hirobius/design-system

How a release is cut lives in [CONSUMING.md](../CONSUMING.md), "Maintainers:
cutting a release". This file is what to do when one goes wrong.

## If a release is bad

npm never unpublishes a version people may already have installed, so a bad
release is **deprecated** and `latest` is moved back to the last good version.
Trusted Publishing only grants the release workflow publish rights, so these
two commands need Adrian's own npm login (an owner of the package).

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
