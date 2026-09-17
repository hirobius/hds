# ADR-025: Figma Sync on the Pro Plan — One Way, Local Push, Snapshot Drift

**Status:** Proposed (2026-09-16). Supersedes ADR-019 §2 (tokens → Figma variables through the REST workflow).

## Context

ADR-019 moved Figma work to first-party tools. Its §2 kept two things for tokens → Figma
variables: the `scripts/build-figma-variables.mjs` payload generator and the REST-based
`sync-figma-variables.yml` workflow. By 2026-09-16 neither gives HDS a working sync:

1. **The REST variables API is Enterprise-only.** `GET`/`POST /v1/files/:key/variables`
   needs an Enterprise Full seat. HDS's Figma account targets the Professional plan. The
   workflow is archived in `.github/workflows-archive/`, and nothing replaced it.
2. **The archived REST payload is malformed anyway.** `buildAPIFormat()` uses the temporary
   id `mode:<collection>:default|light` both as a collection's `initialModeId` and as a
   separate mode `CREATE`. Figma's endpoint expects temporary ids to be unique within a
   request, and the initial mode is renamed with an `UPDATE`, not created a second time.
3. **The exporter loses dark mode.** It reads modes from `$extensions['com.hirobius.modes']`,
   but tokens carry them under `$extensions['com.figma.variables'].modes`, which
   `build-tokens.mjs` reads. Every two-mode Semantic and Component variable is exported
   with Dark equal to Light. The export also drops the 20-token `role` tier, flattens
   typography into scalar variables, and skips shadows, so no text styles or effect styles
   come out of it.
4. **There is no drift check.** Nothing compares the Figma library with the tokens.
   `scripts/figma-diff.mjs --dry-run` diffs built-in synthetic data, not a Figma read.
5. **No Code Connect mapping is live.** The 34 `*.figma.tsx` files are commented-out stubs
   in the `figma.connect()` format that Code Connect 2 replaced with template files, and
   publishing custom Code Connect needs an Organization or Enterprise plan.
6. **The Figma side is a partial working file** ("HDS Tokens & Components"), edited by
   hand through the MCP server (hds#109). No repo file links to it.

What the Pro plan does allow, as checked on 2026-09-16:

| Capability                                              | Pro                                                                                       | Organization                                      | Enterprise                       | Source                                                                                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom Code Connect publish (Dev Mode snippets)         | No (pricing page lists it for Figma's own UI kits only)                                   | Yes, Full or Dev seat                             | Yes                              | [Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect), [plans](https://help.figma.com/hc/en-us/articles/360040328273), [pricing](https://www.figma.com/pricing/) |
| `figma connect parse` / `preview` / `migrate`           | Yes, local, no token, no network                                                          | Yes                                               | Yes                              | [CLI reference](https://developers.figma.com/docs/code-connect/cli-reference/)                                                                                                                  |
| `figma connect publish` / `create` / `unpublish`        | Needs a token and the API; rejection expected (unverified, including `publish --dry-run`) | Yes (PAT: Code Connect Write + File content Read) | Yes                              | CLI reference, [quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)                                                                                                   |
| Variables through REST (read and write)                 | No                                                                                        | No                                                | Yes, Full seat                   | [REST variables](https://developers.figma.com/docs/rest-api/variables/)                                                                                                                         |
| Plugin API variables / `use_figma`                      | Yes (remote MCP on all plans; writes are a free beta that will become usage-billed)       | Yes                                               | Yes                              | [MCP guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)                                                                                              |
| MCP read-tool limits                                    | 200/day, 10/min                                                                           | 600/day, 20/min                                   | Same as Organization             | [rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)                                                                                                           |
| Native variable JSON import and export                  | Yes (one mode per imported file)                                                          | Yes                                               | Yes                              | [modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)                                                                                              |
| Modes per collection                                    | 10                                                                                        | 20                                                | Unlimited (extended collections) | [plans](https://help.figma.com/hc/en-us/articles/360040328273)                                                                                                                                  |
| Dev Mode, dev resources (links), component playground   | Yes, Full or Dev seat                                                                     | Yes                                               | Yes                              | [Dev Mode guide](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)                                                                                                     |
| Dev resources through REST (`file_dev_resources:write`) | No plan restriction documented (unverified on Pro)                                        | Yes                                               | Yes                              | [endpoints](https://developers.figma.com/docs/rest-api/dev-resources-endpoints/)                                                                                                                |
| Component description + documentation link              | Yes                                                                                       | Yes                                               | Yes                              | [descriptions](https://help.figma.com/hc/en-us/articles/7938814091287-Add-descriptions-to-styles-components-and-variables)                                                                      |
| Storybook Connect plugin / addon-designs                | Yes, "any team or plan" (needs Chromatic, which HDS has)                                  | Yes                                               | Yes                              | [Storybook and Figma](https://help.figma.com/hc/en-us/articles/360045003494-Storybook-and-Figma)                                                                                                |
| Private plugins, branching, library analytics           | No                                                                                        | Yes                                               | Yes                              | [plans](https://help.figma.com/hc/en-us/articles/360040328273)                                                                                                                                  |

## Decision

### 1. The repo is the source of truth, and sync runs one way

`hirobius.tokens.json` and `tenants/*/tokens.json` are the source. Sync runs code → Figma.
A hand edit in Figma is drift to report, not a change to import back.

### 2. One tested model feeds every Figma target

```
 hirobius.tokens.json ─┬─ pnpm tokens ─────────────► tokens.css / TS / npm dist / tenants.css ([data-brand])
 tenants/*/tokens.json ┤
                       └─ pnpm figma:model (pure function, golden-tested) ─► figma/model.json
                              collections × modes × variables, keyed by token path
                              + text styles (typography) + effect styles (shadow, elevation)
                              + a declared "not in Figma" list (motion, spring, breakpoints, z-index)
                                        │
          ┌─────────────────────────────┼─────────────────────────────────────────┐
     PRO (target now)             ORGANIZATION                               ENTERPRISE
  pnpm figma:push (local, manual)  same push path                             REST POST /v1/files/:key/variables
   = use_figma via remote MCP,     + private plugin shared in the org         in CI (live, no snapshot);
     or a local dev plugin         + 20 modes per collection                  extended collections for tenants
   upsert by token path (never
   delete without --prune)
  fallback: per-collection × per-mode DTCG files → Variables ▸ Import (UI)
                                        ▼
  Figma library "HDS Tokens & Components" (published team library)
   Primitives (1 mode, hidden) · Brand (1 mode per demo tenant, ≤10 on Pro) · Semantic + Role (Light/Dark)
   · Density (Comfortable/Compact) · Component (aliases only)
                                        │ pnpm figma:snapshot (use_figma read) → figma/snapshot.json (committed)
                                        ▼
  DRIFT: scripts/check-figma-drift.mjs  model vs snapshot, per mode, + a "snapshot older than tokens" warning
         (Pro and Organization: Figma as of the last snapshot · Enterprise: live GET)

COMPONENTS
  cva variants + manifest ─► scripts/generate-code-connect.mjs ─► src/app/components/<name>.figma.ts (v2 template)
        │                         │  figma connect parse / preview --all   (local, no token, any plan) ─► CI gate
        │                         │  figma connect publish                 ◄── ORGANIZATION GATE
        │                         ▼
        │                    Dev Mode shows the real HDS snippet (Organization and up)
  manifest figmaUrl (one source) ─► Storybook parameters.design · README · Figma dev resources (Storybook + source)
                                    · component description (import line + doc link)   ← the Pro substitute
```

When this ADR was written, none of the commands or scripts in this diagram existed.
`figma:model` replaces the existing `pnpm figma-variables` exporter. Each one lands with
its own tests, and the core docs name a command only once it exists.

- **Model.** `figma:model` is a pure function with a golden snapshot and invariants: value
  types match Figma types, `em`/`ch` dimensions and string line heights convert to px,
  scopes are explicit (no `ALL_SCOPES` outside an allow-list), primitives are hidden from
  publishing, and names are unique across collections. It reads modes through the same
  reader as `build-tokens.mjs`.
- **Push on Pro.** `figma:push` is local and manual: an idempotent Plugin API upsert through
  `use_figma` on the remote Figma MCP server, or a local development plugin (private plugins
  are Organization-only). It matches variables by a stable key, updates before it creates,
  renames the initial mode instead of creating a second one, applies renames from
  `tokens.lock.json`, deletes only with `--prune`, and prints a changed, added, and removed
  summary. It runs against a scratch Figma file before the library.
- **Import fallback.** The model also emits one DTCG file per collection × mode for Figma's
  native Variables ▸ Import, which creates one mode per imported file.
- **Drift on Pro.** `figma:snapshot` writes a normalized, committed `figma/snapshot.json`
  from a `use_figma` read. The drift check compares the model with that snapshot. On Pro
  and Organization, drift is snapshot-based; only Enterprise can read Figma live over REST.

### 3. Library shape and tenants

Primitives (one mode, hidden from publishing) · Brand (one mode per demo tenant, at most
10 on Pro) · Semantic + Role (Light, Dark) · Density (Comfortable, Compact) · Component
(aliases only). Client tenants never enter the shared library.

**Open, Adrian decides:** Brand as modes in one library, or one collection or file per
tenant. Choosing modes reverses the collection-per-tenant wording in #134.

### 4. Components: Code Connect v2 templates now, publish on Organization

`scripts/generate-code-connect.mjs` generates `<name>.figma.ts` template files from `cva`
variants, `defaultVariants`, and manifest props, starting with the components that exist in
Figma. A local gate runs `figma connect parse` and `figma connect preview` with no token
and no network, so it works on any plan. `figma connect publish` waits for Organization.

On Pro, links stand in for Dev Mode snippets: one `figmaUrl` per component in the manifest,
projected into Storybook `parameters.design`, the README, Figma dev resources (story and
source), component descriptions (import line and doc link), and the Storybook Connect plugin.

### 5. When to move to Organization

Upgrade when a paying client engagement or a design review needs Dev Mode snippets shown live.
As checked on 2026-09-16: an Organization Full seat is $55/month billed annually ($660 up
front), no trial is documented, and the upgrade moves existing teams into a new
organization. Until then the claim is "Code Connect-ready, Organization-gated". Organization
still does not unlock REST variables or extended collections; both stay Enterprise-only.

## Rationale

- **Build on what the plan allows.** REST variables are not available on Pro, so a
  REST-first sync is a sync that cannot run. The Plugin API is available on every plan, and
  it is how the library file has actually been edited.
- **One model, several targets.** Push, import files, and drift all read the same model, so
  they cannot disagree with each other, and the model is testable without Figma.
- **State the limit instead of hiding it.** Snapshot drift is the honest guarantee on Pro.
  The ADR says so rather than implying live detection.
- **Keep the paid gate small.** Code Connect templates can be written, rendered, and tested
  locally, so Organization is needed only for the final publish step.

## Consequences

- The archived `sync-figma-variables.yml` workflow and the REST payload in
  `build-figma-variables.mjs` are Enterprise-only history. They are not restored on Pro,
  and the payload's temporary-id defect is left unfixed unless HDS moves to Enterprise.
- On Pro, Figma sync is a local command, not a CI job. CI can check the model, the Code
  Connect templates, and the committed snapshot, but not Figma itself.
- Live Figma reads and writes need Adrian's authenticated MCP session. Agents build and test
  against injected or mocked ports and hand live runs to Adrian.
- Snapshot reads must batch to stay inside the Pro MCP limit of 200 read calls a day, and
  `use_figma` writes will become usage-billed when the beta ends.
- Docs do not claim, until each becomes true: automatic Figma sync in CI; that Figma's
  native import reads `hirobius.tokens.json`; live drift detection on Pro or Organization;
  Dev Mode showing HDS code before Organization; or any count of Code Connect mappings
  before one is published. `scripts/__tests__/front-door.test.mjs` checks the core docs for
  the Figma commands, scripts, and triggers they name.
- Still unverified: what the Figma file contains (variable count, Dark values, style
  bindings, publish state); whether the Pro upgrade is complete with a Full seat; whether
  `figma connect publish --dry-run` fails on Pro; whether the MCP `add_code_connect_map`
  tool shows anything in Dev Mode on Pro; dev-resources REST with a Pro token;
  `setPluginData` on Variable objects; any plan restriction on local development plugins;
  and whether file keys and node URLs survive a Pro → Organization move.
