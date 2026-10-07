---
'@hirobius/design-system': minor
---

Agent tooling ships in the package (hds#515). Nothing changes on the main entry or any existing subpath.

- `AGENTS.md` at the package root: one answer per screen need (a row of numbers is `MetricTiles`, a destructive confirm is `AlertDialog`, a saved message is a toast through `useToast`, a form is `Form` with `FormActions`, and so on for 24 needs), the import path of each core component, and the rules. Generated from `mcp/guide.mjs`; `pnpm check:agents-md` keeps it in step.
- `hds-mcp` bin: an MCP server over stdio (run the `hds-mcp` bin in an app that has the package installed, or `npx -p @hirobius/design-system@^0.21 hds-mcp`; no dependencies, no network) with four tools, `list_core`, `search_components`, `get_component` and `search_tokens`. Each answer is compact JSON under 2 KB, read from the manifest and component API data the package already ships.
- `./eslint-plugin` subpath: the consumer ESLint plugin (`import hds from '@hirobius/design-system/eslint-plugin'`, then `...hds.configs.recommended`).
- **Breaking for anyone already using the plugin** (`@hirobius/eslint-plugin-hds` from git, now 0.2.0): the new rule `hds/no-raw-controls` is `error` in `recommended`. It fails raw `<button>`, `<input>`, `<select>`, `<textarea>` and `<form>`; replace them with `Button`, `Input`, `Select`, `Textarea` and `Form` (from `/patterns`), or turn the rule off in your config: `rules: { 'hds/no-raw-controls': 'off' }`.
- Usage contracts (`usage` in `component-api.json` and the manifest, shown in `llms.txt`): `AlertDialog` gains one (when to use it, when to use `Dialog` instead), and `Dialog` points to `AlertDialog` for a destructive confirm. `Stat` now reads as an inline figure inside prose or a dense list and, like `StatusTile` and `Card.Metric`, points to `MetricTiles` for a row of headline numbers. No component changes behaviour.
- `llms.txt` opens with a "Start here" section naming AGENTS.md, the MCP server and the lint plugin, then the same "Pick by need" list as AGENTS.md, rendered from the same source.
