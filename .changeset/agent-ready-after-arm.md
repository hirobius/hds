---
'@hirobius/design-system': minor
---

Agent tooling ships in the package (hds#515). Nothing changes on the main entry or any existing subpath.

- `AGENTS.md` at the package root: which component to use for each screen need (a row of numbers is `MetricTiles`, a destructive confirm is `AlertDialog`, a saved message is a toast through `useToast`, a form is `Form` with `FormActions`), the import path of each core component, and the rules. Generated from `mcp/guide.mjs`; `pnpm check:agents-md` keeps it in step.
- `hds-mcp` bin: an MCP server over stdio (run the `hds-mcp` bin in an app that has the package installed, or `npx -p @hirobius/design-system@^0.21 hds-mcp`; no dependencies, no network) with four tools, `list_core`, `search_components`, `get_component` and `search_tokens`. Each answer is compact JSON under 2 KB, read from the manifest and component API data the package already ships.
- `./eslint-plugin` subpath: the consumer ESLint plugin (`import hds from '@hirobius/design-system/eslint-plugin'`, then `...hds.configs.recommended`). New rule `hds/no-raw-controls` (error in `recommended`) flags raw `<button>`, `<input>`, `<select>`, `<textarea>` and `<form>`.
- `AlertDialog` gains a usage contract (when to use it, when to use `Dialog` instead), and `Dialog` now points to `AlertDialog` for a destructive confirm; both show in `component-api.json`, the manifest and `llms.txt`.
- `llms.txt` opens with a "Start here" section naming AGENTS.md, the MCP server and the lint plugin.
