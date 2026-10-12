# Third-party skills: routing

Vendored unmodified, pinned in `skills-lock.json` (commit + sha256). Pocock skills stay the
mandatory routing; Osmani next; these fill gaps neither covers. Re-pin by editing the lock
and running the installer, never by hand-editing skill files.

| Skill | Source (MIT) | Use it for |
| --- | --- | --- |
| `vercel-composition-patterns` | vercel-labs/agent-skills `063bee9` | Component API design: compound components, no boolean-prop sprawl. Read alongside `docs/rules/REACT_COMPONENTS.md` (that file wins on conflict). |
| `vercel-react-best-practices` | vercel-labs/agent-skills `063bee9` | Re-render, bundle and rendering perf rules for `src/` components. Next.js/server rules mostly don't apply to a component library. |

Not vendored: `web-design-guidelines` (fetches unpinned rules at run time; `design-review` + `check-docs-axe` cover it), deploy skills (deploys are Adrian-only).

## 21st.dev (MCP server `21st`, `.mcp.json`)

A source of UI patterns and lockups to iterate on, never a dependency. Ingest flow:

1. `search` / `get_component` (or `generate` if AI access is on) for the pattern.
2. Rebuild it with HDS primitives and tokens (`Stack`, `Grid`, `Surface`, semantic tokens). Never paste its code, classes or packages into `src/`.
3. New component → the normal path: `/implement` + `/tdd`, `pnpm manifest:generate`, `/design-review`.

Key: `API_KEY_21ST` env var (Adrian sets it; free key at https://21st.dev/mcp). Unset, the server loads but every call fails auth.
