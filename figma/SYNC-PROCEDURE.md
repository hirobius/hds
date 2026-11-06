# Code-first Figma sync procedure

The order an agent follows to bring the HDS library (`2VgBbVpKiDnu0aftJEVyBQ`)
back to code, and the release gate that waits for it (hds#801). Code is the
source of truth: when Figma and code disagree, Figma changes. The detail of each
command is in [`README.md`](README.md); this page is the order and the limits
learned while clearing the drift in November 2026.

Authority: Adrian, 2026-11-04 on hds#801, agents may edit the library directly,
so no agent waits for a human Figma pass. Publishing the library stays Adrian's.

## The limits that shape the route

- **use_figma takes at most 50,000 characters of script.** The full push scripts
  (`figma/push/use-figma/01-primitive.js` … `05-styles.js`) are larger, so they
  cannot go through use_figma. The agent route is `delta.js`, which carries only
  the change: `pnpm figma:push --delta` keeps each script under 45,000 characters
  and splits a larger change into `delta-1-of-N.js` … `delta-N-of-N.js`.
- **A use_figma result holds about 20 KB.** `snapshot.js` returns the whole
  library (about 165 KB), so an agent re-bases with `snapshot-diff.js`, which
  returns only what changed.
- **`delta.js` refuses while the library has extras.** An extra is a variable,
  mode or style Figma holds that code no longer has. `delta.js` never deletes, and
  it counts extras in the library before it writes, so it stops.
- **Prune is Adrian-only.** The one push that deletes is the promote plugin built
  with `pnpm figma:push --prune` ("Push and prune extras (deletes)"). No use_figma
  script prunes, and an agent never deletes in the library. An agent's part is to
  list the extras and ask Adrian to run the prune.
- **Pro plan: no REST variables API.** Nothing in CI reads Figma. Drift is code
  against the committed `figma/snapshot.json`, never the live file.

## Procedure

Log every use_figma call in [`MCP-LEDGER.md`](MCP-LEDGER.md) first.

1. **Measure.** On an up-to-date main: `pnpm check:figma-drift`. Exit 0 means
   nothing to do. Otherwise it lists `missing`, `extra` and `changed` items per
   collection and mode.
2. **Re-base when the snapshot may be stale.** If the library changed outside the
   repo (a hand edit, or a push that failed part-way) and no Sync receipt covers
   it, `delta.js` will refuse on its pin. Then:
   1. `pnpm figma:push`, and pass `figma/push/use-figma/snapshot-diff.js`
      unmodified to one use_figma call on the library. It only reads.
   2. Save the JSON it returns unedited, for example `/tmp/snapshot-diff.json`.
   3. `pnpm figma:snapshot --from-diff /tmp/snapshot-diff.json` rebuilds
      `figma/snapshot.json` and checks it against the live checksum.
   4. Commit it on its own with a `regen-only` subject, then go back to step 1.
      If the diff returns `tooLarge`, ask Adrian to run Sync, then collect the
      receipt (README, "Agent: collect a sync").
3. **Deal with extras first.** If step 1 lists any `extra`, `delta.js` will refuse.
   Post the list on the issue and ask Adrian to run the promote plugin's prune. If
   the release cannot wait, add each one to `figma/release-drift-baseline.json`
   (below) with the reason. Never delete it with a use_figma script.
4. **Push the change.** `pnpm figma:push --delta`, then one use_figma call per
   script (`delta.js`, or each part in order), unmodified. Save every result to
   its own file, plus the `receipt.js` pages when a result returns only a head.
5. **Ingest.** `pnpm figma:snapshot --from-receipt <every saved file>`.
6. **Verify.** `pnpm check:figma-drift` exits 0 (or lists only baselined
   extras), `pnpm figma:push --plan` prints `updated 0 · created 0 · deleted 0`,
   and `pnpm check:figma-release` passes.
7. **Commit** `figma/snapshot.json` in the same PR as the token change it
   matches, and paste the before and after `check:figma-release` output on it.
   For a release, that PR is the Version PR: sync from its head before the
   merge. The snapshot's `syncedHash` lets the gate accept the squash commit
   (hds#1359), so Release passes in one run with no snapshot PR after it.

If the Figma connection is unavailable, the token PR does not merge with known
drift: label it Figma-sync-pending and say which step stopped.

## The drift checks

| Check                        | Runs in                      | Fails when                                                                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:figma-drift`     | by hand                      | any drift (exit 1), or no snapshot (exit 2)                                                                                                                                                                                                                                             |
| `check-figma-drift.mjs --ci` | `ci.yml`                     | only drift a push cannot explain (Figma was pushed from this exact model, yet differs); other drift is a warning                                                                                                                                                                        |
| `pnpm check:figma-release`   | first step of `pnpm release` | any drift not baselined, a stale or wrong baseline, a `tokensHash` that no longer matches `hirobius.tokens.json`, a `meta/version` or `meta/commit` Figma does not show (a squash of the synced Version PR passes when `syncedHash` matches), or a library component with no Figma node |

### Release drift baseline

`figma/release-drift-baseline.json` lets a release through while extras wait for
Adrian's prune. With no file there is no baseline, and drift must be 0.

```json
{
  "accepted": [
    { "kind": "extra", "name": "nav/height", "reason": "awaiting Adrian's prune (hds#801)" }
  ]
}
```

- Only `extra` items can be baselined. Missing and changed items are what
  `delta.js` pushes, so an agent clears them instead.
- `name` is the name `check:figma-drift` prints after `extra`.
- An entry that is no longer drift fails the gate as stale, so the file only
  shrinks. Delete entries once the prune lands, and the file once it is empty.
