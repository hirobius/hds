# After-arm run notes (2026-10-14)

Conditions: `eval/consistency/CONDITIONS.md`, after arm. Package packed from
`408e752` (main) as `@hirobius/design-system@0.25.0`; generation tarball sha256
starts `a4e36ecc52abdfd7`. The harness re-packs and records its own commit and
sha256 in the ledger entry.

Each generator got a fresh context, a workspace outside the repository holding
only a copy of `template/`, the tarball under
`node_modules/@hirobius/design-system/` and `SPEC.md` (the spec with the after-arm
"Allowed inputs" block), and the CONDITIONS.md prompt verbatim.

## Deviations from CONDITIONS.md (read before quoting these numbers)

1. **No `hds` MCP server**, as on 2026-10-07: the generators ran as Claude Code
   subagents, which cannot attach a per-subagent MCP server. They had AGENTS.md,
   llms.txt, component-api.json and the lint plugin's rules as files. All three
   said so in their replies.
2. **Models.** Subagents ran on the session's `sonnet`, `opus` and `haiku`
   aliases. The configured haiku model in CONDITIONS.md is
   `claude-haiku-4-5-20251001`; the alias may resolve to a newer Haiku.
3. **No shell was used.** All three reported they did not run shell commands
   (so no typecheck or lint before delivery) and wrote only `src/App.tsx`.
   `main.tsx` in every workspace is byte-identical to the template's.

## Generator replies (summary)

- **after-sonnet:** Page, Stack, PageHeader + Breadcrumb + Badge, MetricTiles,
  Tabs, DataTableSection with per-row AlertDialog, Form + Textarea +
  FormActions, toast via ToastProvider/useToast. Put the notes form inside the
  Projects panel.
- **after-opus:** the same component set; notes form as its own section below
  the tabs; noted that MetricTiles/MetricTile are deprecated in the `.d.ts`
  but still named by AGENTS.md "Pick by need".
- **after-haiku:** the same component set; EmptyState placeholders in the
  Notes and Activity panels.

The AGENTS.md / deprecation mismatch on MetricTiles is a docs finding to fix in
HDS, separate from this run.
