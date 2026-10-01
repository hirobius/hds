## Who is a consumer

One rule, used by `pnpm upgrade:consumers` (`scripts/upgrade/consumers.mjs`, hds#453) and by the ops
dashboard (hirobius/ops#444), so both always count the same repos.

A repo is an HDS consumer when:

1. It belongs to the `hirobius` org and `HDS_FLEET_TOKEN` can see it, public or private.
   `hirobius/hds` itself never counts.
2. On its default branch, the root `package.json` or a workspace `package.json` lists
   `@hirobius/design-system` in `dependencies`, `devDependencies` or `peerDependencies`. Each
   such `package.json` is one importer. Workspaces are the globs in package.json `workspaces`
   (an array, or `{ "packages": [...] }`) and in pnpm-workspace.yaml `packages`, `!` globs
   excluded, matched against the repo tree; nothing under `node_modules` is a workspace.
3. Its installed version, per importer, is what the root lockfile resolves: pnpm-lock.yaml (v6,
   v9), npm-shrinkwrap.json or package-lock.json (v2, v3), yarn.lock (v1, berry) or bun.lock.
   With several lockfiles, package.json `packageManager` picks one. With none, the version is
   unknown. A lockfile that resolves more than one version holds two copies of HDS. The parsers
   are `codemods/lib/installed-version.mjs`, shared with the upgrade command (hds#452).

A consumer stays in the list but is marked **skip**, and gets no upgrade notice, when it is
archived, has issues disabled, or has the `hds-frozen` topic.

**Names stay private.** hds and ops are public, so the list is never committed. Anything posted
to a public surface (a PR comment, an Actions log) goes through `redact()`: public repos are
named, and each private one becomes "private consumer N" with its ranges, versions and counts,
but no name, path or package name. `pnpm upgrade:consumers --out` writes the full list to
`.upgrade-consumers.json`, which is gitignored; the command refuses a path inside the repo that
git would track.

Token: `HDS_FLEET_TOKEN`, a fine-grained token with Contents and Metadata read on the org's
repositories (create it at https://github.com/settings/personal-access-tokens, then save it at
https://github.com/hirobius/hds/settings/secrets/actions). `GITHUB_TOKEN` is accepted locally,
never inside GitHub Actions, where it can only see hds.
