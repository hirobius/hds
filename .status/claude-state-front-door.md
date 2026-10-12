Generate a "Front door" section in AGENTS.md (what the repo is, read order, where live state is, an index of docs by kind from docs/state-surfaces.json), with a --root flag and a pretest --check; CLAUDE.md and README point to it (hds#613).

- Front door names the ops dashboard without a host (AGENTS.md ships in npm).
- Review fixes (hds#612/#613): review age warns (--strict-review fails); generated surfaces name a verified check or say unchecked, with real --check on the DESIGN/handoff/llms/README/disposition generators; the repo front door moved out of the shipped AGENTS.md to docs/ai/FRONT-DOOR.md (+ DOCS-INDEX.md); dead-ref and derived-fact detection tightened.
