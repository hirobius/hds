# Exploration brief: Standing bands, desktop and phone

Screen 1 of 6 in the design explorations (hirobius/hds#628). Feature: hirobius/ops#585. Adrian does not want to open `/ops/standing`: it tries to show everything at once and reads as a wall of red when a token is missing. He wants what agents did and are doing, what is parked, the backlog, what waits on him, and whether anything is on fire.

Read `README.md` in your workspace for how a run is laid out and gated. Everything else you need to build is below.

## The job

- Anything on fire is at the very top, and the band disappears when nothing is wrong, so silence means all clear.
- A missing or expired token is one line naming the variable and the fix, never a red page.
- Everything waiting on Adrian is in one band, each row saying the exact step to take. Decision issues come ordered by `decide_by`, nearest deadline first.
- Running now (Ralph-claimed issues, open PRs, active Claude sessions), Parked (with the park reason), Backlog, and Shipped this week each have their own band.
- Each row shows title and repo number, why or the next step, age or last activity ("parked 3d", "running 12m"), and links to the issue, PR or session.
- Band headers show a count. Long bands show the first few rows and a "show all".
- It works on a phone and refreshes itself while open.
- Repo rule for status UI: open bands, dividers, rails and whitespace, not a wall of outlined cards.

## The screen

- One column of stacked bands, top to bottom: On fire (hidden when empty), Waiting on you, Running now, Parked, Backlog, Shipped this week.
- Each band: a header with its name and count, then rows. Show the first `showFirst` rows; a "show all" control reveals the rest.
- A freshness line ("updated 12s ago") and any `sourceErrors`, one line each.
- Rows are `issue`, `pr`, `session` or `alert` (a token problem). Rows must stay scannable at 390 wide with a long title.
- 1280 and 390 matter equally here: Adrian checks this page on his phone.

## Fixture data

Invented data, in `fixture.json` next to this brief: fictional businesses, people and towns, 555-01xx phone numbers, example.com addresses. It passes the PII check, and so must anything you add to it, though you should not need to. Use it as it is; do not rename its fields.

```ts
type Row = {
  kind: 'issue' | 'pr' | 'session' | 'alert';
  repo: string | null; // 'harborlane/ops'
  ref: string; // '#585', a session id, or the variable name for an alert
  title: string;
  why: string; // the reason or the next step, in one sentence
  ageLabel: string; // 'parked 3d', 'running 12m', 'decide in 2d'
  at: string; // ISO timestamp
  url: string | null;
};
type Bands = {
  fire: Row[];
  waiting: Row[];
  running: Row[];
  parked: Row[];
  backlog: Row[];
  shipped: Row[];
};
type SourceError = {
  source: 'github' | 'sessions';
  summary?: string;
  detail?: string;
  variable?: string;
  fix?: string;
};
type Fixture = {
  showFirst: number;
  refreshSeconds: number;
  updatedLabel: string;
  bands: Bands;
  sourceErrors: SourceError[];
  states: {
    empty: Data;
    loading: { note: string };
    error: Data;
    longContent: Data;
    tokenFailure: Data;
  };
};
type Data = { bands: Bands; sourceErrors: SourceError[] };
```

## Required states

Render the populated screen first. Below it, a region headed `States` holds one labelled region per state, in this order: `State: empty`, `State: loading`, `State: error`, `State: long content`, `State: token failure`. Each uses the same components as the main screen, at the same width, so the board shows all five without any clicking. The data for each is under `states` in the fixture; a state with only a `note` has no data.

- `State: empty`: Every band empty. The On fire band is absent; the others say plainly that there is nothing to show.
- `State: loading`: Before the first response: the bands as placeholders, in order.
- `State: error`: GitHub rows loaded, Claude sessions did not. The running band still shows what it has, with the source error in one line.
- `State: long content`: Titles over 150 characters, long repo names, 24 backlog rows. Nothing may clip, overflow sideways or hide the row link.
- `State: token failure`: GitHub is unreachable: the On fire band holds exactly one line naming `GITHUB_TOKEN` and the fix. No red page, no empty-state alarm in the other bands.

## The three directions

You build three directions of this screen, each its own app, from this one brief. Same screen, same data, same states. The point is the difference between them, so do not make B a polish of A or C a recolour of B.

| Direction   | Question                    | What may move                                                                                                                          | Gate                                      |
| ----------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| A, Faithful | Is HDS enough as it is?     | Nothing. Today's rules, the best composition they allow.                                                                               | 0 lint violations                         |
| B, Ceiling  | How far do tokens alone go? | Tokens, through one demo tenant overlay: soft shapes, an accent pair, a display face, density. No new components.                      | 0 lint violations                         |
| C, Wildcard | What should HDS add?        | Anything, DESIGN.md included (gradients, glass and glow too), if every bend is logged with the system change that would make it legal. | every violation listed in `bend-log.json` |

All three: axe finds 0 serious or critical issues, in light and dark, at 1280 and 390 wide. C gets no exception.

## Viewports and tenants

The harness captures every direction full page at 1280 and 390 wide, in light and in dark (four PNGs), and axe-scans each of the four. Design for both widths; the screen note above says which one leads.

| Direction   | Tenant, declared in `refs.json`                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A, Faithful | `null`: today's rules at the HDS default                                                                                                                        |
| B, Ceiling  | One demo tenant that moves tokens only. Today: `brutalist-demo` (sharp, dense) or `accent-lilac`. When they land: `soft-demo` (hds#505) and `accent-pair-demo`. |
| C, Wildcard | A demo tenant, or `null`                                                                                                                                        |

The harness applies the tenant to the template's scope element; do not add a tenant wrapper of your own. Only a tenant with `"demo": true` in its `metadata.json` is accepted. A client tenant fails the gate, and a slug that does not exist yet fails it too.

## Allowed inputs

Build from the packed package, as a consumer would. Read and write files only inside your workspace. The design system is installed at `node_modules/@hirobius/design-system/`; anything the package ships is allowed: `AGENTS.md` and `llms.txt` (read both first), `DESIGN.md`, its docs, manifest, component API data and `.d.ts` files. Use the `hds` MCP server (tools to look up tokens and component APIs). Before you finish, directions A and B must pass the `@hirobius/eslint-plugin-hds` `recommended` rules.

Also allowed:

- This brief, its `fixture.json`, `README.md` (how a run is laid out and gated) and `gap-ids.json`, which the orchestrator copies into your workspace. Copy the fixture into `src/fixture.json` unchanged and import it from `src/App.tsx`.
- The 21st MCP, read-only, for ideas: `search`, `get_inspiration` and `get_theme`. Use `get_component` only when an interaction cannot be understood from the preview, say why in `refs.json`, and never paste what it returns. Record every search, every link and what you took in `refs.json`. No 21st.dev code, class names or copy goes into `src/`.

Not allowed: component source, stories or tests from the HDS repository, another direction's app, a run of another screen, and any 21st tool that changes the account (create, edit, delete, bookmark).

## Output contract

Write each direction to `<run>/<screen>-<A|B|C>/`, where `<run>` is the directory the orchestrator names inside your workspace and `<screen>` is this brief's folder name:

- `src/App.tsx`: the root component, exported as default or as `App`, plus any extra files under `src/`. `src/fixture.json` is the fixture, unchanged.
- `rationale.md`: one line, 240 characters at most, saying what this direction argues.
- `refs.json`: `{ "tenant": <demo tenant slug or null>, "searches": [{ "tool", "query" }], "refs": [{ "url", "took" }] }`. `took` says which idea you borrowed. Use `[]` for no searches or no refs.
- `gaps.json`: the gap log, `[]` when you needed nothing HDS lacks.
- `bend-log.json`: direction C only, `[]` when it bent nothing. A and B must not have one.

Rules:

- Do not edit `main.tsx` or `index.html`, and do not touch the `<html>` element. The template owns the `data-hds` / `data-theme` scope.
- Import design-system components only from `@hirobius/design-system` or its subpaths (for example `@hirobius/design-system/patterns`).
- Static data only: the fixture. No network calls.
- Directions A and B: no raw hex, rgb or hsl colours, no raw `px` values, no Tailwind utility classes, no raw `button` / `input` / `select` / `textarea` elements, no custom CSS and no `<style>`. Zero violations.
- Direction C may break those rules and the rules in DESIGN.md. Each bend goes in `bend-log.json`: either a violation the harness reports (`kind` is `hex`, `colour-fn`, `px`, `raw-control`, `custom-css` or `tailwind`, plus the `file`, the exact `match` text, `why`, and `change`), or a DESIGN.md rule the code bends that no scanner can see (`kind: "design-rule"`, plus `rule`, `why` and `change`). `change` is the token, component, pattern or rule change that would make the bend legal. A listed violation the code no longer has fails the gate, so keep the log true.
- Keyboard reachable end to end, focus visible, every control has an accessible name.
- Log a gap in `gaps.json` whenever you needed something HDS lacks, escaped the system or fought a rule. Each gap is `{ screen, direction, kind, needed, didInstead, proposal, evidence }` with `kind` one of `token`, `component`, `pattern`, `rule`, `bug`, and an optional `id`: reuse one from `gap-ids.json` when your gap is one of those, so the index can count it across screens.

## Gaps to confirm, not to build ahead

Predicted for this screen. Confirm each only if you actually hit it, with evidence, and reuse its id so the index can count it across screens. Compose what HDS lacks from what it ships and log the gap with what you did instead. Only direction C may reach outside the system, and only through its bend log.

- `band-section`: A band section: a header with a name and a count, rows, and "show all".
- `supporting-accent`: A supporting accent token, the second half of the planned accent pair.

A band section with a count and "show all" is predicted (hirobius/hds#628). HDS has Disclosure, StatusListItem and Table, but no band.
