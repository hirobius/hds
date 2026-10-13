# ADR-060: When a component token and the rendered component disagree, code wins

**Status:** Accepted, retroactive (decided 2026-10-11; recorded 2026-10-13 from commit and PR history). The one exception is Button sm icon size, where the token won.

## Context

`hirobius.tokens.json` defines `component.*` tokens, and components hard-code Tailwind
literals for the same properties. Nothing compared the two. hds#595 says this is how
hds#539 (Button sm icon 14px against a 12px token) and hds#559 happened.

hds#559 is the worse case. `component.button.primary.bgDisabled` resolved to
`surface.accentSubtle` and `textDisabled` to `content.onAccent`. Under the neutral
accent that was "near-white text on a near-white fill". It went unnoticed "because the
Button component dimmed disabled with `disabled:opacity-50` and never actually bound
these tokens." Figma binds to the tokens, so whenever code ignores them, Figma and
code disagree. hds#595 gives Card as an example: Figma used radius 8 and gap 8, while
code drew 12 and 16.

The audit in hds#595, of 79 component token leaves on one commit of origin/main:

- 15 bound (code reads the token).
- 30 literal that happens to match.
- 23 literal that disagrees (Button 15, Tag 2, Badge 2, Input 2, Card 2).
- 11 unused.

## Decision

hds#595 records it as Adrian's call, dated 2026-10-11: "**Code wins** on every
mismatch not already decided. The tokens are re-valued to what ships, and Figma picks
them up on the next delta sync." The exception is Button sm `iconSize` (hds#539),
"already decided as token wins (12px)".

- **A gate.** `check-component-token-binding` resolves each component's cva classes
  and the `static.css` mirrors and classifies every token leaf as BOUND,
  LITERAL-MATCH, LITERAL-MISMATCH or UNUSED. `--report` prints the table, `--enforce`
  fails on drift not in the committed baseline, and `binding-ok` markers allowlist a
  deliberate literal (`81ca0da`, PR #597). It started in report mode.
- **Re-value 16 tokens** to what the components render: Button sizes and secondary
  states, Card radius and gap, Input bg and paddingX, Tag unselected colours
  (`3085b8a`, PR #599). A test pins each re-valued token to its rendered value.
- **Bind the disabled tokens.** Button now binds neutral disabled tokens and its
  per-size icon variable (`b2ebd7d`, PR #596).
- Opacity and shadow washes and Badge's single-tone colours "stay as they are (design
  call)". Per-tone Badge tokens and state tokens were bound later (`75ff831`, PR #606).

## Alternatives considered

- Token wins on every mismatch. It applied only to Button sm icon size. For the rest
  the commits do not record why code was preferred, beyond the decision line above.
- Allowlist a deliberate mismatch instead of fixing it. This stayed as the
  `binding-ok` marker.

## Rationale

The recorded reason is that code is what ships and what consumers see. The tokens are
the layer that was wrong, so they move to match it. The ratchet baseline stops the
gap from growing while the rest is fixed.

## Consequences

- PR #599 says the baseline and pinned counts "drop from 20 to 4 LITERAL-MISMATCH".
  On the working tree today the report reads: "92 component
  token leaves: 36 BOUND, 43 LITERAL-MATCH, 0 LITERAL-MISMATCH, 13 UNUSED."
- The gate is still in `pretest` in report mode. The registry entry says `--enforce`
  fails on drift outside the baseline, and the commits read here do not show it wired.
- Re-valuing a token can break Figma sync. Moving Button `textDisabled` out of its
  per-mode override would have shifted a Figma variable between collections, and
  `delta.js` refused: "moves 1 variable(s) between collections". PR #604 kept the
  token in the themed collection with the same CSS value. `af782c3` (PR #615) also
  reverted a `textDisabled` Figma placement, and bound `InlineCode` to a new
  `component.inlineCode.bg` token, with the gate's pinned counts updated.
- Of hds#595's plan, the commits read here cover the Button fix, the gate and the
  re-value. Batches A to D, the Figma binding check and the move to enforcement are
  not confirmed done. hds#595 was still open on 2026-10-11.

## Lessons

- A token nothing reads is a claim nobody checks. Measure token-to-code agreement
  with a gate before trusting either side.
- Pick a default winner for disagreements and write it down. One line, "code wins",
  settled 16 re-values without a debate per token.
- Pin each corrected value with a test, so the token cannot drift back.
- Changing a token's collection or mode override can trip the Figma sync. Check
  `delta.js` before moving one.

## Evidence

- `b2ebd7d` fix(button): bind neutral disabled tokens and the sm icon token (PR #596; fixes hds#559, hds#539)
- `81ca0da` feat(guardrails): check-component-token-binding, report mode (PR #597)
- `3085b8a` fix(tokens): re-value 16 component tokens to what the components render (PR #599)
- `75ff831` fix(button,badge): bind hover, pressed, disabled-border and per-tone badge tokens (PR #606)
- `af782c3` fix(tokens): lighter dark-mode surfaces and states, inlineCode component token (PR #615)
- hds#595: Epic: every component reads its own tokens, in code and in Figma
- hds#559: component-button-primary-\*Disabled mis-valued under the neutral accent
- hds#604: keep button primary textDisabled in the themed Figma collection
