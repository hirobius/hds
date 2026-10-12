# Direction template

Canonical starter for a new HDS direction: a curated, reviewed art direction any
consumer can select (ADR-035, `GLOSSARY.md`). A client's brand never starts
here; a client themes itself in its own repository through
`@hirobius/design-system/brand` (`docs/CONSUMING.md` §12).

## What lives here

| File            | Purpose                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.json`   | DTCG-shape **partial**: only the tokens this direction overrides. Inactive in the template (top-level group keys are prefixed with `_` so the build emits nothing). |
| `metadata.json` | Identity. A direction keeps `deployment` and `legal` empty at tier 1; the Figma gate refuses anything else.                                                         |
| `README.md`     | This file. Describes the direction for humans and agents.                                                                                                           |

## Adding a direction

```bash
# 1. Copy the template, rename to your slug (lowercase kebab-case)
cp -r directions/_template directions/<slug>

# 2. Fill metadata.json
$EDITOR directions/<slug>/metadata.json
#   - slug           → must equal the directory name
#   - displayName    → the direction's name
#   - tier           → 1 (a direction is never a deployed client)
#   - deployment     → leave every field null
#   - brand.primaryHex → quick-reference accent
#   - legal          → leave every field null

# 3. Fill tokens.json
$EDITOR directions/<slug>/tokens.json
#   - Remove leading `_` from any group key you want to activate
#   - Replace placeholder hexes with the direction's values
#   - Override semantic / component / role tier ONLY (NEVER primitive.*)
#   - Each leaf must end in $value (DTCG)

# 4. Build
pnpm tokens

# 5. Verify
rg 'data-brand="<slug>"' src/styles/tenants.css

# 6. Optional: list the slug in figma/brand-modes.json to make it a Brand mode
```

## Override scope

Directions override **semantic-tier or higher**:

- `semantic.*`: color roles, typography, motion, spacing
- `component.*`: component-specific token slots
- `role.*`: shadcn-vocabulary role aliases

Directions do **not** override `primitive.*`. Primitives are the abstraction
the design system protects. To shift the accent, override
`semantic.accent.rest` to a new hex (or alias a primitive added at the BASE
level, which is a system change, not a direction change).

## Reference

- Decision (direction, brand, preference): `docs/adr/035-directions-brands-preferences.md`
- Format spec: `docs/architecture/tenant-token-overlay-format.md`
- Cascade mechanism (why `[data-brand]`): `docs/architecture/ADR-0001-multi-tenant-scope.md`
- Base tokens: `hirobius.tokens.json`
- Generated CSS: `src/styles/tenants.css`
