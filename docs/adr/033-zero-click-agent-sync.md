# ADR-033: Zero-Click Agent Sync Through One Pinned use_figma Call

**Status:** Proposed (2026-10-01); amended 2026-10-07: `delta.js` targets the one library, not staging (see [Amendment (2026-10-07)](#amendment-2026-10-07-deltajs-targets-the-library)). Works inside ADR-026 (agents write to staging, never to the library, until its 2026-10-07 amendment made the staging copy the one library) and next to ADR-032 (the Sync plugin and its receipt). hds#418, child C3 of epic hds#397.

## Context

After ADR-032, a token change still needs one click from Adrian: **Sync** in staging. Adrian, 2026-10-01: _"Can you build it so that I don't have to go back and log into my computer and can just get updates on my phone?"_

Two live checks on staging, on 2026-10-01, decided whether an agent can do that click itself through the Figma MCP server's `use_figma` (hds#397 and hds#418 comments, `figma/MCP-LEDGER.md`):

- **The runtime runs there.** `hdsVerifyRuntime` passes, `figma.fileKey` is the staging key, and the fonts are present. `CompressionStream` is absent.
- **use_figma reads differently from a plugin.** A variable's `description` getter returns HTML-escaped text (`&quot; &#39; &lt; &gt; &amp;`), while a write stores the string as given; `figma.root.name` is `"Document"`. Six committed descriptions contain a quote, so a naive read never matches the committed snapshot.

The `code` input takes 50,000 characters, and the result should stay under about 20 KB. The push engine that a plan, an apply and a re-plan need is about 30,000 characters before any data. A full model is about 142,000.

## Decision

### 1. `pnpm figma:push --delta` writes `figma/push/use-figma/delta.js`, or refuses

It plans offline against the committed `figma/snapshot.json`. It refuses, naming the route, any plan Sync or a person must handle instead:

- a plan that moves a variable between collections, or that has conflicts: route it to Sync;
- `--prune`, or any variable, mode or style that staging holds and the model does not (an extra, such as a token deleted from `hirobius.tokens.json`): `delta.js` and Sync never delete, so a deliberate deletion or prune uses the promote plugin (`pnpm figma:push --prune`). Without this, `delta.js` would apply the rest and plain `check:figma-drift` would fail only after the write;
- a `delta.js` over 45,000 characters, or a plan that writes a text or effect style description holding `" ' < > &` (§3): route it to Sync;
- no committed snapshot: route it to Sync.

When staging already holds the model, it writes no `delta.js`.

### 2. The change travels as a model slice, and the plan is made in staging

`PLAN` carries:

- the collections, variables and styles the plan touches, as **patches** over the snapshot records they start from (a new record goes whole);
- every variable they alias, as id-only **anchors**;
- the pin (the committed checksum, `takenAt` and `file`), both file keys, and the renames the matches use;
- `planSum`, the checksum of the plan that slice gives against the snapshot;
- `held`, what staging must hold (`hdsAgentHeld`: variables, modes, and stamped text and effect styles), counted as the snapshot less the full plan's extras.

At build time the slice must equal the model, record for record, and must plan exactly the full plan's writes. Otherwise `--delta` refuses.

In staging, `hdsAgentRun` (`scripts/lib/figma-agent-runtime.mjs`) runs these steps in order:

1. **Refuse any file but staging.** The script's first statement is `if (figma.fileKey !== staging || figma.fileKey === library) throw`, with both keys baked in from `figma/links.json`. `hdsAgentRun` checks the keys again from `PLAN`.
2. **Check `PLAN` against `PLAN_CHECKSUM`,** and the runtime against `hdsVerifyRuntime`.
3. **The pin.** It reads staging with `hdsAgentReadState` (variable descriptions decoded, `file` set to the committed one) and sets `takenAt` to the committed value. The result must hash to the committed checksum. Otherwise it writes nothing.
4. **Nothing to delete.** Staging must hold exactly `held`. A slice cannot see an extra outside it, so this count is how staging re-checks the build's extras refusal: with that refusal skipped, a deleted token's `delta.js` refuses here and writes nothing.
5. **Plan in staging.** It builds the slice over the pinned state and plans it. It refuses a plan whose `removals.*` or any `modes.remove` is not empty, then requires the plan to hash to `planSum`, then refuses a style description holding `" ' < > &` (§3), then checks conflicts and fonts.
6. **Apply and verify.** It runs `hdsApply`. The re-plan must give 0, and only then does it write `lastPush` (the full model's hash). Then it writes the C2 receipt: `snapshotDelta(pinned, post)`, in raw pages of at most 15,000 characters, with the receipt writer of ADR-032 §6.
7. **Return the receipt.** It returns what `receipt.js` would read for page 0, plus the plan line, when the receipt fits one page. Otherwise it returns the head, and `receipt.js` collects the pages.

### 3. Decoding is a use_figma shim, and writes stay raw

`delta.js` writes the model's text as given and decodes every read: the pin, the re-plan and the receipt's post state. It decodes `&quot; &#39; &lt; &gt;` first and `&amp;` last, so typed entity text survives. The decoding lives only in `figma-agent-runtime.mjs`.

The Sync and promote plugins never carry it. Their files are byte-identical before and after this change, and the Sync `code.js` stays at 59,470 of its 60,000 B.

Only variable descriptions are decoded, because that is what was measured. Whether use_figma also escapes a text or effect style's description on read is not measured yet. Until it is, `--delta` refuses, and `delta.js` refuses again in staging before the apply, any plan that writes a style description holding `" ' < > &`, and routes it to Sync. Without that, the write would land, and a re-plan reading the description back escaped would fail only after it, leaving `lastPush` and the receipt unwritten.

The pin fails closed only when a committed style description already holds one of those characters. None does in `figma/snapshot.json` `242fe0c9` (2026-10-01). Once a live read settles it, either the decoding extends to style descriptions or the refusal goes.

### 4. The runtime is copied compacted

`delta.js` carries the functions `hdsAgentRun` reaches, about 44,300 characters as written, from four sources:

- the runtime;
- the snapshot delta codec;
- the receipt head and writer;
- `figma-agent-runtime.mjs`.

It copies them without indentation (about 5,500 characters), blank lines, or the line breaks Prettier adds to wrap an expression: after `(` `[` `{` `,` and before `)` `]` `}` `.` `?` `:` (about 700 more). That leaves about 38,000 characters. `pnpm figma:push --delta` throws unless the copy parses to the same syntax tree as the source, so a dropped space or line break can never change what the code does. `hdsVerifyRuntime` checks the text exactly as copied.

## Rationale

- **Smallest faithful data.** A patch slice of today's plan (10 descriptions, 4 creates) is 4,902 characters. For the earlier 10-description, 2-create plan the slice was 4,200, where the whole touched records would have been 9,000, and the plan plus a model for the re-plan about 15,000. Planning in staging also means the re-plan runs the same `hdsPlan` on the same slice.
- **Fail closed at every step.** Each refusal before the apply writes nothing, and each has a vm test on `scripts/__tests__/helpers/fake-figma.mjs` that asserts zero writes. Mutating any guard turns its test red: the pin, `PLAN_CHECKSUM`, the extras count, the removals assertion, `planSum`, the style-description refusal, the font preflight and the re-plan.
- **Measured, not estimated** (2026-10-01, main as of `5aa171f`, snapshot `242fe0c9`). Today's plan, `updated 10 · created 4 · deleted 0`, builds to 44,062 characters. On a file seeded from the committed snapshot it makes 40 writes and returns 4,640 characters inline. The 19-variable Primitives `space/*` rename builds to 42,827, makes 60 writes and returns 9,411.

## Consequences

- A small token change reaches staging and `figma/snapshot.json` with no step by Adrian. That takes one `use_figma` call, plus 1–2 `receipt.js` reads when the receipt needs more than one page, all logged in `figma/MCP-LEDGER.md`. Adrian gets one phone notification.
- 938 characters of headroom remain for today's plan. Each further created variable costs about 300 (234 to 407 measured), so 2–4 more fit. Larger changes go to Sync, and say so.
- Something else may write to staging after the committed snapshot: a Sync whose receipt nobody collected, or a hand edit. The pin then refuses until the snapshot is current again.
- Unmeasured: whether use_figma escapes a style description on read (§3). Until a live read settles it, a plan that writes a style description holding `" ' < > &` goes to Sync. The first live run settles whether the inline return stays under use_figma's output cap, at about 4.6 KB today.

## Amendment (2026-10-07): delta.js targets the library

ADR-026's amendment of 2026-10-07 made the staging copy, `2VgBbVpKiDnu0aftJEVyBQ`, the one
HDS library and dropped staging. Everywhere this ADR says staging, `delta.js` now works on
the library; every guard stays, in the same order.

- **The first statement** is now `if (figma.fileKey !== library || retired.indexOf(figma.fileKey) !== -1) throw`,
  with the library key and the retired keys (`figma/links.json` `retiredFiles`, the old
  library `c8MaVgwxOlxm4wr8wnH0Z4`) baked in. `PLAN.files` carries `{ library, retired }`,
  and `hdsAgentRun` checks them again. A missing library key still refuses the build.
- **It still never deletes.** `--prune`, and any variable, mode or style the library holds
  that the model does not, still refuse and route to the promote plugin
  (`pnpm figma:push --prune`), which only Adrian runs.
- **The pin is unchanged.** `figma/snapshot.json` was taken from this same file while it
  was staging, so its checksum still pins the library; its recorded file name is normalized
  like `takenAt`.
- **Size.** The longer messages and the retired keys add 46 characters to `delta.js`
  (measured on 2026-10-07 for the same plan before and after).
