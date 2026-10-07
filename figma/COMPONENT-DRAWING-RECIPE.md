# Drawing an HDS component into Figma with an agent

Derived from the StatusDot pilot (2026-09-21), the first component an agent drew
into the staging copy that became the library on 2026-10-07. The pilot existed to
answer one question: if an agent can draw one component correctly, are the other
40 mechanical? They are — provided the steps below are followed in order.

**Where to draw** (ADR-026, amended 2026-10-07; both keys in `figma/links.json`):

- **A new component** (the library does not have it yet): draft it in HDS Staging
  (`C85ZXnwtVc4AteeIOZfXRC`), the scratch workbench, bound to the library's variables and
  styles; then ingest it by redrawing it in the library and delete the draft
  ([Ingesting a draft](#ingesting-a-draft-into-the-library),
  [Cleaning up HDS Staging](#cleaning-up-hds-staging)). Agents may delete in HDS Staging.
  Sync, `delta.js` and the promote plugin never target it: it has no local variables.
- **Restyling, fixing or copying a component the library has**: work in the library
  (`2VgBbVpKiDnu0aftJEVyBQ`) directly.

In the library an agent may restyle, fix, add, copy or redraw a component; it never
deletes anything in the library and never publishes: Adrian publishes. Every write, in
either file, also follows these rules:

- One `use_figma` script per write. Its first statement throws unless
  `figma.fileKey` is the key of the file it is meant for: the library key, or for a
  draft the staging key. It names the node ids it changes (or, for a new component,
  the page it lands on), returns the ids it creates, and touches nothing else. Log
  the file key and those ids in `figma/MCP-LEDGER.md` before the call.
- No `remove()` in the library, on anything. Retiring a component is a move (below).
  The one `remove()` is a draft in HDS Staging after its ingest.
- Screenshot every component before and after the write (`get_screenshot`, as
  base64 where the proxy blocks figma.com), and check it with `get_metadata`
  (step 7).
- Bind only to the library's variables and styles; create none. In the library they
  are local, found by name; in HDS Staging they come from the enabled library,
  imported by key. Variables and styles come from code, into the library only,
  through Sync or `delta.js`.
- Report the component, its library node ids and both screenshots to Adrian, who
  publishes.

## Preconditions

- Figma MCP authenticated (`whoami` returns the Hirobius Pro team). This is
  separate from the REST PAT — the PAT being dead blocks `pnpm figma:inventory`
  and `check:figma-drift`, but **not** drawing.
- The component exists in code and in `public/hds-manifest.json`.
- Load both Figma skills before any `use_figma` call: `figma-use` (API rules)
  and `figma-generate-library` (component workflow).

## The recipe

1. **Read the code first.** The cva `variants` block is the variant matrix; the
   `defaultVariants` block is the default. Resolve every Tailwind utility to the
   CSS custom property it emits (`tailwind.config.ts` for the semantic aliases,
   `src/styles/tokens.css` for the token itself). Do not guess a hue.

2. **Resolve each token to a Figma variable ID** before drawing. The Figma
   variable name mirrors the CSS custom property:
   `--semantic-color-feedback-info` → `color/feedback/info`. Watch the
   deliberate renames — the `danger` prop maps to the **error** token pair.
   In the library the variable is local: find it by that name. In HDS Staging it
   lives in the enabled library: find its key with `search_design_system` and
   import it with `figma.variables.importVariableByKeyAsync` (a text or effect
   style with `figma.importStyleByKeyAsync`).

3. **Copy an existing sibling's conventions, don't invent them.** Read the
   nearest already-drawn component (Badge for a tone axis, Button for a
   multi-axis set) and match variant naming (`Tone=neutral, Size=md`), page
   placement and description style.

4. **Bind only what code actually tokenizes.** If code uses a raw Tailwind
   utility with no HDS token behind it, leave the value literal and say so in
   the description. Creating a Figma-only variable to make a component look
   "properly tokenized" manufactures drift and violates ADR-025 — code is the
   source of truth, sync is one way.

5. **Create variants, then combine, then re-apply the grid.**
   `combineAsVariants` stacks every variant at (0,0); positions must be set
   again afterwards.

6. **Resize the component set before repositioning children.** A set does not
   grow to fit its variants. If you skip this the outer columns and rows are
   silently clipped — the structure is correct and only the render is wrong,
   which is why step 7 needs both checks.

7. **Verify structurally AND visually.** `get_metadata` for exact geometry,
   `screenshot()` for the render. A screenshot alone would have shown the
   clipping in step 6 but not proved the geometry; metadata alone would have
   shown correct geometry and hidden the clipping.

8. **Write the description on the COMPONENT_SET**, covering the code signature,
   any deliberate token renames, anything intentionally left unbound, and any
   known caveat. This is what designers read in the library.

## Gotchas the pilot found

- **`defaultVariant` is positional, not child order.** Figma picks the
  **top-left-most** variant. Reordering children with `insertChild(0, …)` does
  not change it; moving the variant's `x`/`y` does. Verified by probe.
- **`componentPropertyDefinitions[axis].defaultValue` reports
  `variantOptions[0]`**, which is _not_ necessarily the real default. Read
  `set.defaultVariant.name` instead, or instantiate and inspect.
- **Reading `fills[0].color` does not resolve the active mode.** It returns the
  baked colour, so it cannot be used to prove a binding is live. Resolve
  `variable.valuesByMode` and follow the aliases instead.

## Ingesting a draft into the library

A draft in HDS Staging is a reference, not a source: Figma cannot copy nodes between
files, so the ingest redraws the component in the library.

1. **Freeze the draft.** Its last `get_screenshot` and `get_metadata` (step 7) are what
   the redraw must match: variant names and grid, the default variant, sizes, bindings.
2. **Redraw it in the library** with steps 1 to 8 above, in one `use_figma` script whose
   first statement throws unless `figma.fileKey` is the library key
   `2VgBbVpKiDnu0aftJEVyBQ`. Bind to the library's own local variables and styles, found
   by the same names the draft imported; create none. Screenshot the target page before.
3. **Compare.** Screenshot the new component and check it with `get_metadata`; it matches
   the frozen draft, variant for variant.
4. **Link it** (next section) to the library node, never the draft.

## Linking it to code

A component drawn in the library gets its `@figma` tag at its library node
(`https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=...`),
never at a draft in HDS Staging. Add the tag, run `pnpm manifest:generate` and
`pnpm figma:links`, then refresh `figma/inventory.json` with
`pnpm figma:inventory --fetch`. The manifest's `variantAxes` and `figmaUrl` populate
from that tag, and `check:figma-mapping` then enforces the axes against the real
props. `pnpm check:figma-retired-keys` fails if a link points at a retired file or at
HDS Staging.

The promotion step of the staging era, before 2026-10-07 (Adrian copying
components into the old library, then re-pointing each tag), is gone: the
staging copy became the library under the same node ids, so its tags only
changed file key.

## Cleaning up HDS Staging

Once the library component is linked and `pnpm check:figma-retired-keys` passes,
delete the draft: one `use_figma` script whose first statement throws unless
`figma.fileKey` is the staging key `C85ZXnwtVc4AteeIOZfXRC`, and which calls
`remove()` on the draft's node ids only (log them in the ledger first). HDS Staging
holds only work in progress; a shipped component lives in the library alone.

## Retiring a component (never delete)

- **Deprecated in code** (`@deprecated` on the component): move it to the
  "Deprecated" page, keep it published, and start its description with
  `Deprecated: use <replacement>. Removed in <removeIn>.`. Its `@figma` tag stays.
- **Removed from code**: move it to the "Archive" page and rename it
  `_<Name> (archived <date>)`. The leading underscore keeps it out of publishing.
  Its tag goes with the component in code. Adrian reviews the Archive page and
  deletes later; check first that no live component nests it (Pagination
  `86:194` nests the archived IconButton until it is redrawn with Button).
