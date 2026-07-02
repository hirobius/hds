# Figma integration — MCP, tokens, Code Connect

How HDS talks to Figma. Implements **ADR-019** (official Figma MCP + Code
Connect; the legacy WebSocket bridge is archived on `archive/figma-bridge`).

There are **two distinct channels**, with two distinct kinds of credential.
Keep them straight — conflating them is the historical source of the env-var
sprawl this doc replaces.

## 1. Interactive design ↔ code — official Figma MCP server (OAuth)

- **Server:** `https://mcp.figma.com/mcp`, wired in the repo-root
  [`.mcp.json`](../.mcp.json) so any Claude Code session in this repo picks it
  up (`get_design_context`, `use_figma`, variables APIs, Code Connect tools).
- **Auth:** OAuth against your Figma account — **not** a personal access token,
  and it does **not** read `FIGMA_API_KEY`. In hosted claude.ai sessions the
  account integration authorizes it automatically; in a local CLI, run the
  Figma MCP login flow once (`claude mcp` / the Figma auth prompt).
- This is the only channel that can **write** to Figma (`use_figma`) and drive
  **Code Connect** (§3). The third-party `figma-developer-mcp` server (the one
  that natively reads `FIGMA_API_KEY`) is read-only and is **not** used here.

## 2. Tokens → Figma Variables — REST (personal access token)

`hirobius.tokens.json` is the single source of truth. `scripts/build-figma-variables.mjs`
(`pnpm figma-variables`) compiles it into a Figma REST payload; the
[`sync-figma-variables.yml`](../.github/workflows/sync-figma-variables.yml)
workflow POSTs it to the Figma Variables API on pushes that touch the token
file. `pnpm test:figma` (`scripts/figma-sync.ts`) is a read-only connectivity
check against the same file.

These REST paths use a **personal access token** via the `X-Figma-Token`
header — this is where `FIGMA_API_KEY` belongs.

### Canonical env vars (unified)

| Purpose                      | Canonical name    | Deprecated aliases (still accepted)          |
| ---------------------------- | ----------------- | -------------------------------------------- |
| Figma personal access token  | `FIGMA_API_KEY`   | `FIGMA_PAT`, `FIGMA_PERSONAL_ACCESS_TOKEN`   |
| Target Figma file key        | `FIGMA_FILE_KEY`  | `FIGMA_FILE_ID`                              |

- **Local:** set both in `.env.local` (git-ignored; the human sets keys — no
  agent ever touches `.env*`). The `figd_…` token is your Figma personal access
  token from figma.com → Settings → Security.
- **CI:** GitHub repo secrets. The workflow prefers `secrets.FIGMA_API_KEY` and
  falls back to the legacy `secrets.FIGMA_PERSONAL_ACCESS_TOKEN`; add a
  `FIGMA_API_KEY` secret to complete the migration. `FIGMA_FILE_KEY` is
  unchanged.

## 3. Components → Figma — Code Connect

[`figma.config.json`](../figma.config.json) registers the React parser and the
`code-connect/**/*.figma.tsx` mapping files. Mappings live in the repo-root
[`code-connect/`](../code-connect/) directory — deliberately **outside**
`src/app/components/` so they don't trip the component-manifest / source-canon /
integrity gates that scan that tree.

- Author a mapping per component (`code-connect/<name>.figma.tsx`) linking the
  Figma node to the real HDS import and props. `code-connect/button.figma.tsx`
  is the first exemplar.
- `pnpm figma:connect` parses/validates mappings. Publishing to Figma
  (`figma connect publish`) is a **manual/gated** step — it writes to Figma and
  needs a token — so it is not part of any automatic gate.

### Canonical Figma file

> **⚠️ TODO — confirm the library file key.** The audit in issue #73 cited
> `c8MaVgwxOlxm4wr8wnH0Z4`, but that file currently resolves to a single
> "Copy Over" page with a shadcn-style button taxonomy that does **not** match
> the code's `variant` / `tone` / `size` API or the "library v1" recorded in
> `status.json` (22 components / 88 variants). Set `FIGMA_FILE_KEY` to the real
> HDS library file and replace the `<FIGMA_FILE_KEY>` / `<BUTTON_NODE_ID>`
> placeholders in `code-connect/button.figma.tsx` before publishing.

## Environment note

Outbound `api.figma.com` may be blocked by an environment's egress policy (it is
in the current remote-session policy — CONNECT returns 403). When blocked, the
**REST** paths (`pnpm test:figma`, the CI curl, `figma connect publish`) cannot
run from that session; the **MCP** channel (`mcp.figma.com`) still works. The CI
workflow runs on GitHub Actions, which has its own network, so token→variable
sync is unaffected there.
