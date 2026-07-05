---
'@hirobius/design-system': minor
---

Add the Tier-2 pattern layer closing the Astryx coverage gap (#76) — 8 composite/pattern components, zero new runtime dependencies:

- **MetadataList** (`Display`) — semantic `<dl>` of term/description pairs; the canonical metadata slot (horizontal/vertical).
- **OverflowList** (`Layout`) — count-based list that collapses overflow into a `+N` chip (SSR/test-safe, not width-measured).
- **TopNav** (`Navigation`) — top navigation bar with brand / links / trailing slots and optional sticky.
- **AppShell** (`Layout`) — application scaffold with header, sidebar, and main regions (semantic `<header>`/`<aside>`/`<main>`).
- **SelectableCard** (`Actions`) — card that behaves as a selectable option (`role="checkbox"`, full keyboard/ARIA).
- **Tokenizer** (`Inputs`) — token/chip input composing `Tag`; Enter to add, Backspace to remove.
- **FileInput** (`Inputs`) — styled file picker / dropzone over a real native `<input type="file">`, with drag-and-drop.
- **HdsMultiSelector** (`Inputs`) — multi-select dropdown composing `Popover` + a checkbox option list (no new dep).

Each ships colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture. The `virtual hds-manifest` size-limit budget was bumped 41→46 kB to accommodate the enlarged public component surface (justified in `.size-limit.cjs`).
