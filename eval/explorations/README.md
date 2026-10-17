# Design explorations spec set

Three directions per open Ops screen, built only from the packed HDS package, gated,
then mined for the gaps they expose. This directory holds the briefs, the invented
fixture data and the committed runs. The gating code is in `scripts/lib/explorations/`
and runs as options on the consistency harness entry, `scripts/eval-consistency.mjs`.
The plan is hirobius/hds#628 (phase 0 is this directory); the screens replace the five
generic scenarios of hirobius/hds#520.

## Why a directory of its own, not a second spec set in eval/consistency

The consistency harness asks whether three agents build ONE screen the same way: its
thresholds are Jaccard overlap and pixel diff, its runs are measurements over time in a
ledger, and its conditions are frozen so a before and an after compare. Explorations ask
the opposite question. A, B and C differ on purpose, a run is evidence for a decision and
not a data point, and nothing is frozen. Sharing the directory would mean either exempting
explorations from half the harness's rules or bending the rules a ledger entry depends on.

So the data lives here, and the code is shared:

|                               | `eval/consistency`                                     | `eval/explorations`                                              |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Question                      | Do three agents build one screen alike?                | Is each of three different directions fit to show?               |
| Runs                          | gitignored; force-added when a ledger entry cites them | committed: `src/` is the record, screenshots live on the board   |
| Result                        | a ledger entry, judged by five thresholds              | `gates.json` per direction; no ledger entry, ever                |
| Build, lint, axe, screenshots | the harness's stages                                   | the same stages (no second runner), with a wider viewport matrix |
| Template                      | `eval/consistency/template/`                           | the same template; a tenant is applied by the harness            |

## Layout

```text
eval/explorations/
  README.md            this file
  gap-ids.json         the predicted gaps, as ids a gap log may reuse
  screens/<screen>/
    brief.md           the job, the screen, the fixture shape, the states, the rules
    fixture.json       invented data for the screen and for each required state
  runs/<YYYY-MM-DD>/<screen>-<A|B|C>/
    src/App.tsx        (plus any files under src/, and src/fixture.json unchanged)
    rationale.md       one line
    refs.json          the tenant, the 21st searches, the links and what was taken
    bend-log.json      direction C only
    gaps.json          the gap log
  fixtures/runs/2026-10-13/standing-{A,B,C}/
                       a dummy run in the same layout (a trimmed fixture, three small apps,
                       C with one listed bend): the example a generator can read, and the
                       input the harness tests and the board template can render
```

The six screens, in priority order (`scripts/lib/explorations/spec.mjs` is the one list):

| #   | Screen id          | Feature                                              |
| --- | ------------------ | ---------------------------------------------------- |
| 1   | `standing`         | hirobius/ops#585                                     |
| 2   | `ops-home`         | hirobius/ops#591, hirobius/ops#593                   |
| 3   | `drops-inbox`      | hirobius/ops#594                                     |
| 4   | `pitch`            | hirobius/ops#482, hirobius/ops#489, hirobius/ops#488 |
| 5   | `leads`            | the Leads visual pass (hirobius/ops#585)             |
| 6   | `client-dashboard` | hirobius/hds#622                                     |

## The directions and their gates

| Direction   | May move                                | Lint (the harness scan and the lint plugin)                                   | axe                                   |
| ----------- | --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| A, Faithful | nothing; renders at the HDS default     | 0 violations                                                                  | 0 serious or critical, light and dark |
| B, Ceiling  | tokens, through one demo tenant overlay | 0 violations                                                                  | the same                              |
| C, Wildcard | anything, if logged                     | every violation listed in `bend-log.json`, and every listed violation present | the same, no exception                |

"Lint" is two tools, run over the same `src/` files, with one violation both report counted
once (`scripts/lib/explorations/plugin-lint.mjs`):

- the harness's own violation scan (`scripts/lib/consistency/violations.mjs`): raw hex and
  colour functions, raw `px`, Tailwind utility classes, raw `button` / `input` / `select` /
  `textarea`, custom CSS;
- the error rules of the lint plugin's `recommended` config, the plugin consumers install
  as `@hirobius/design-system/eslint-plugin` (source in `scripts/eslint-plugin-hds/`), which
  also see a raw `<form>` and bare numbers on spacing props in `style`. Its warnings do not
  gate. Inline `eslint-disable` comments are ignored, and a file it cannot parse fails.

axe is the harness's: the same engine, rule sets (WCAG 2.0 to 2.2 A and AA) and blocking
impacts as `scripts/check-docs-axe.mjs`. Explorations scan every viewport in both themes
(1280 and 390, light and dark), where the consistency run scans 1280 only.

Every direction also passes: layout (the files below), the gap log, and the PII check.
A direction that fails any gate is not shown on a board.

## Running the gates

```sh
# source only: layout, lint, bend log, gap log, PII. No network, no browser, nothing written.
pnpm eval:consistency -- --explorations eval/explorations/runs/<date> --offline

# everything: also pack, build, render 1280 and 390 in light and dark, axe every viewport.
# Needs the npm registry and Chromium (PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers in remote sessions).
pnpm eval:consistency -- --explorations eval/explorations/runs/<date>

# rank the gaps across every screen
pnpm eval:consistency -- --gaps eval/explorations/runs
pnpm eval:consistency -- --gaps eval/explorations/runs --json

# check fixture data (or any file or directory) for real-looking personal data
pnpm eval:consistency -- --pii eval/explorations/screens
```

Exit 0: every gate passes. Exit 1: a gate failed (named, with file and line). Exit 2:
usage, input or environment error. A full run writes PNGs and `gates.json` to
`reports/explorations/<date>/` (gitignored); input under `eval/explorations/fixtures/` is
keyed by its own path, so it cannot overwrite a recorded run. `--skip-build` reuses the
tarball a previous full run left in `reports/consistency/pack/`.

## What a direction leaves behind

### `rationale.md`

One line, 240 characters or fewer: what this direction argues. It sits under the direction
on the board.

### `refs.json`

```json
{
  "tenant": "soft-demo",
  "searches": [{ "tool": "search", "query": "status bands list collapse" }],
  "refs": [
    {
      "url": "https://21st.dev/community/example",
      "took": "Idea: collapse a long band after three rows"
    }
  ]
}
```

- `tenant`: the demo tenant the harness applies when it renders the direction; `null` is the
  HDS default. A renders at the default, B must declare one (it pushes tokens through a
  tenant overlay, so without one it is a second A), C may do either. Only a tenant with
  `"demo": true` in `tenants/<slug>/metadata.json` is accepted: a client tenant fails the
  gate, and so does a slug with no directory under `tenants/`.
- `searches`: every 21st MCP call. `tool` is one of `search`, `get_inspiration`, `get_theme`
  and `get_component`; a `get_component` call needs a `reason` (why the preview was not
  enough). The endpoint also exposes tools that edit or delete things on the account; the
  repo's Claude settings are to deny them (phase 0 of hirobius/hds#628), and they are never
  valid here.
- `refs`: the links and what was taken. 21st supplies ideas, never code: nothing it returns
  enters `src/`, and the scan above is the guard for the parts it can see.

### `bend-log.json` (C only)

```json
[
  {
    "kind": "hex",
    "file": "src/App.tsx",
    "match": "#7c3aed",
    "why": "The hero needs a violet the palette has no step for.",
    "change": "token: add a supporting accent (a violet primitive) to the semantic tier"
  },
  {
    "kind": "design-rule",
    "rule": "DESIGN.md: no gradients",
    "why": "A soft fade from the page to the first card sets the hero apart.",
    "change": "rule: allow one token-driven gradient on a hero surface"
  }
]
```

- A scanner bend names a violation the code contains: `kind` (a scan kind, `hex`,
  `colour-fn`, `px`, `raw-control`, `custom-css` or `tailwind`, or a lint plugin rule,
  `hds/no-raw-controls`, `hds/no-raw-hex`, `hds/no-raw-px-spacing`, `hds/no-status-clutter` or `hds/sx-token-first`),
  `file` and the exact `match` text the gate prints, with `why` and `change`. A violation
  both tools report is printed once, under the scan's kind, and one bend covers it. One bend covers every occurrence of that text in that file,
  because lines move as a direction is edited. A bend with no matching violation is stale and
  fails the gate, so the log says what the code does.
- A `design-rule` bend names a DESIGN.md rule the code bends that no scanner can see
  (gradients, glass and glow built from tokens, for one). It is never stale.
- `change` is the token, component, pattern or rule change that would make the bend legal:
  it is what turns a Wildcard Adrian likes into a proposal, and rule changes land as an ADR
  plus a `DESIGN.source.md` edit (hirobius/hds#628, decision 3).
- A and B may not have a `bend-log.json`. C must have one; `[]` says it bent nothing.

### `gaps.json`

```json
[
  {
    "screen": "drops-inbox",
    "direction": "B",
    "kind": "component",
    "id": "file-drop-control",
    "needed": "A file drop control with per-file progress and a retry affordance",
    "didInstead": "A Button that opens the native picker, with progress as plain text",
    "proposal": "Add a FileDrop pattern: drop target, picker button, per-file progress, retry",
    "evidence": "src/Capture.tsx:41; drops-inbox-B-390-light.png"
  }
]
```

`kind` is one of `token`, `component`, `pattern`, `rule`, `bug`. A direction writes `[]` when
it needed nothing HDS lacks, escaped nothing and fought no rule. `id` is optional. Two
sessions describe one gap two ways, and a session never sees another's log, so the ranking
cannot match free text. Reuse an id from `gap-ids.json` when your gap is one of the
predicted ones; otherwise coin a kebab-case id, or leave it out and the gap merges on its
kind and its wording with case, spacing and punctuation folded.

`--gaps` validates every log and ranks the gaps by how many distinct screens hit each one
(a screen counts once however many of its directions hit it), then by total hits, then by
id. A direction run on two dates counts once, from the newest date. An invalid log is
reported and its gaps are not ranked.

## Fixture data and the PII check

`screens/<screen>/fixture.json` is invented: fictional businesses, people and towns, phone
numbers in 555-01xx, addresses at example.com. The check (`--pii`, and part of every
`--explorations` run) looks for the SHAPE of real data:

- a phone number outside the reserved fictional range 555-01xx (North American, with or
  without a country code, or international);
- an email address whose domain is not example.com, .org or .net (RFC 2606);
- a denylisted term, whatever its case. Every non-demo tenant's slug and name is on the
  list, so a client never reaches a board. Add private terms with `--denylist <file>` (one
  per line) or `EXPLORATIONS_PII_DENYLIST`, and keep that file outside the repository: a
  list of real names committed here would be the leak it guards against.

hds had no PII or denylist tooling before this (the only denylist under `scripts/` is the
license one), so this is a minimal check, not a guarantee. It cannot know that a number in
the fictional shape is not someone's, or that an invented name is not a real business.
Names in the fixtures are invented and have been kept generic; if one turns out to match a
real business, change it.

The check reads everything a direction would publish: `src/`, including `src/fixture.json`,
and the meta files. A run also checks each screen's `fixture.json`.

## `gates.json`

A full run writes `reports/explorations/<date>/gates.json`, the machine-readable result the
board reads, so a failing direction is never shown and a missing screenshot is a visible gap:

```json
{
  "date": "2026-10-13",
  "run": "eval/explorations/runs/2026-10-13",
  "mode": "full",
  "pack": { "tarballSha256": "...", "commit": "...", "dirty": false, "version": "..." },
  "pass": true,
  "fixtures": { "status": "pass", "detail": [] },
  "directions": {
    "standing-B": {
      "screen": "standing",
      "direction": "B",
      "tenant": "accent-lilac",
      "pass": true,
      "checks": [{ "name": "lint", "status": "pass", "text": "0 violations", "detail": [] }],
      "screenshots": { "1280-light": "standing-B-1280-light.png" }
    }
  }
}
```

`checks` are `layout`, `lint`, `gaps`, `pii`, `builds` and `axe`, each `pass`, `fail` or
`not-measured`. `screenshots` holds the four PNGs (`1280-light`, `1280-dark`, `390-light`,
`390-dark`) for a direction that built.

## Producing a direction

A session builds one screen: the three directions of one brief, one app each, in a fresh
context with only the inputs the brief allows. The orchestrator gives it a workspace holding
a copy of `eval/consistency/template/`, the packed tarball extracted to
`node_modules/@hirobius/design-system/`, and the brief, `fixture.json`, this README and
`gap-ids.json` for its screen. The session writes
`runs/<date>/<screen>-<A|B|C>/` into the workspace; the orchestrator copies the three
folders into this repository's `runs/<date>/` and runs the gates. Sonnet builds A and runs
the harness, Opus builds B and C (hirobius/hds#628, "Models").

A direction renders under the template's `data-hds` / `data-theme` scope. The harness sets
`data-brand` on that same element for a declared tenant, because a tenant's dark overrides
are scoped to `[data-brand][data-theme="dark"]` on one element; a wrapper inside the scope
would lose them. It refuses a tenant the packed stylesheet has no rules for, rather than
rendering the default.

## Tests

`scripts/__tests__/explorations-gaps.test.mjs` (validator, ranking, loader),
`explorations-pii.test.mjs`, `explorations-gates.test.mjs` (layout, lint, bend log: the C
app with an unlisted violation fails, the same app with it listed passes),
`eval-explorations.test.mjs` (the orchestration with fake stages, and the CLI over run
directories written to temp dirs and over the dummy run) and `explorations-briefs.test.mjs` (the briefs, fixtures
and gap ids in this directory). None needs a network or a browser.
