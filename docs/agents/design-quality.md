# Design-quality skill: impeccable (hds#553)

On-demand detail for the one-line routing in `CLAUDE.md`.

`.claude/skills/impeccable/` vendors a curated subset of
[pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0), pinned in
`skills-lock.json` at the same commit as site-engine, so the fleet has one pin.

- **UI/visual quality pass on a component, page or docs surface →
  `/impeccable critique <target>`** (review), then **`/impeccable polish <target>`**
  (fix pass). Layout/spacing → `/impeccable layout`; typography → `/impeccable typeset`;
  a11y/perf/responsive → `/impeccable audit`; edge cases (overflow, long text, error
  states) → `/impeccable harden`.
- **Deterministic no-LLM sweep → `node scripts/check-impeccable-detect.mjs [target…]`**
  (`pnpm check:impeccable`; guardrail `check-impeccable-detect`, `warn`, `on-demand`
  channel: Actions is off and nothing automatic fires it; wraps `npx impeccable detect`,
  exits 78 offline). Today it flags Plus Jakarta Sans as an overused font: a known,
  accepted finding (it is HDS's chosen face).
- Only the curated reference subset is vendored (see the lock's `paths`); commands
  outside it (e.g. `/impeccable animate`) are not installed. Vendor the missing
  `reference/<command>.md` at the pinned commit first if one is needed.
- impeccable complements, never replaces, HDS's own gates and `/design-review`.
