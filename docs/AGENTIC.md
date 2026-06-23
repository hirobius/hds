# Agentic surfaces

HDS is built to be consumed by **agents**, not just humans — components, props,
tokens, and a11y rules are machine-readable so a consuming LLM/agent can discover
the system without scraping source. This documents those surfaces, what ships in
the package, and how to consume each. (Roadmap E1/E2.)

## The surfaces

| Surface | File | Package access | Purpose |
|---|---|---|---|
| **Component manifest** | `public/hds-manifest.json` | ✅ `@hirobius/design-system/manifest` | Inventory + per-component `componentSpecs` (tier, category, **props**, **a11yRules**, `tokenMapping`, `variantAxes`, `slots`, `requiredProps`) |
| **Consumer recipes** | `docs/agentic/consumer-recipes.json` | ⚠️ in-repo (not yet a subpath) | 48 published components → import + summary + props + variants + a11y, derived from the manifest. `pnpm docs:recipes` |
| **Token bridge (TS)** | `dist/tokens.js` | ✅ `@hirobius/design-system/tokens` | Theme-aware `var(--…)` token constants |
| **DTCG token source** | `hirobius.tokens.json` | ✅ shipped in `files` | Canonical 4-tier token graph (primitive→semantic→component→role) |
| **Component API** | `src/app/data/component-api.json` | ⚠️ generated (`pnpm docs:api`), not committed | Reflected TS prop tables (feeds `llms.txt`) |
| **LLM map** | `public/llms.txt` | ❌ not in `files` (live at `/llms.txt`) | Human+agent system overview |
| **Code Connect** | Figma file "✦ Code Connect" page | ⚠️ scaffolded, no mappings yet | Maps Figma components ↔ code components |

## How an agent consumes HDS

```ts
import manifest from '@hirobius/design-system/manifest';      // inventory + specs
import { hds, tokens } from '@hirobius/design-system/tokens';  // token values

// Discover a component's contract without reading source:
const button = manifest.componentSpecs.Button;
button.props;       // { variant: { type:'enum', values:[...], default:'secondary' }, ... }
button.a11yRules;   // [{ rule:'Must have accessible name…', required:true }, ...]
button.tokenMapping;
```

The `consumer-recipes.json` is the pre-digested form of the above — one entry per
published component with a copy-pasteable `import`, prop schema, and a11y rules.

## Recommended hardening (gaps)

These would make the agentic surface first-class in the **published package**
(today some are repo-only):

1. **Ship `llms.txt`** — add `public/llms.txt` to `package.json#files` so agents
   resolving the installed package (not the live site) can read it.
2. **Expose `component-api.json` + `consumer-recipes.json` as subpath exports**
   (e.g. `@hirobius/design-system/recipes`) and commit/ship them, so prop tables
   and recipes resolve from `node_modules` without a build step.
3. **Populate Code Connect** — add `figma.connect` mappings so the Figma library
   links to code components (see `docs/accessibility/CONFORMANCE.md` for the a11y
   side and the Figma thread for the variables/components import).

## Why this is the differentiator

A machine-readable manifest + reflected props + `llms.txt` + Code Connect is rare
— most "design systems" claim agentic readiness; HDS actually ships the data.
Productizing these surfaces (docs + exports + recipes) is the highest-leverage
moat, per the consumer architecture assessment.
