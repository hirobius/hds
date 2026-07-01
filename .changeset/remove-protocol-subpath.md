---
'@hirobius/design-system': minor
---

**BREAKING:** remove the `./protocol` subpath export. It carried the signed
WebSocket envelope for the legacy hand-rolled Figma bridge, which has been
archived (`archive/figma-bridge` branch) in favor of the official Figma MCP
server + Code Connect (ADR-019). No consumer app imports it — it existed only
to share the envelope with the custom Figma plugin. All other exports
(components, stylesheets, `tokens`, `cn`, `manifest`, `contexts`, `form`,
`mui`) are unchanged. If you did import `@hirobius/design-system/protocol`,
pin `<0.10.0` or vendor `protocol/envelope.mjs` from the archive branch.
