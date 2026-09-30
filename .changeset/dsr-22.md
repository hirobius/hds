---
'@hirobius/design-system': patch
---

The npm package now ships the agent context: `llms.txt`, `public/llms-full.txt` (with topic slices in `public/llms/`), `DESIGN.md`, `CONSUMING.md`, `docs/CONSUMING.md` and `src/app/data/component-api.json`, and the same files are served at the Storybook host. `hds-manifest.json` now points `docs` and `llmsTxt` at `https://hirobius-design-system.vercel.app` and names `llms.txt` as `agentEntrypoint`. A new `check-pack-contents` gate (part of `smoke:consumer`) fails when the tarball is missing any of these.
