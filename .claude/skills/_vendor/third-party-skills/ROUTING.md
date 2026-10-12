# Third-party skills: routing

Vendored unmodified, pinned in `skills-lock.json` (commit + sha256). Pocock skills stay the
mandatory routing; Osmani next; these fill gaps neither covers. Re-pin by editing the lock
and running the installer, never by hand-editing skill files.

| Skill | Source (MIT) | Use it for |
| --- | --- | --- |
| `vercel-composition-patterns` | vercel-labs/agent-skills `063bee9` | Component API design: compound components, no boolean-prop sprawl. Read alongside `docs/rules/REACT_COMPONENTS.md` (that file wins on conflict). |
| `vercel-react-best-practices` | vercel-labs/agent-skills `063bee9` | Re-render, bundle and rendering perf rules for `src/` components. Next.js/server rules mostly don't apply to a component library. |

Not vendored: `web-design-guidelines` (fetches unpinned rules at run time; `design-review` + `check-docs-axe` cover it), deploy skills (deploys are Adrian-only).
