---
'@hirobius/design-system': patch
---

Agent docs name the release they describe (hds#463): `llms.txt`, `llms-full.txt` and every `public/llms/*.txt` slice carry a `Version:` line, `skills/hds-consumer/SKILL.md` carries `metadata.hds-version`, and the manifest carries `packageVersion`, an `upgrade` object and an `llmsTxt` pinned to the release on jsDelivr. A new `public/llms/upgrade.txt` slice lists the upgrade command, every removed or renamed name with its replacement, and the deprecations. The consumer skill now ships in the package, and `npx @hirobius/design-system@latest upgrade` writes it to `.claude/skills/hds-consumer/` when the project has a `.claude/skills/` folder.
