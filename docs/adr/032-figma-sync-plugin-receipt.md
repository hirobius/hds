# ADR-032: The Sync Plugin Fetches Its Model; the Promote Plugin Stays Baked

**Status:** Proposed (2026-10-01); amended 2026-10-07: Sync targets the one library, not staging (see [Amendment (2026-10-07)](#amendment-2026-10-07-sync-targets-the-library)). Refines ADR-025 §2 ("Push on Pro") and works inside ADR-026 §2 (agents and plugins write to staging, never to the library), which ADR-026's 2026-10-07 amendment replaced. hds#411, child C1 of epic hds#397.

## Context

Until now every token change took four hand-offs between an agent and Adrian (hds#397):

1. An agent runs `pnpm figma:push`, and Adrian overwrites the three development plugin files. The model is baked into `code.js` (180,680 B on 2026-10-01), and the manifest allows no network (`allowedDomains: ["none"]`).
2. In staging: **Plan push**, then **Push**.
3. **Take snapshot**, then **Download JSON**.
4. Adrian hands the JSON to an agent, which runs `pnpm figma:snapshot --ingest` and commits `figma/snapshot.json`.

Step 1 exists only because the model travels inside the plugin. Between 2026-09-17 and 2026-09-30 the runtime changed once and the model 13 times, so almost every copy of the plugin files carried data, not code. Adrian, 2026-10-01: "I want to try it soon for sure."

The Storybook deploy already builds from every `main` commit and serves static JSON with `access-control-allow-origin: *` (`/hds-manifest.json`). A Figma development plugin may fetch from the origins its manifest lists, and its window (a `null`-origin iframe) can read a response served with that header.

## Decision

### 1. The Sync bundle is data, built by the deploy and never committed

`node scripts/figma-push.mjs --bundle <out>` writes
`{ schemaVersion, commit, modelHash, payload, checksum, pluginBuild, pluginFiles, base }`:

- `payload` is a full push (`scope: null`) that never prunes (`prune: false`), and `checksum` is `hdsChecksum(JSON.stringify(payload))`, the same pair a baked plugin carries.
- `pluginBuild` is the Sync plugin build main expects (§2), and `pluginFiles` gives each plugin file's checksum, so a refusal can name the `code.js` to expect.
- `base` is the committed `figma/snapshot.json` (`null` when none). The receipt pages of hds#397 C2 will be a delta against it.
- `commit` comes from Vercel's system variable `VERCEL_GIT_COMMIT_SHA`, else `git rev-parse HEAD`.

`vercel.json`'s `buildCommand` ends with `&& node scripts/figma-push.mjs --bundle storybook-static/figma/sync-bundle.json`, so the deploy serves it at `https://hirobius-design-system.vercel.app/figma/sync-bundle.json`. The step needs no secret and no network. If it fails (an invariant violation, a corrupt committed snapshot, unusable keys in `figma/links.json`, no commit), it prints the reason and the fix and exits 1, and `&&` fails the deploy: the previous deploy, with its consistent bundle, stays live. The bundle is generated, so ADR-029's rule that generated artifacts are not committed holds (about 308 KB, 34 KB gzipped).

### 2. The Sync plugin carries code only

`figma/push/plugin/` keeps the id `hds-tokens-sync-dev`, so Figma needs no re-import; overwriting its three files is enough. Its name becomes **HDS tokens sync**. Menu: **Sync** · Plan (dry run) · Check this file · Mark this file as HDS staging.

- **No model inside.** `code.js` holds the runtime (`figma-runtime.mjs`) and the Sync code (`figma-sync-runtime.mjs`), 51,951 B against a 60,000 B budget.
- **One origin.** `networkAccess.allowedDomains` is the Storybook origin from `figma/links.json` and nothing else, with a `reasoning` line. `enablePrivatePluginApi: true` asks Figma for `figma.fileKey`.
- **Sync.** The window fetches the bundle (`cache: 'no-store'`) and hands its text back. The code `JSON.parse`s it and never evaluates it, then checks in this order before it reads the file: reachable, an HTTP 2xx, JSON, the handshake (below), the checksum and `modelHash`, then prune and scope. Then comes the file guard (§3), then `hdsRunPush(figma, payload, checksum, { dryRun: false, prune: false, scope: null })`, which plans, checks conflicts and fonts, applies, re-plans (it fails unless the re-plan is 0) and writes `lastPush`. Then `hdsRunSnapshot`, then the receipt (§4). The title shows the commit, and **Download JSON** saves the snapshot for `pnpm figma:snapshot --ingest`, the fallback.
- **Handshake.** `pluginBuild` is `hdsChecksum` of `code.js` + `ui.html` + `manifest.json`, read with `code.js`'s own `PLUGIN_BUILD` line blanked (a file cannot hold its own checksum), and `code.js` carries it. When the bundle names another build, Sync stops before it reads anything: "This plugin is out of date (build X, main needs Y). … Ask an agent for new plugin files (pnpm figma:push), overwrite manifest.json, code.js and ui.html …, then run Sync again. Expected code.js checksum: Z." The message holds no URL, and only hex from the bundle reaches it, so fetched data cannot plant a link to code. A stale `manifest.json` shows up as an unknown command or a blocked fetch, and a stale `ui.html` as a window that does not answer. Each is refused with the same fix.
- **Prune is forced off in code**, twice: a bundle whose `payload.options.prune !== false` (or whose scope is not `null`) is refused, and the push override sets `prune: false` anyway.

### 3. Where Sync may write is baked in, never fetched

`pnpm figma:push` bakes `stagingFileKey`, `libraryFileKey`, `stagingFileName` and `libraryFileName` from `figma/links.json` into `code.js`. The bundle cannot change them. A bundle that names another staging file changes nothing. Sync and Plan check the file in this order:

1. **Deny:** the library key `c8MaVgwxOlxm4wr8wnH0Z4`, or a file named exactly `HDS Tokens & Components`, is refused whatever else is true.
2. **Allow** `figma.fileKey === '2VgBbVpKiDnu0aftJEVyBQ'`. Any other key is refused.
3. **Where Figma gives no key** (the snapshot records `"key": null`, so the old plugin got none), allow only a file whose root carries the shared plugin data `hirobius/stagingFileKey` equal to the staging key **and** whose name is exactly `HDS Tokens & Components (Copy)`. A duplicate of staging keeps the marker, so the name has to match too.

**Mark this file as HDS staging** writes that marker only when the file's name is exactly the staging name, the key pasted equals the baked staging key, and nothing about the file, its key, name or the pasted key, is the library's. `pnpm figma:push` and `--bundle` refuse to build while either key is null, the two keys are equal, or a name is missing. **Check this file** reads only: it reports the file key Figma gives (recording whether `enablePrivatePluginApi` exposes it on Pro, which is still unverified), the marker, the guard's verdict, `lastPush` and the receipt.

### 4. The receipt head

After a verified push and its snapshot, Sync writes `syncReceipt` (at most 1,024 characters) as shared plugin data `hirobius` on `figma.root`, next to `lastPush`:
`{ v, commit, modelHash, pluginBuild, pushedAt, takenAt, line, counts, post }`. Here `post` is the snapshot checksum, `counts` holds the collection, mode, variable and style counts, and `line` is the push summary. A Sync that changed nothing writes nothing: the receipt already there is kept when its identity matches and the state, stamped with its `takenAt`, still has its `post`. A push that fails or does not re-plan to 0 throws before the receipt, so no receipt ever describes an unverified push. The snapshot pages (`syncSnapshot.0..n`) and the agent that collects them are §6 (hds#417, C2).

### 5. Promotion keeps a baked plugin

Today's `buildDevPlugin` output moves to `figma/push/promote/` as **HDS tokens promote (baked)** (id `hds-tokens-promote-dev`). Its `code.js` and `ui.html` are byte for byte what `buildDevPlugin` writes, and its manifest differs only in id and name. It is the only path for library promotion (ADR-026 §2) and for a deliberate prune (`pnpm figma:push --prune`). The Sync plugin can do neither.

### 6. The snapshot comes back through the receipt (hds#417, C2)

After the verified push and its snapshot, Sync writes the snapshot into the file, so an agent collects it and Adrian downloads nothing.

- **Pages.** `syncSnapshot.0..n` hold `snapshotDelta(base, post)` (`scripts/lib/figma-snapshot-delta.mjs`, pure, shared by `code.js` and Node), keyed by id, against the bundle's `base` when its checksum holds, or `{ full: post }` when there is none. The text is raw JSON up to 12,000 characters; above that the plugin window gzips it with `CompressionStream` at its default level and base64-encodes it, and a window without `CompressionStream` (or one that does not answer) leaves it raw. Pages are at most 15,000 characters, and each is read back after it is written. Measured on the committed snapshots: the 2026-10-01 push (2 creates, 10 descriptions) is 2,874 characters raw, the 74bfb21 → 150cbe3 prune push 8,409 raw (1,536 gzipped), the full snapshot 164,703 raw or 24,640 gzipped (2 pages).
- **Head.** `syncReceipt` gains `lastPush`, `base` (the checksum the delta is against, or `null`), `format` (`json` or `gzip`), `pages` and `sum` (the pages' checksum). The old head goes first, the pages next, and the new head last, so a reader never pairs a head with pages it does not name. A write Figma does not keep leaves no head, and the result says to use Download JSON. A Sync that changed nothing, against the same base, writes nothing.
- **Other writers clear it.** The promote plugin's Push (before it writes) and Take snapshot clear `syncReceipt` and every page. That is its only change; its manifest and window are byte for byte as before.
- **Collector.** `figma/push/use-figma/receipt.js` (generated by `pnpm figma:push`, about 1,100 characters) starts with `if (figma.fileKey !== '<staging>' || figma.fileKey === '<library>') throw`, so in any other file it reads nothing but `figma.fileKey`. It returns the head, page `PAGE` and a live fingerprint: root `lastPush` and the collection, mode, variable and style counts.
- **Ingest.** `pnpm figma:snapshot --from-receipt <files...>` refuses, writing nothing, a read from any file but staging, a missing or page-less receipt, heads that differ between reads, a base other than the committed `figma/snapshot.json`, a missing page or a wrong `sum`, a rebuilt snapshot that does not hash to `post`, and a stale receipt (a live `lastPush` or count that disagrees with the rebuilt snapshot). Then it runs the unchanged ingest.
- **Commit gate.** An agent commits `figma/snapshot.json` only when plain `pnpm check:figma-drift` exits 0 and `pnpm figma:push --plan` prints `updated 0 · created 0 · deleted 0`. `--ci` is not the gate, because it passes drift whenever `lastPush` names another model. Every `use_figma` call is logged in `figma/MCP-LEDGER.md` before it is made.

## Rationale

- **The data moves, the code stays.** A token change now reaches staging with one click. Plugin files change only when the runtime or the Sync code does, and the handshake says when that is.
- **No new trust.** There is no token, server, function or GitHub API. The only new channel is a static GET of data from a host HDS already deploys, through an allow-list of one origin. Everything that decides where to write is in code Adrian copied from an agent, not in what the host serves.
- **Fail closed, and say the fix.** Every refusal names the cause and the next step, and the ones about the bundle name its URL. Each guard has a vm test on `scripts/__tests__/helpers/fake-figma.mjs` (`scripts/__tests__/figma-sync.test.mjs`) that asserts zero writes.
- **Rejected sources:** raw.githubusercontent.com needs a committed model (against ADR-029), caches for 300 s and needs the GitHub API to resolve a commit. npm via jsDelivr ties a sync to a release and ships no model inputs.

## Consequences

- Adrian's routine step is one click: in staging, Plugins > Development > HDS tokens sync > Sync. The snapshot comes back through the receipt (§6), with Download JSON as the fallback.
- The bundle is as fresh as the last deploy of `main`, and its commit is in the title. A deploy that fails keeps serving the previous bundle, which stays internally consistent.
- `figma/links.json` gains `libraryFileName` and `stagingFileName`. Renaming either file in Figma means updating them and rebuilding the plugin.
- A receipt can go stale when something else writes to staging after a Sync (the promote plugin, an agent drawing session, a hand edit). The promote plugin clears it, and the collector checks `lastPush` and the counts against the live file before it trusts `post` (§6). An edit that changes neither (a description typed by hand) passes that check; the commit gate then compares the snapshot with the model, not with the live file.
- Unverified, failing closed: whether a Pro development plugin gets `figma.fileKey` with `enablePrivatePluginApi` (the marker path covers "no"), and whether the plugin window's fetch from a `null` origin succeeds under `allowedDomains` (a failed fetch is refused with the URL and the fix). The first live Sync and **Check this file** settle both.

## Amendment (2026-10-07): Sync targets the library

ADR-026's amendment of 2026-10-07 made the staging copy, `2VgBbVpKiDnu0aftJEVyBQ`, the one
HDS library and dropped the staging duplicate. So §3 changes target, and nothing else in this ADR does:
Sync still carries no model, still never prunes, and the receipt (§4, §6) is unchanged.

- **What is baked.** `pnpm figma:push` bakes `libraryFileKey`, `libraryFileName` and, from
  `retiredFiles`, each retired file's key and name. It refuses to build while the library key
  or name is missing, while `retiredFiles` is missing, or when a retired file has the
  library's key or name. No staging key is baked: HDS Staging, the draft workbench
  ADR-026 added later the same day (amendment A4, `stagingFileKey`), is never a Sync
  target, so Sync refuses it like any file but the library, and the plugin files are the
  same with or without it in `figma/links.json`. `pnpm figma:push` does refuse a staging
  key or name that is the library's or a retired file's.
- **The order of checks.** Deny first: a retired file, by key (`c8MaVgwxOlxm4wr8wnH0Z4`, the
  old library) or by name (`HDS Tokens & Components (old)`), is refused whatever else is
  true. Then allow the library key; any other key is refused. Where Figma gives no key, allow
  only a file marked as the library (shared plugin data `hirobius/libraryFileKey` equal to the
  library key) **and** named exactly `HDS Tokens & Components`. The staging-era marker
  (`hirobius/stagingFileKey`) counts when it holds the library key: Mark stamped the copy
  with it before 2026-10-07, under the copy's old name, so no other file can carry it with
  that value and the library's name.
- **Mark this file as the HDS library** replaces "Mark this file as HDS staging". Its form
  asks Adrian to paste the file's own link (Share > Copy link), not a bare key: where Figma gives no key,
  the key in that link is the one thing that tells the library from the old library, which
  had the library's name until Adrian renamed it "(old)" on 2026-10-07. Mark writes the marker only in a file named
  exactly like the library whose link holds the library key, and refuses a retired file by
  its key, its name, its link or a pasted retired key. The no-marker refusal tells Adrian to
  check the link the same way, and not to Mark a file whose link holds another key.
- **The plugin gets the file key.** The Sync of 2026-10-07 (plugin build 659efcc3, whose
  manifest sets `enablePrivatePluginApi`) recorded `file.key: "2VgBbVpKiDnu0aftJEVyBQ"` in
  `figma/snapshot.json` (#538), where every earlier snapshot recorded `null`. That settles
  the first open question under Consequences: a Pro development plugin gets
  `figma.fileKey`. With the key, Sync refuses c8MaVgwxOlxm4wr8wnH0Z4 by key, whatever the
  file is named, and allows the library by key, whatever it is named. The marker and name
  path above is the fallback for a file where Figma gives no key.
- **Precondition: rename the old library to "HDS Tokens & Components (old)" before loading
  the new plugin files.** It is a precaution for the no-key path, not the only safeguard:
  where Figma gives no key, the old library, until renamed, has the library's name, and
  only the marker and Mark's link check tell it from the library. The order: rename the old
  library, rename the copy "HDS Tokens & Components", overwrite the plugin's three files,
  then Sync.
- **receipt.js** and `--from-receipt` read and accept the library only, and refuse a retired
  key.
- **The promote plugin** (§5) keeps its id and name, so Figma needs no re-import. It no
  longer promotes anything: it is the deliberate prune (`pnpm figma:push --prune`), and only
  Adrian runs it. Sync and `delta.js` never delete. It runs in the library only: its code
  bakes the library and the retired files from `figma/links.json` and applies Sync's file
  guard before any command, and its manifest asks for the file key, so it refuses HDS
  Staging (ADR-026, A4), a retired file and any other file.
- **New plugin files.** The build before this amendment refuses a file named
  "HDS Tokens & Components" by name, so once Adrian renames the copy, Sync needs the files
  `pnpm figma:push` writes from this amendment on. Those files work only once the commit
  that carries them is merged to `main` and the Storybook deploy serves its bundle: until
  then the bundle names the old build, and the new files say the plugin is out of date.
- **Size.** `code.js` now carries its code without the indentation that starts each line
  (the build checks the syntax tree is unchanged): 52,876 B against the 60,000 B budget,
  down from 59,702 B, so the next change has room.
