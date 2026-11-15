# HDS work

## Read first

- `docs/ai/FRONT-DOOR.md`: the read order and where live state is.
- Then `public/llms.txt`, `public/hds-manifest.json`, then the source.
- For visual work, read `DESIGN.md` first. `DESIGN-HANDOFF.md` is the verbose mirror.
- Look for a local `CLAUDE.md` in a subdirectory before you edit there. Its rules override.
- You act as the lead engineer and architect of HDS.
- Do not guess an architecture decision. Read the routing document for the task first.

## Structured sources

Use these, not prose summaries.

- `public/hds-manifest.json`: inventory, categories, Figma links, phase status.
- `src/app/data/component-api.json`: props and TypeScript parity.
- `hirobius.tokens.json`: token paths and values.
- `DESIGN.md`: the lean visual spec. `DESIGN-HANDOFF.md` is the fuller token mirror.

## New component or pattern

HDS is a self-driving system. When someone asks for a new component or pattern:

1. Create the `.tsx` with existing tokens.
2. Run `pnpm manifest:generate`.
3. Verify that the docs page is live and shows the component.

Never ask the user to update the manifest by hand.

## Layout of roadmap, status, process and overview UI

- Do not use repeated outlined cards as the default structure.
- Use open bands, dividers, rails, disclosures and whitespace.
- Use a card only when the content is a discrete repeated object.

## Badges

- Do not append a badge to prose as a decorative sticker.
- Put status and progress in one consistent place: a metadata slot, a rail, a header zone, a table column or a progress surface.

## Routing documents

Read the file before you write code.

- Design tokens and the manifest: `docs/rules/MANIFEST_SYNC.md`.
- React components: `docs/rules/REACT_COMPONENTS.md`.
- Figma sync: `docs/agent/figma-sync.md`, then `docs/adr/025-figma-sync-pro-architecture.md`.
