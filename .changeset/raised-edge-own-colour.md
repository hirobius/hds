---
'@hirobius/design-system': minor
---

Raised edges take their own colour (#897). The hard "raised" edge under a Button or Kbd is now the item's own fill stepped two OKLCH steps darker (lightness −0.12, chroma ×0.7225, same hue), instead of one `semantic.color.shadow.hard` for everything. In dark, where a darker edge would fall under 1.5:1 on the page, raised, overlay or muted surface, the fill steps lighter instead (a lighter rim) until it clears 1.5:1. Geometry is unchanged (`0 3px 0` / `0 5px 0` / `0 1px 0`, Kbd `0 2px 0`). Looks different, no code change needed.

- The edges are precomputed at token build time as new CSS variables `--hds-edge-primary`, `-secondary`, `-danger`, `-success`, `-warning`, `-info` and `-kbd` (accent themes and tenants that move the accent re-derive `--hds-edge-primary`). Button picks its variant's or tone's edge; `--hds-btn-edge` / `--hds-kbd-edge` still override it.
- `semantic.color.shadow.hard` stays exported but is no longer the default edge colour; set `--hds-btn-edge: var(--semantic-color-shadow-hard)` (and `--hds-kbd-edge`) to get the old single-colour edge back.
