# Drawing an HDS component into Figma with an agent

Derived from the StatusDot pilot (2026-09-21), the first component an agent drew
into the staging copy that became the library on 2026-10-07. The pilot existed to
answer one question: if an agent can draw one component correctly, are the other
40 mechanical? They are — provided the steps below are followed in order.

**Write target: the library, `libraryFileKey` in `figma/links.json`** (ADR-026,
amended 2026-10-07). There is no staging file since 2026-10-07. In the library an
agent may restyle, add, copy or redraw a component; it never deletes anything in
Figma and never publishes: Adrian publishes. Every write also follows these rules:

- One `use_figma` script per write. Its first statement throws unless
  `figma.fileKey` is the library key. It names the node ids it changes (or, for a
  new component, the page it lands on), returns the ids it creates, and touches
  nothing else. Log the file key and those ids in `figma/MCP-LEDGER.md` before
  the call.
- No `remove()`, on anything. Retiring a component is a move (below).
- Screenshot every component before and after the write (`get_screenshot`, as
  base64 where the proxy blocks figma.com), and check it with `get_metadata`
  (step 7).
- Bind only to the library's own variables and styles, found by name; create
  none. Variables and styles come from code, through Sync or `delta.js`.
- Report the component, its node ids and both screenshots to Adrian, who
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

## Linking it to code

A component drawn in the library gets its `@figma` tag at its library node from
the start (`https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=...`).
Add the tag, run `pnpm manifest:generate` and `pnpm figma:links`, then refresh
`figma/inventory.json` with `pnpm figma:inventory --fetch`. The manifest's
`variantAxes` and `figmaUrl` populate from that tag, and `check:figma-mapping`
then enforces the axes against the real props. `pnpm check:figma-retired-keys`
fails if a link points at a retired file.

The promotion step of the staging era, before 2026-10-07 (Adrian copying
components into the old library, then re-pointing each tag), is gone: the
staging copy became the library under the same node ids, so its tags only
changed file key.

## Retiring a component (never delete)

- **Deprecated in code** (`@deprecated` on the component): move it to the
  "Deprecated" page, keep it published, and start its description with
  `Deprecated: use <replacement>. Removed in <removeIn>.`. Its `@figma` tag stays.
- **Removed from code**: move it to the "Archive" page and rename it
  `_<Name> (archived <date>)`. The leading underscore keeps it out of publishing.
  Its tag goes with the component in code. Adrian reviews the Archive page and
  deletes later; check first that no live component nests it (Pagination
  `86:194` nests the archived IconButton until it is redrawn with Button).
