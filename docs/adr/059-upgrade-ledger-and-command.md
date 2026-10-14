# ADR-059: Codify upgrades: release ledger, upgrade command, CSS contract

**Status:** Accepted, retroactive (decided 2026-10-01; recorded 2026-10-13 from commit and PR history). The CSS contract part landed 2026-10-08.

## Context

hds#445 opened on 2026-10-01 as the umbrella for a "universal upgrade path". Its gap
list was blunt. Steps were prose in CHANGELOG.md and MIGRATIONS.md, and "neither
file ships in the package". Detection covered export names only. "Nothing reads
changeset bump types": 0.20.0 dropped five runtime dependencies under Patch Changes.
Consumers sat on old versions, and only one upgrade issue had been filed, by hand.

hds#447 states the root problem: "No machine-readable record says what changed in a
release." The committed API baselines could not stand in as history either. At tag
v0.19.1, `docs/api/api-baseline.json` said version 0.18.0. The 0.20.0 tarball
shipped neither MIGRATIONS.md nor CHANGELOG.md, so the MIGRATIONS link in
CONSUMING.md was dead inside `node_modules`.

hds#449 found a second blind spot in CSS. Between 0.19.1 and 0.20.0, `dist/styles.css`
and `dist/tokens.css` each lost 148 class names. About 124 of them were Tailwind
utilities with no note anywhere. The 0.17 type ramp had also changed the value of 10
primitive sizes with no gate looking at values.

## Decision

Make every release carry one machine-readable record, and build the command and the
gates on it.

- **Ledger.** `upgrade/releases/<version>.json` holds typed steps with an impact
  level, a plain sentence, a detector for consumer code and an optional codemod
  (hds#447, PR #473). The schema is generated from zod. Snapshots under
  `docs/api/releases/` are built from the published tarballs and diffed.
- **Backfill.** Ledgers for 0.17.0 to 0.20.0 were written from the tarballs, with
  frozen per-release sources so later edits cannot rewrite a shipped ledger. The
  floor is 0.16.0 (hds#450, PR #542).
- **Gate.** `check-upgrade-ledger` runs in `pretest`. It fails a fact with no step, a
  changeset with no `upgrade/pending` note, and a breaking change under less than a
  minor below 1.0. It also fails a major bump or a 1.0 version without
  `upgrade/ALLOW_1_0`, because "the 1.0 cut is a decision" (hds#396) (PR #543).
- **Compile.** At `changeset version`, the ledger compiles into UPGRADING.md,
  `upgrade/index.json` and `status.json`. The package now ships UPGRADING.md,
  MIGRATIONS.md, CHANGELOG.md and the ledgers, and `check-pack-contents` requires
  them (hds#451, PR #546).
- **Command.** `npx @hirobius/design-system@latest upgrade` reads the shipped steps,
  finds each importer's installed version from the lockfile, applies codemods oldest
  first, bumps the range, installs and typechecks (hds#452, PR #547). It has
  `--dry-run`, `--check` and `--json`.
- **Consumer discovery.** `pnpm upgrade:consumers` lists dependents from the GitHub
  API and redacts private repos on any public surface (hds#453, PR #474).
- **CSS contract.** `build:lib` writes `dist/css-contract.json`. Snapshots gain a
  `css` section, and `check-upgrade-css` fails a CSS fact with no step (hds#449
  part 1, PR #564).

## Alternatives considered

None recorded at the time. hds#445 lists the gaps in the old process (prose steps,
four one-off codemod bins, `pnpm api:update` silencing removals) and does not weigh
other designs.

## Rationale

The reasons recorded are the gaps in hds#445 and hds#447. Prose could not be
checked, and a hand-kept consumer list went stale: the discovery commit says
"ops finds projects from Vercel deployments only, so a repo with no deploy is
invisible." The private-name redaction exists because "hds is public and most
consumers are private, so the list is never committed."

## Consequences

- Still in force on origin/main. `upgrade/releases/` holds ledgers through 0.24.1,
  `package.json` has the `design-system` bin, and `pretest` runs
  `upgrade/compile.mjs --check` and `check-upgrade-ledger.mjs`.
- The CSS gate paid off the day after it landed. The apple-green accent change
  (c88ab39, 2026-10-09) needed 11 `value-changed` steps because "main's
  check-upgrade-css gate (hds#449) requires an upgrade step per changed CSS var."
- hds#445 asked for a generated utility safelist. The commits read for this ADR show
  only "part 1" of hds#449 landing, so the safelist is not confirmed built.
- Ledgers up to 0.22.0 are frozen: their CSS facts need no step
  (`LAST_RELEASE_WITHOUT_CSS_STEPS`).

## Lessons

- Put the change record in the package. A changelog that is not in the tarball does
  not reach the consumer who needs it.
- A rule about "what counts as breaking" needs a gate that reads the diff. Bump
  types in a changeset were never checked until this work.
- Freeze each release's sources. Live codemod data and CHANGELOG line numbers drift,
  and a shipped ledger must not drift with them.

## Evidence

- `11a0c5b` feat(upgrade): release ledger, schema, snapshots and the 0.20.0 record (PR #473)
- `8928d49` feat(upgrade): find every HDS consumer, with private repos redacted (PR #474)
- `b1a6e65` feat(upgrade): ledger backfill 0.17.0 to 0.19.1 from the published tarballs (PR #542)
- `5b2e42a` feat(upgrade): gate, every change needs an upgrade step and the right bump (PR #543)
- `dc49033` feat(upgrade): compile UPGRADING.md and the upgrade record, and ship them (PR #546)
- `fc61af3` feat(upgrade): npx @hirobius/design-system@latest upgrade, the one command (PR #547)
- `b43d6bc` feat(upgrade): CSS contract and the check-upgrade-css gate (PR #564)
- `c88ab39` feat(brand): bright apple-green accent (PR #571)
- hds#445: Universal upgrade path: one record, one command, one page per release
- hds#447: Release ledger: schema plus a machine-derived 0.20.0 record
- hds#449: CSS contract: record every variable, value and class per release
