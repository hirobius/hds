# Hirobius Design System

The token-first React product foundation the Hirobius fleet consumes: one opinionated, re-themeable system. These are the words the theming layer uses; ADR-035 is the decision behind them.

## Language

**Direction**:
A curated, reviewed art direction any consumer can select, carried as a named bundle of token overrides.
_Avoid_: demo tenant, skin (site-engine's word for the same thing), theme

**Brand**:
One client's visual identity: its accent, surfaces, type and shape. Lives with the client, never in the shared package or the shared Figma library.
_Avoid_: tenant, client overlay

**Preference**:
A viewer's runtime choice: light or dark theme, comfortable or compact density.
_Avoid_: mode (ambiguous with a Figma variable mode)

**Overlay**:
The partial token file that carries a direction or a brand: only the paths it overrides, semantic tier or higher.
_Avoid_: tenant tokens, theme file

**Lever**:
One named override axis every render target understands the same way: accent, radius, density, font pairing, type scale, shadow, motion.
_Avoid_: knob, dial (the root-attribute contract in ADR-023 keeps "dial" for `data-theme`, `data-density`, `data-brand` and the font variables)

**Tenant** (retired):
The old word for both a direction and a brand. It survives only in attribute and API names kept for compatibility: `data-tenant`, `TenantProvider`, `tenants.css`.
