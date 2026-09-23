/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * brand-truth — what the brand accent IS, and which prose disagrees with it.
 *
 * #208 repointed the accent from blue to a neutral. For days afterwards
 * `check-brand` reported `✓ primary color #1e2efd — all docs in sync`, because
 * it read the brand from a hardcoded `primitive.color.blue.500` and then
 * validated the docs against that value. A gate that sources its expected
 * value from the wrong place cannot detect drift in it: it defines the thing
 * it is checking. Four separate call sites had the same hardcode, so every
 * consumer agreed with every other and all of them were wrong together.
 *
 * So the accent is read ONE way, here, and everything else imports it:
 * `semantic.accent.rest`, resolved through its aliases by `resolveAlias` from
 * build-tokens.mjs — the same function that resolves it for the shipped CSS.
 * If those two ever disagree the CSS is the thing that ships, so the gate must
 * follow the CSS, not a second implementation of the same idea.
 *
 * THE RULE IS A CLAIM CHECK, NOT A COLOUR BAN.
 * `primitive.color.blue.500` is still live: `semantic.color.feedback.info`
 * aliases it. Blue is no longer the brand, but it is not stale, and a gate
 * that flagged every `#1E2EFD` would fail correct documentation of the info
 * colour — then get suppressed, which is how gates die. A line is a violation
 * only when it ASSERTS a hex is the brand, primary or accent AND that hex is
 * not the resolved accent. A line that merely contains a hex asserts nothing.
 */

import { resolveAlias } from '../build-tokens.mjs';

/**
 * Words that turn a hex into a claim about the brand.
 *
 * Deliberately short and explicit. Every addition widens what the gate calls
 * a lie, so the list is reviewed rather than inferred from the docs.
 */
export const BRAND_CLAIM = /\b(brand|primary|accent)\b/i;

/**
 * Lines that describe the past rather than assert the present.
 *
 * A migration note naming the old colour is correct prose, and the gate must
 * not force it to be deleted to go green.
 */
const HISTORICAL = [
  /migrated from/i,
  /\bwas\b\s+#?[0-9a-f]{3,8}\b/i,
  /\bwas\b.*\bbefore\b/i,
  /\(was /i,
  /updated.*from/i,
  /previously/i,
  /instead of/i,
  /formerly/i,
  /no longer/i,
  /used to be/i,
];

/**
 * A named hue attached to the accent — a claim with no hex in it at all.
 *
 * This is how #246 lived in the FIRST SENTENCE of DESIGN.md: "a high-contrast
 * monochromatic palette and a single electric-blue accent". No hex, so a hex
 * check reads straight past it, while CLAUDE.md sends every agent to that
 * sentence before visual work. The accent resolves to a neutral, so any hue
 * word bound to the word "accent" is a live contradiction of the tokens.
 *
 * Bound to `accent` specifically, not anywhere in the line: the blue ramp is
 * still real, still aliased by semantic.color.feedback.info, and still
 * correctly documented in prose that mentions blue.
 */
const HUE_ACCENT =
  /\b(red|orange|amber|yellow|green|teal|cyan|blue|indigo|violet|purple|lilac|pink|magenta)\b[\s-]+accent\b/i;

/**
 * A hue that belongs to a TENANT, not to the brand.
 *
 * #208 did not make the accent neutral forever — it made it a per-tenant knob
 * whose default is neutral. `accent-lilac` is a shipped exemplar, so "Lilac
 * accent ramp step for the accent-lilac tenant exemplar" is correct prose.
 * Without this, the hue rule flagged the token generator's own descriptions.
 */
const TENANT_SCOPED = /\btenants?\b|\bexemplar\b|\baccent-[a-z]+\b|\bper-tenant\b/i;

/**
 * A markdown table row whose FIRST cell is a token path — a reference entry.
 *
 * The primitive reference table in DESIGN-HANDOFF.md documents each primitive
 * and says what uses it, so rows read "Stone 600 — light-mode rest accent".
 * The word `accent` is describing the token's ROLE, not asserting the brand.
 * Eleven such rows fired when this gate was first widened to that file, and
 * every one was noise.
 *
 * The test is the first cell specifically, not "mentions a token path
 * anywhere": DESIGN.md:16 cites `primitive.color.blue.500` inside a sentence
 * claiming it is the brand accent, and DESIGN-HANDOFF.md:17 is a table row
 * whose first cell is the label "Brand blue". Both are real claims and both
 * must keep firing.
 */
const REFERENCE_ROW = /^\s*\|\s*`?(primitive|semantic|component|role)\.[\w.]+`?\s*\|/;

/**
 * Every 6- or 8-digit hex in a line, lowercased.
 *
 * Three-digit hex is deliberately NOT matched. `#208` and `#246` are issue
 * references, this repo cites them constantly, and they are valid 3-digit hex
 * syntax — the first version of this rule flagged the comment explaining this
 * very fix. hirobius.tokens.json is 6- and 8-digit throughout and every doc
 * quotes it that way, so `#abc` support buys nothing and costs a false
 * positive on every issue reference in the codebase.
 */
const HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b/g;

/**
 * The brand accent, resolved.
 *
 * @param {object} raw  parsed hirobius.tokens.json
 * @returns {string}    a lowercased hex
 * @throws              when the token is missing — never a silent fallback.
 *                      `build-handoff.mjs:401` fell back to `#1E2FFF`, a typo
 *                      of the colour it stood in for, and emitted a value that
 *                      existed nowhere in the token file. A throw is louder
 *                      than a plausible wrong answer.
 */
export function brandAccent(raw) {
  const node = raw?.semantic?.accent?.rest;
  if (!node?.$value) {
    throw new Error(
      'brand-truth: cannot read semantic.accent.rest from the token file. The brand accent is ' +
        'defined there and nowhere else — do NOT fall back to a primitive path (that is #246).',
    );
  }
  const resolved = resolveAlias(node.$value, raw);
  if (typeof resolved !== 'string' || !resolved.startsWith('#')) {
    throw new Error(
      `brand-truth: semantic.accent.rest resolved to ${JSON.stringify(resolved)}, not a hex.`,
    );
  }
  return resolved.toLowerCase();
}

/**
 * Lines in `source` that claim a colour is the brand while naming a different one.
 *
 * @param {string} source   the document text
 * @param {string} file     path used in the report (not read from disk)
 * @param {string} accent   the resolved accent, lowercased
 * @returns {{file: string, line: number, found: string, expected: string, text: string}[]}
 */
export function violationsInSource(source, file, accent) {
  const expected = accent.toLowerCase();
  const violations = [];

  source.split('\n').forEach((text, i) => {
    if (!BRAND_CLAIM.test(text)) return;
    if (HISTORICAL.some((p) => p.test(text))) return;
    if (REFERENCE_ROW.test(text)) return;

    const hue = TENANT_SCOPED.test(text) ? null : HUE_ACCENT.exec(text);
    if (hue) {
      violations.push({
        file,
        line: i + 1,
        found: hue[1].toLowerCase(),
        expected,
        text: text.trim(),
      });
      return;
    }

    const hexes = (text.match(HEX) ?? []).map((h) => h.toLowerCase());
    if (hexes.length === 0) return;
    // A line naming the accent is describing it correctly, even if it also
    // lists others alongside (a ramp anchored at the accent, say).
    if (hexes.includes(expected)) return;

    for (const found of new Set(hexes)) {
      violations.push({ file, line: i + 1, found, expected, text: text.trim() });
    }
  });

  return violations;
}
