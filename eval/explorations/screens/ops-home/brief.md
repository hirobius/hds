# Exploration brief: Ops home: capture box and recent drops

Screen 2 of 6 in the design explorations (hirobius/hds#628). Feature: hirobius/ops#591, hirobius/ops#593. Adrian wants one place to throw a thought, photo or file the moment it occurs, without deciding where it goes. The `/ops` home gets a capture box with recent drops under it, each with one-tap routes. HDS Staging already has "Drop / ops" Home frames; go beyond them.

Read `README.md` in your workspace for how a run is laid out and gated. Everything else you need to build is below.

## The job

- Type a note and/or attach photos and files (drag, tap, phone camera), then Save. Text only, files only or both. It works with no AI.
- No category or routing at capture time: save now, sort later.
- Recent drops are listed under the box so Adrian sees they landed.
- Each drop has one-tap routes: GitHub issue (pick a repo), Idea, Client note, Discard.
- A "Suggest routes" button asks an agent for a route and a one-line reason per unsorted drop. Nothing routes until Adrian confirms. The button is disabled while a run is pending.
- A failed upload keeps the note and says what to do. A missing setup step is one actionable line, so the box never looks broken.
- The existing home tiles stay.
- Desktop: capture on the left, "sort when you're ready" on the right. Phone: stacked, and capture must work one-handed.

## The screen

- A page header, the four home tiles, then the capture box and the recent drops.
- Capture box: a multi-line note, an attach control (drop target on desktop, tap and camera on phone) with the attached files listed with name, size and per-file progress, and Save.
- Recent drops: text (first lines), attachment chips, age, a suggestion with its reason when there is one, and the four routes. "See all" with the count in `moreDrops`.
- The Suggest routes button with its pending and unavailable states.

## Fixture data

Invented data, in `fixture.json` next to this brief: fictional businesses, people and towns, 555-01xx phone numbers, example.com addresses. It passes the PII check, and so must anything you add to it, though you should not need to. Use it as it is; do not rename its fields.

```ts
type Attachment = { name: string; kind: 'image' | 'file'; sizeKb: number };
type Route = { kind: 'github-issue' | 'idea' | 'client-note' | 'discard'; target: string | null };
type Drop = {
  id: string;
  text: string;
  attachments: Attachment[];
  status: 'new' | 'sorted' | 'done' | 'discarded';
  route: Route | null;
  suggestion: {
    route: Route['kind'];
    target: string | null;
    reason: string;
    source: string;
  } | null;
  ageLabel: string;
  createdAt: string;
};
type Home = {
  tiles: { label: string; value: string; hint: string; href: string }[];
  repos: string[]; // the "pick a repo" choices for the GitHub issue route
  routes: Route['kind'][];
  moreDrops: number; // drops beyond the recent list, for "See all"
  suggest: {
    state: 'idle' | 'pending' | 'ready' | 'unavailable';
    unsorted: number;
    error?: string;
  };
  capture: {
    state: 'idle' | 'uploading' | 'failed' | 'saved';
    draft: string;
    error: string | null;
    files: {
      name: string;
      sizeKb: number;
      progress: number;
      status: 'queued' | 'uploading' | 'failed' | 'done';
    }[];
  };
  drops: Drop[];
};
// states.{empty,error,longContent,tokenFailure} are Home; states.loading is { note }.
```

## Required states

Render the populated screen first. Below it, a region headed `States` holds one labelled region per state, in this order: `State: empty`, `State: loading`, `State: error`, `State: long content`, `State: token failure`. Each uses the same components as the main screen, at the same width, so the board shows all five without any clicking. The data for each is under `states` in the fixture; a state with only a `note` has no data.

- `State: empty`: No drops yet. The capture box and the tiles are all there is; the list says what to do first.
- `State: loading`: The capture box works with no data. Recent drops show a placeholder.
- `State: error`: An upload failed. The note and the other file are kept, the failed file is marked, and the message says what to do.
- `State: long content`: A note of several paragraphs, eight attachments with 90-character names, a repo name that does not fit its menu.
- `State: token failure`: Suggest routes is unavailable: one line naming `DROPS_ROUTINE_ID` and `DROPS_ROUTINE_TOKEN` and where to set them. Capture and manual routes still work.

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
- Direction C may break those rules and the rules in DESIGN.md. Each bend goes in `bend-log.json`: either a violation the harness reports (`kind` is a scan kind, `hex`, `colour-fn`, `px`, `raw-control`, `custom-css` or `tailwind`, or a lint plugin rule, `hds/max-two-meta-items`, `hds/no-raw-controls`, `hds/no-raw-hex`, `hds/no-raw-px-spacing`, `hds/no-status-clutter` or `hds/sx-token-first`, plus the `file`, the exact `match` text the harness prints, `why`, and `change`; a violation both report is printed, and bent, once), or a DESIGN.md rule the code bends that no scanner can see (`kind: "design-rule"`, plus `rule`, `why` and `change`). `change` is the token, component, pattern or rule change that would make the bend legal. A listed violation the code no longer has fails the gate, so keep the log true.
- Keyboard reachable end to end, focus visible, every control has an accessible name.
- Log a gap in `gaps.json` whenever you needed something HDS lacks, escaped the system or fought a rule. Each gap is `{ screen, direction, kind, needed, didInstead, proposal, evidence }` with `kind` one of `token`, `component`, `pattern`, `rule`, `bug`, and an optional `id`: reuse one from `gap-ids.json` when your gap is one of those, so the index can count it across screens.

## Gaps to confirm, not to build ahead

Predicted for this screen. Confirm each only if you actually hit it, with evidence, and reuse its id so the index can count it across screens. Compose what HDS lacks from what it ships and log the gap with what you did instead. Only direction C may reach outside the system, and only through its bend log.

- `file-drop-control`: A file drop or upload control with per-file progress and retry.
- `label-value-lockup`: The label-value lockup (hirobius/hds#520).
- `supporting-accent`: A supporting accent token, the second half of the planned accent pair.

A file drop or upload control is predicted (hirobius/hds#628). HDS has Progress and Button, but no file input, drop target or retry pattern.
