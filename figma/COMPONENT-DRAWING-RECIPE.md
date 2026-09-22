# Drawing an HDS component into Figma with an agent

Derived from the StatusDot pilot (2026-09-21), the first component an agent drew
into the staging file. The pilot existed to answer one question: if an agent can
draw one component correctly, are the other 40 mechanical? They are — provided
the steps below are followed in order.

**Write target is `stagingFileKey` only** (`figma/links.json`). ADR-026: the
published library is read-only to agents. Adrian promotes staging by hand.

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
   known caveat. This is what survives promotion into the library.

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

## Promotion (Adrian, by hand)

Staging node IDs do not survive promotion, so **no `@figma` JSDoc tag is added
while a component lives only in staging** — every tag in `src/app/components`
points at the published library. After promoting, take the new library node ID,
add the `@figma` tag, then run `pnpm manifest:generate`. The manifest's
`variantAxes` and `figmaUrl` populate from that tag, and `check:figma-mapping`
then enforces the axes against the real props.
