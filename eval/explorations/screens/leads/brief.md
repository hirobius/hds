# Exploration brief: Leads page with the 8-stage lead chain

Screen 5 of 6 in the design explorations (hirobius/hds#628). Feature: the Leads visual pass (moved here by hirobius/ops#585). The 8-stage lead chain leaves `/ops/standing` and lands on the Leads page, which gets its own visual pass. The page shows how far real leads get, where the chain breaks, and the leads themselves with the next action for each.

Read `README.md` in your workspace for how a run is laid out and gated. Everything else you need to build is below.

## The job

- See the funnel lead, score, site, preview, outreach, reply, deal, invoice as one chain: a count per stage, and whether the stage is proven (real leads got through), unproven, or the break.
- See the break (the first stage nothing has reached) and the biggest leak (the largest loss between two stages).
- Pull more leads: pick a niche and a metro and pull.
- Work the list: each lead has its business, category, town, rating and review count, a status, and the next action (Generate, Render site) when there is one.
- See when the page last updated, and that it is offline if it is. A failed Generate says what failed, in the lead's own row.
- A missing key is one actionable line naming the variable and the fix.

## The screen

- A page header with the "updated" line.
- The chain: eight stages in order with count, label and verdict, the break and the biggest leak marked. It must read as one chain at 1280 and as one at 390, where eight steps do not fit on a line.
- The pull form: niche and metro choices and a Pull button.
- The lead list: one row per lead with status, score, the next action and any error.

## Fixture data

Invented data, in `fixture.json` next to this brief: fictional businesses, people and towns, 555-01xx phone numbers, example.com addresses. It passes the PII check, and so must anything you add to it, though you should not need to. Use it as it is; do not rename its fields.

```ts
type Stage = {
  key: 'lead' | 'score' | 'site' | 'preview' | 'outreach' | 'reply' | 'deal' | 'invoice';
  label: string;
  count: number;
  verdict: 'proven' | 'unproven' | 'broken';
  note: string;
};
type Chain = {
  stages: Stage[]; // always eight, in funnel order
  break: Stage['key'] | null; // the first stage nothing has reached
  biggestLeak: { from: Stage['key']; to: Stage['key']; lost: number; pct: number } | null;
};
type Lead = {
  id: string;
  business: string;
  category: string;
  city: string;
  region: string;
  rating: number;
  reviewCount: number;
  status: 'sourced' | 'generating' | 'scored' | 'rendered' | 'sent' | 'won' | 'lost';
  score: number;
  nextAction: 'Generate' | 'Render site' | null;
  error: string | null;
  updatedAgo: string;
};
type Leads = {
  chain: Chain;
  leads: Lead[];
  updatedLabel: string;
  offline: boolean;
  pull: { niches: string[]; metros: string[] };
  setupError?: string;
};
// states.{empty,error,longContent,tokenFailure} are Leads; states.loading is { note }.
```

## Required states

Render the populated screen first. Below it, a region headed `States` holds one labelled region per state, in this order: `State: empty`, `State: loading`, `State: error`, `State: long content`, `State: token failure`. Each uses the same components as the main screen, at the same width, so the board shows all five without any clicking. The data for each is under `states` in the fixture; a state with only a `note` has no data.

- `State: empty`: No leads at all: every stage reads zero and the break is the first stage. The pull form is the obvious next step.
- `State: loading`: The chain as eight unlabelled steps and the list as placeholder rows.
- `State: error`: Generate failed on one lead. The error sits in that lead's row and says nothing was saved.
- `State: long content`: Business names over 80 characters, 30 leads, stage notes of several sentences.
- `State: token failure`: Pulling leads is off: one line naming `OUTSCRAPER_API_KEY` and the fix. The chain and the list still show what is already there.

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

Build from the packed package, as a consumer would. Read and write files only inside your workspace. The design system is installed at `node_modules/@hirobius/design-system/`; anything the package ships is allowed: `AGENTS.md` and `llms.txt` (read both first), `DESIGN.md`, its docs, manifest, component API data and `.d.ts` files. Use the `hds` MCP server (tools to look up tokens and component APIs). Before you finish, directions A and B must pass the lint plugin the package ships: `import hds from '@hirobius/design-system/eslint-plugin'` and spread `hds.configs.recommended` into `eslint.config.mjs`. The harness runs its error rules too.

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
- Directions A and B: no raw hex, rgb or hsl colours, no raw `px` values, no Tailwind utility classes, no raw `button` / `input` / `select` / `textarea` / `form` elements, no bare numbers on spacing props in `style`, no custom CSS and no `<style>`. Zero violations from the harness scan or the lint plugin's error rules.
- Direction C may break those rules and the rules in DESIGN.md. Each bend goes in `bend-log.json`: either a violation the harness reports (`kind` is a scan kind, `hex`, `colour-fn`, `px`, `raw-control`, `custom-css` or `tailwind`, or a lint plugin rule, `hds/no-custom-tracking`, `hds/no-raw-controls`, `hds/no-raw-hex`, `hds/no-raw-px-spacing` or `hds/sx-token-first`, plus the `file`, the exact `match` text the harness prints, `why`, and `change`; a violation both report is printed, and bent, once), or a DESIGN.md rule the code bends that no scanner can see (`kind: "design-rule"`, plus `rule`, `why` and `change`). `change` is the token, component, pattern or rule change that would make the bend legal. A listed violation the code no longer has fails the gate, so keep the log true.
- Keyboard reachable end to end, focus visible, every control has an accessible name.
- Log a gap in `gaps.json` whenever you needed something HDS lacks, escaped the system or fought a rule. Each gap is `{ screen, direction, kind, needed, didInstead, proposal, evidence }` with `kind` one of `token`, `component`, `pattern`, `rule`, `bug`, and an optional `id`: reuse one from `gap-ids.json` when your gap is one of those, so the index can count it across screens.

## Gaps to confirm, not to build ahead

Predicted for this screen. Confirm each only if you actually hit it, with evidence, and reuse its id so the index can count it across screens. Compose what HDS lacks from what it ships and log the gap with what you did instead. Only direction C may reach outside the system, and only through its bend log.

- `stage-chain`: A stage chain or stepper that reads as a funnel, with counts.
- `label-value-lockup`: The label-value lockup (hirobius/hds#520).
- `supporting-accent`: A supporting accent token, the second half of the planned accent pair.

A stage chain or stepper is predicted (hirobius/hds#628). HDS has Progress and Tabs, but no read-only funnel with counts and no stepper.
