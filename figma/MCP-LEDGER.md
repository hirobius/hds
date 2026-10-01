# Figma MCP ledger

Every Figma MCP call an agent session makes is logged here **before** the call
is made: add the row, make the call, then fill in its result. A call that is
not in the ledger was not budgeted.

## Budget

- **200 MCP read calls a day and 10 a minute** on the Figma Professional plan
  (ADR-026 §4). Count every `use_figma` call against it too, read or write:
  whether Figma counts them is unverified, so the ledger assumes it does.
- **Never retry a rate-limit error.** Stop and report it; a retry loop spends
  the day's budget in a minute.
- `use_figma` writes are a free beta that Figma has said will become
  usage-billed (ADR-026 §5).
- **Write target: staging `2VgBbVpKiDnu0aftJEVyBQ` only.** The published
  library `c8MaVgwxOlxm4wr8wnH0Z4` is read-only to agents (ADR-026 §2,
  `figma/links.json`).
- Collecting a Sync (`figma/README.md`, "Agent: collect a sync") costs one
  `use_figma` read per receipt page: 1 for a delta, 2 for a full snapshot, plus
  one `get_figma_skill` load when the figma-use skill is not loaded yet.
- An agent sync (`figma/README.md`, "Agent sync (zero clicks)") costs one
  `use_figma` write with `delta.js`, plus one `receipt.js` read per page when its
  receipt needs more than one page, plus the skill load.

## How to log

One section per session: `## <date> · session <branch or id>`, then one row per
call, numbered from 1 in the order made. Kind is `read`, or `write (n/cap)` when
the session has a write cap. End the section with the session's totals.

| #   | Time (UTC) | Tool | Kind | Purpose | Result |
| --- | ---------- | ---- | ---- | ------- | ------ |

## 2026-09-27 · session `claude/new-session-pjw4qx`

Carried over from hds PR #304 (2026-09-27 build-out handoff). Session caps: 40
calls total, 15 `use_figma` writes.

| #   | Time (UTC) | Tool                                   | Kind         | Purpose                                                                                                                                             | Result                                                                                                                                                                                                                                                                                   |
| --- | ---------- | -------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 06:10      | `get_figma_skill` (figma-use SKILL.md) | read         | Mandatory skill load before any `use_figma`                                                                                                         |                                                                                                                                                                                                                                                                                          |
| 2   | 06:14      | `use_figma`                            | write (1/15) | Carrier test: create one throwaway collection + variable in staging, probe `setSharedPluginData` and `figma.fileKey`, then delete both              | OK. Write + delete work; shared plugin data works on variables and root; `figma.fileKey` = staging. Found 6 collections already present and `lastPush` 2026-09-23 (model `8f136b88`), so the committed snapshot (09-22) is stale                                                         |
| 3   | 06:20      | `use_figma`                            | read         | Run the generated read-only `snapshot.js` against staging to replace the stale 09-22 snapshot                                                       | FAILED at `hdsVerifyRuntime`: runtime checksum mismatch (nothing read)                                                                                                                                                                                                                   |
| 4   | 06:24      | `use_figma`                            | read         | Diagnose #3: return `String(fn)` for each snapshot function as the sandbox sees it (diffed locally against the generated source), plus the snapshot | 8/10 functions byte-identical to generated source (so transcription is not the cause; `hdsVerifyRuntime`/`hdsRunSnapshot` unechoed). **Output is truncated at 20 KB**, so a 255 KB snapshot cannot return through `use_figma`. Snapshot → dev plugin                                     |
| 5   | 06:31      | `use_figma`                            | read         | Verify the 41 staged components: node exists, type, name, variant count, description present, bound-variable vs raw-fill counts                     | 41/41 present, names + variant counts match the record, all descriptions set, 0 clipped sets. 806 solid paints variable-bound, 2 raw (Lightbox 1, Icon page 1). 231 of 313 text layers (in 32 components) carry no text style. `StatusDot`/`Icon` records point at their PAGE, not a set |
| 6   | 06:36      | `get_screenshot`                       | read         | Visual spot-check of one batch representative: ToggleButton set `2028:27` (12 variants)                                                             | URL returned, but this container's egress proxy blocks figma.com, so it can't be downloaded                                                                                                                                                                                              |
| 7   | 06:39      | `get_screenshot` (base64)              | read         | Same spot-check as #6, returned inline because the URL is unreachable from this container                                                           | Renders cleanly: 12 variants in a grid, no clipping or overflow. The on-state fill is hard to tell apart from the canvas at this scale; recheck in Dark after the push                                                                                                                   |

**Session total: 7 of 40 calls, 1 of 15 `use_figma` writes.** No rate-limit
errors. The library `c8MaVgwxOlxm4wr8wnH0Z4` was not touched. The push and
snapshot were left to the dev plugin (ADR-029 §1), so this session made no
variable writes beyond the carrier test.

## 2026-10-01 · orchestrator session (hds#397, hds#418)

Logged after the calls, from the #397 and #418 issue comments that report
them, so each time is when the result was reported. Kind counts the
`use_figma` calls by what they did.

| #    | Time (UTC) | Tool                                   | Kind               | Purpose                                                                                                                                      | Result                                                                                                                                                                                                                                                                                                                              |
| ---- | ---------- | -------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–20 | by 05:15   | `use_figma` ×19 + `get_figma_skill` ×1 | read ×18, write ×2 | Staging: the #397 go/no-go probe, a layer census, rebinding 4 layers, deleting the 3 moved variables, and snapshot reads (PR #419)           | GO. `hdsVerifyRuntime` passes under use_figma, `figma.fileKey` is staging, and the fonts are present. `CompressionStream` is absent. Variable descriptions read back HTML-escaped and `figma.root.name` is "Document". 4 layers were rebound and 7:19, 14:28 and 15:18 removed. Live checksum with decoded descriptions: `242fe0c9` |
| 21   | by 06:07   | `use_figma`                            | write              | Staging: the #418 step 6 write round-trip probe. A temporary collection `zz-hds-roundtrip-probe` was created, written, read back and removed | Writes store raw text and reads escape once (`a"b'c<d>e&f` read back as `a&quot;b&#39;c&lt;d&gt;e&amp;f`). 6 collections before and 6 after                                                                                                                                                                                         |

**Session total: 21 calls, 20 of them `use_figma`, 3 of them writes.** No
rate-limit errors. The library `c8MaVgwxOlxm4wr8wnH0Z4` was not touched.
