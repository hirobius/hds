# Token Overlay Format (directions, and a client's brand in its own repo)

| Field          | Value                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | Accepted                                                                                                                                                                            |
| **Date**       | 2026-05-01                                                                                                                                                                          |
| **Author**     | Adrian Milsap (orchestrated; opus-class)                                                                                                                                            |
| **Unit**       | `12m-mt-token-overlay-format`                                                                                                                                                       |
| **Depends on** | `12m-mt-css-scope-architecture` (decision: `[data-tenant="X"]` selectors)                                                                                                           |
| **Amended by** | ADR-035 (2026-10-12): the folder is `directions/`; an overlay in this repo is a shared art direction, and a client's brand overlay keeps this format in the client's own repository |

---

## Purpose

Define the **source format** for token overrides — independent of the CSS
cascade mechanism (which is already settled in
`ADR-0001-multi-tenant-scope.md`). The build pipeline consumes overlays in this
format and emits scoped CSS into `src/styles/tenants.css`.

An overlay says, in essence: "Use the HDS base, but override these specific
semantic tokens." In this repo an overlay is a **direction** (a curated art
direction under `directions/<slug>/`, ADR-035). A **client's brand** has the
same shape, lives in the client's own repository, and is applied there with
`@hirobius/design-system/brand` or a local build; it never enters this repo or
the shared Figma library.

---

## Directory layout

```
directions/
  _template/                       # the canonical starter — copy this for a new direction
    tokens.json                    # DTCG-shape partial: ONLY the overridden paths
    metadata.json                  # slug, displayName, brand metadata (deployment and legal stay empty)
    README.md                      # what this direction overrides + why
  accent-lilac/
    tokens.json
    metadata.json
  brutalist-demo/
    tokens.json
    metadata.json
    README.md
  <slug>/
    …
```

**Slug rules:**

- Lowercase, kebab-case, ASCII only: `[a-z0-9-]+`.
- Must NOT start with `_` (reserved — `_template/` is the only underscore
  directory permitted).
- Becomes the `data-brand="<slug>"` (and `data-tenant`) attribute value verbatim. No mapping.

---

## `tokens.json` — overlay format

A **partial DTCG file** mirroring the structure of `hirobius.tokens.json`.
An overlay only declares the leaf paths it overrides. Everything else inherits
from base.

### Minimal example — a warm-stone direction

```json
{
  "$schema": "../../hirobius.tokens.schema.json",
  "semantic": {
    "color": {
      "$type": "color",
      "surface": {
        "accent": {
          "$value": "#8B6F47",
          "$description": "Warm stone accent (placeholder)",
          "$extensions": {
            "com.figma.variables": {
              "modes": {
                "Light": "#8B6F47",
                "Dark": "#6B5235"
              }
            }
          }
        }
      }
    }
  },
  "semantic": {
    "accent": {
      "$type": "color",
      "rest": {
        "$value": "#8B6F47",
        "$extensions": {
          "com.figma.variables": {
            "modes": { "Light": "#8B6F47", "Dark": "#6B5235" }
          }
        }
      }
    }
  }
}
```

### Compiled output

The build pipeline emits the following block into `src/styles/tenants.css`
(loaded after the `:root` and `[data-theme="dark"]` blocks):

```css
[data-brand='warm-stone'],
[data-tenant='warm-stone'] {
  --semantic-color-surface-accent: #8b6f47;
  --semantic-accent-rest: #8b6f47;
}
[data-brand='warm-stone'][data-theme='dark'],
[data-tenant='warm-stone'][data-theme='dark'] {
  --semantic-color-surface-accent: #6b5235;
  --semantic-accent-rest: #6b5235;
}
```

The override applies whenever `<html data-brand="warm-stone">`. With the dark
theme also active, both selectors match and the second wins by specificity
(0,2,0 > 0,1,0).

---

## Override resolution rules

### R1 — Tier scope

An overlay may override:

- **Semantic tier** (`semantic.*`) — yes, this is the intended override
  surface.
- **Component tier** (`component.*`) — yes, when brand demands a
  component-specific deviation that the semantic tier can't capture.
- **Role tier** (`role.*`) — yes, the shadcn-vocabulary role aliases.
- **Primitive tier** (`primitive.*`) — **NO.** Primitives are the abstraction.
  An overlay that needs a brown accent does NOT redefine
  `primitive.color.blue.500` to brown — that breaks every other consumer of
  blue. Instead, override `semantic.accent.rest` to point at a tenant-
  specific value (or define a new primitive at the BASE tier and re-alias
  semantic to it).

The validator enforces R1 fail-fast.

**Shape/density override surface (ADR-022):** `semantic.radius.*`,
`semantic.space.*`, `semantic.borderWidth.*`, and `role.radius` are
explicitly part of the permitted semantic/role-tier override surface above —
a direction may pin its own corner-radius and spacing identity (e.g. sharp +
dense) independent of every other direction's shape. See R9 below for how a
shape/space override varies by density.

### R2 — Path-leaf merge

Overrides apply at the **leaf token level** (the path with `$value`). An
overlay cannot redefine a category (e.g., add a brand-new `semantic.color.brand`
group that didn't exist in base). The merge is path-precise: the overlay leaf
beats the base leaf, all other base leaves are unchanged.

### R3 — Conflict resolution

If two paths in a single `tokens.json` end up resolving to the same
CSS variable (impossible in well-formed DTCG, but theoretical via duplicate
JSON keys), JSON parse-order wins (last-key-wins). The validator warns on
duplicate keys.

### R4 — Mode-aware overrides

Overrides MAY include `$extensions.com.figma.variables.modes.{Light,
Dark}`. If present, the build pipeline emits both the base
`[data-brand="X"]` selector (using the `$value` or the `Light` mode) AND
the combined `[data-brand="X"][data-theme="dark"]` selector (using the
`Dark` mode value).

If only `$value` is present (no modes), the override applies in light AND
dark — common where an accent is mode-invariant.

### R5 — Unknown paths

A `tokens.json` referencing a path that does NOT exist in base is a
**hard error**. Overlays override; they don't extend. (If a direction truly
needs a new token, the path goes into the BASE tokens first.)

### R6 — Composite overrides

Composite tokens (typography, transition, motion, shadow, elevation) can be
overridden. An overlay may override the entire composite `$value` object;
individual sub-keys are NOT supported (the DTCG composite is atomic). To
override only one slot of a typography composite, redeclare the full
composite.

### R7 — Alias values are honored

An override may use an alias (`{primitive.color.neutral.white}`) just like
base tokens. Alias resolution happens against the BASE token graph augmented
by the overlay — i.e., if an overlay adds an override that itself aliases
another semantic (also overridden by the overlay), the resolution chain stays
internally consistent.

### R8 — No primitive aliases unless they exist in base

An alias to `{primitive.color.brand.500}` only resolves if that path already
exists in base. An overlay cannot smuggle new primitives in via aliases.

### R9 — Density-aware overrides (ADR-022)

An override MAY include `$extensions.com.figma.variables.modes.Compact`
alongside (or instead of) the existing `Light`/`Dark` mode keys — the same
mode-map mechanism R4 uses for theme, extended with a third named mode for
density. When present, the build pipeline emits a combinatorial
`[data-brand="X"][data-density="compact"]` block (mirroring the existing
`[data-brand="X"][data-theme="dark"]` block from R4) carrying the Compact
value, in addition to the base `[data-brand="X"]` block carrying the
`$value`/`Light` value.

```json
{
  "role": {
    "radius": { "$type": "dimension", "$value": { "value": 0, "unit": "px" } }
  },
  "semantic": {
    "space": {
      "surface": {
        "padding": {
          "$type": "dimension",
          "$value": "{semantic.space.scale.sm}",
          "$extensions": {
            "com.figma.variables": { "modes": { "Compact": "{semantic.space.scale.xs}" } }
          }
        }
      }
    }
  }
}
```

compiles to:

```css
[data-brand='brutalist-demo'] {
  --role-radius: 0px;
  --semantic-space-surface-padding: var(--semantic-space-scale-sm);
  --semantic-space-component-padding: var(--semantic-space-surface-padding);
}
[data-brand='brutalist-demo'][data-density='compact'] {
  --semantic-space-surface-padding: var(--semantic-space-scale-xs);
  --semantic-space-component-padding: var(--semantic-space-surface-padding);
}
```

Spacing overrides use a step of the t-shirt scale (`semantic.space.scale.*`),
not a primitive (hds#206). The second line in each block is a **re-anchored
deprecated alias**: any base token marked `$deprecated` whose `$value` is
exactly the overridden path is redeclared next to the override. A custom
property is computed where it is declared, so without this the `:root`
alias would never see an override set on a descendant `[data-brand]`
element, and consumers still reading `component.padding` would lose it.

Density and theme combine with brand **independently** — there is no
`[data-brand][data-theme][data-density]` triple-combo block. `role.radius`
above has no Compact mode, so it is density-invariant (sharp corners apply
whether the viewer's density preference is comfortable or compact); only
leaves that declare a Compact mode gain a density block. Same rule as R4: a
Compact value is only emitted when it differs from the value used at rest.

---

## `metadata.json` — identity

A direction in this repo keeps `deployment` and `legal` empty at tier 1
(ADR-035); `scripts/lib/figma-brand-modes.mjs` refuses anything else before
it can become a Figma Brand mode. A client's brand overlay fills those groups
in the client's own repository, where this schema still applies.

```json
{
  "slug": "warm-stone",
  "displayName": "Warm Stone",
  "tagline": "Warm stone accent over the neutral spine.",
  "tier": 1,
  "deployment": {
    "vercelProject": null,
    "primaryDomain": null,
    "previewDomain": null
  },
  "brand": {
    "primaryHex": "#8B6F47",
    "accentName": "warm-stone",
    "logoPath": null
  },
  "legal": {
    "entity": null,
    "jurisdiction": null,
    "stripeAccountKind": null
  },
  "createdAt": "2026-10-12",
  "status": "scaffold"
}
```

| Field          | Required         | Purpose                                                                                                                               |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`         | yes              | Verbatim `data-brand` (and `data-tenant`) attribute value. Must match directory name.                                                 |
| `displayName`  | yes              | UI-facing brand name; rendered in tenant-aware screens.                                                                               |
| `tagline`      | no               | Short brand line; used by previews, sales tooling.                                                                                    |
| `demo`         | no               | Retired (ADR-035): the `directions/` folder is the statement. Accepted and ignored.                                                   |
| `tier`         | yes              | 1 (brand presence), 2 (e-commerce), 3 (product). Drives infra defaults.                                                               |
| `deployment.*` | yes              | Where a client's brand ships; every field `null` for a direction.                                                                     |
| `brand.*`      | yes              | Quick-reference brand info. Source of truth is `tokens.json`; this is for tooling that wants brand metadata without parsing the DTCG. |
| `legal.*`      | yes for tier ≥ 2 | Entity + jurisdiction for a client's brand; every field `null` for a direction.                                                       |
| `status`       | yes              | One of: `scaffold`, `active`, `archived`. Drives validator strictness.                                                                |

Each `metadata.json` sets `"$schema": "../../hirobius.tenant-metadata.schema.json"`
for editor validation; the schema encodes the table above.
`scripts/check-tenant-tokens.mjs` enforces the M1–M3 subset.

---

## JSON schema (delta on base DTCG)

An overlay `tokens.json` is a **proper subset** of the base DTCG schema with
these additional rules enforced by `scripts/check-tenant-tokens.mjs`
(planned as part of `12m-mt-build-pipeline`):

```
TenantTokens := DTCGObject

ValidationRules:
  R1.tier   : NO leaf token whose path[0] === "primitive"
  R2.leaf   : Every override MUST end in $value (no group-only declarations)
  R5.path   : Every override path MUST exist in hirobius.tokens.json
  R6.atomic : Composite types are replaced atomically (no sub-key merging)
  R8.alias  : All {ref} values resolve to a base path or a tenant override
```

---

## Adding a direction

```bash
# 1. Copy the template (or: pnpm scaffold:tenant --slug=<slug> ...)
cp -r directions/_template directions/<slug>

# 2. Edit metadata.json — slug, displayName, brand; deployment and legal stay empty
$EDITOR directions/<slug>/metadata.json

# 3. Edit tokens.json — declare the overrides (semantic-tier or higher)
$EDITOR directions/<slug>/tokens.json

# 4. Build
pnpm tokens

# 5. Verify the block landed in src/styles/tenants.css
rg 'data-brand="<slug>"' src/styles/tenants.css

# 6. A consumer selects it with <html data-brand="<slug>">.
```

A client's brand follows the same steps in the client's own repository, or
skips the file entirely and calls `brandOverlayStyle` / `brandOverlayCss`
from `@hirobius/design-system/brand` (`docs/CONSUMING.md` §12).

---

## Why semantic-only overrides

A tenant who wants a brown accent has two paths conceptually:

**Wrong:** override `primitive.color.blue.500` to brown. Breaks every
component that uses blue for non-accent purposes (focus rings, info
feedback, link colors, brand-blue-only doc-page elements). Loses the
ability to refer to "real" blue at the primitive layer.

**Right:** override `semantic.accent.rest` (and the few related semantic
accent paths) to brown. Every consumer of `semantic.accent.*` shifts; every
consumer of `primitive.color.blue.*` is unaffected. The abstraction holds.

This is the _whole point_ of the three-tier token system. Overlays exist to
shift the semantic meaning of tokens for a specific brand, NOT to redefine
the underlying palette.

---

## Validation flow

When the build pipeline lands (`12m-mt-build-pipeline`):

1. `scripts/check-tenant-tokens.mjs` runs in `pnpm test` (pretest) and `pnpm tokens`.
2. For each `directions/*/tokens.json`:
   - Parse as JSON; fail on syntax errors.
   - Walk the token tree; collect leaf paths.
   - Reject if any leaf path is `primitive.*` (R1).
   - Reject if any leaf path doesn't exist in base (R5).
   - Resolve aliases (R7, R8) — fail on unresolvable refs.
   - Check `metadata.json` matches the schema above.
   - Check directory slug matches `metadata.slug`.
3. On pass: `build-tokens.mjs` emits the block into `tenants.css`.

---

## Future extensions (out of scope for this commit)

- **Per-direction typography licensing** (`12m-mt-typography-licensing`): a
  direction may override `primitive.font.family.primary` IF the licensing
  layer approves. Schema gets a `licensingApproved: true` flag at the metadata
  level. This is the only carve-out to R1 — and it requires explicit human
  sign-off in metadata.json.
- **Per-tenant Figma masters** (`12m-mt-figma-master-per-tenant`): superseded
  by the `Hirobius/Brand` and `Hirobius/Density` variable collections.
  `pnpm figma:model` turns the overlays of the directions listed in
  `figma/brand-modes.json` into one Brand mode each, after this validator
  passes them. A client's brand never enters the shared library (ADR-035).
  See `figma/README.md` (Brand and Density).
- **Direction preview tool**: a route in the doc site (`/preview/<slug>`)
  that sets `data-brand` at runtime so designers can see a direction without
  leaving the HDS doc app.
