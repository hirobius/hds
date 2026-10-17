# Exploration brief: Pitch, the partner's phone view

Screen 4 of 6 in the design explorations (hirobius/hds#628). Feature: hirobius/ops#482, hirobius/ops#489, hirobius/ops#488. A partner works leads with Adrian from their phone, one-handed, between other things. The pitch page is their whole app: a Today list, a lead card, a one-tap call outcome, a follow-up pick and the lead's history.

Read `README.md` in your workspace for how a run is laid out and gated. Everything else you need to build is below.

## The job

- A Today list: follow-ups due first (oldest first), then fresh leads by score, so the partner always knows who to call next.
- The lead card puts the phone number first as a big tap target and the preview site one tap away, because that is the pitch. It shows the business, town, trade, score, stage and call attempts.
- After a call, log the outcome in one tap: no answer, voicemail, gatekeeper, callback, interested, not interested, wrong number, meeting booked. No answer, voicemail and callback suggest a follow-up.
- Set a follow-up in one tap: Tomorrow, 3 days, Next week, Pick date.
- Read the lead's history, newest first, as who, what and when ("Sam, called, voicemail, 2h ago"). Notes are signed automatically.
- Claim an unassigned lead so two people never call the same business. A "Mine" filter shows a person's own book.
- It works one-handed on a phone. A partner sees nothing but this page.

## The screen

- A header with the partner's name, the summary counts and the All / Mine filter.
- The Today list: each lead shows business, town and trade, score, stage, the follow-up label ("due today", "overdue 1d", "fresh") and the call-attempt count.
- The selected lead (`selectedLeadId`) as an open card: tel link, preview link, the Google-listing gap line when there is one, the eight outcome choices, the four follow-up picks, notes, and a collapsible history timeline.
- The phone view leads: design 390 wide first, with thumb-reachable actions. At 1280 show the same app, not a different one; a centred column or a two-pane layout are both fair.

## Fixture data

Invented data, in `fixture.json` next to this brief: fictional businesses, people and towns, 555-01xx phone numbers, example.com addresses. It passes the PII check, and so must anything you add to it, though you should not need to. Use it as it is; do not rename its fields.

```ts
type Outcome =
  | 'no-answer'
  | 'voicemail'
  | 'gatekeeper'
  | 'callback'
  | 'interested'
  | 'not-interested'
  | 'wrong-number'
  | 'meeting-booked';
type Lead = {
  id: string;
  business: string;
  contact: string | null;
  phone: string; // 555-01xx
  city: string;
  region: string;
  trade: string;
  score: number;
  stage: 'queued' | 'sent' | 'replied';
  callAttempts: number;
  lastCallAgo: string | null;
  nextActionAt: string | null;
  followUp: string; // 'due today', 'overdue 1d', 'fresh'
  assignedTo: string | null;
  previewUrl: string;
  gbpGap: { line: string } | null; // the lead's strongest Google listing gap, an opening line
  notes: { author: string; ago: string; body: string }[];
  events: {
    actor: string;
    kind: 'call' | 'note' | 'stage' | 'assign' | 'follow_up';
    summary: string;
    ago: string;
    at: string;
  }[];
};
type Pitch = {
  me: { name: string; role: string };
  filter: 'all' | 'mine';
  summary: { total: number; toPitch: number; inPlay: number; dueToday: number; won: number };
  outcomes: { id: Outcome; label: string }[];
  followUps: { id: string; label: string }[];
  selectedLeadId: string | null;
  today: Lead[]; // already in Today order
  actionError?: string;
  actionLeadId?: string;
  setupError?: string;
  emptyReason?: string;
};
// states.{empty,error,longContent,tokenFailure} are Pitch; states.loading is { note }.
```

## Required states

Render the populated screen first. Below it, a region headed `States` holds one labelled region per state, in this order: `State: empty`, `State: loading`, `State: error`, `State: long content`, `State: token failure`. Each uses the same components as the main screen, at the same width, so the board shows all five without any clicking. The data for each is under `states` in the fixture; a state with only a `note` has no data.

- `State: empty`: Nothing due and no fresh leads. Say so in a sentence that tells the partner what happens next.
- `State: loading`: The Today list as placeholder rows; the header is known.
- `State: error`: Logging a call failed on a dropped network. The message says nothing was lost and that tapping the outcome again retries.
- `State: long content`: A 110-character business name, six long notes, a 14-event history.
- `State: token failure`: The queue is unavailable: one line naming `SUPABASE_SERVICE_ROLE_KEY` and the fix, written for a partner who must pass it to the owner.

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
- Direction C may break those rules and the rules in DESIGN.md. Each bend goes in `bend-log.json`: either a violation the harness reports (`kind` is a scan kind, `hex`, `colour-fn`, `px`, `raw-control`, `custom-css` or `tailwind`, or a lint plugin rule, `hds/no-primitive-spacing`, `hds/no-raw-controls`, `hds/no-raw-hex`, `hds/no-raw-px-spacing`, `hds/no-status-clutter` or `hds/sx-token-first`, plus the `file`, the exact `match` text the harness prints, `why`, and `change`; a violation both report is printed, and bent, once), or a DESIGN.md rule the code bends that no scanner can see (`kind: "design-rule"`, plus `rule`, `why` and `change`). `change` is the token, component, pattern or rule change that would make the bend legal. A listed violation the code no longer has fails the gate, so keep the log true.
- Keyboard reachable end to end, focus visible, every control has an accessible name.
- Log a gap in `gaps.json` whenever you needed something HDS lacks, escaped the system or fought a rule. Each gap is `{ screen, direction, kind, needed, didInstead, proposal, evidence }` with `kind` one of `token`, `component`, `pattern`, `rule`, `bug`, and an optional `id`: reuse one from `gap-ids.json` when your gap is one of those, so the index can count it across screens.

## Gaps to confirm, not to build ahead

Predicted for this screen. Confirm each only if you actually hit it, with evidence, and reuse its id so the index can count it across screens. Compose what HDS lacks from what it ships and log the gap with what you did instead. Only direction C may reach outside the system, and only through its bend log.

- `phone-action-bar`: A phone action bar or bottom sheet for thumb-reachable actions.
- `activity-timeline`: An activity timeline: who did what, when, newest first.
- `supporting-accent`: A supporting accent token, the second half of the planned accent pair.

A phone action bar or bottom sheet and an activity timeline are both predicted (hirobius/hds#628). HDS has Dialog and Menu, but neither pattern.
