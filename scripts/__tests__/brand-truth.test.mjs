/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the brand-accent rule (scripts/lib/brand-truth.mjs).
 *
 * WHY THIS EXISTS (#246)
 * ──────────────────────
 * #208 repointed the brand accent from blue to a neutral. `check-brand` kept
 * reporting `✓ primary color #1e2efd — all docs in sync` for days afterwards,
 * because it read the brand from a hardcoded `primitive.color.blue.500` and
 * then validated the docs against that. A gate that sources its expected value
 * from the wrong place cannot detect drift in it — it defines the thing it is
 * checking.
 *
 * So the first rule here is about WHERE the value comes from, not what it is:
 * the accent is whatever `semantic.accent.rest` resolves to, followed through
 * aliases, exactly as the shipped CSS resolves it.
 *
 * THE HARD PART IS NOT BANNING BLUE.
 * `primitive.color.blue.500` is still live — `semantic.color.feedback.info`
 * aliases it. Blue is no longer the brand, but it is not thereby stale, and a
 * gate that flags every #1E2EFD would fail on correct documentation of the
 * info colour. The rule therefore flags a CLAIM: a line asserting some hex is
 * the brand / primary / accent while naming a hex that is not the resolved
 * accent. A line that merely contains a hex asserts nothing.
 */

import { describe, it, expect } from 'vitest';

import { brandAccent, violationsInSource, BRAND_CLAIM } from '../lib/brand-truth.mjs';

/** A token file shaped like ours: the accent aliases a neutral, info aliases blue. */
const TOKENS = {
  primitive: {
    color: {
      blue: { 500: { $value: '#1E2EFD' }, 600: { $value: '#1726CA' } },
      neutral: { 900: { $value: '#111111' }, 800: { $value: '#262626' } },
    },
    typography: { family: { primary: { $value: ['Satoshi', 'sans-serif'] } } },
  },
  semantic: {
    accent: { rest: { $value: '{primitive.color.neutral.900}' } },
    color: { feedback: { info: { $value: '{primitive.color.blue.500}' } } },
  },
};

const ACCENT = '#111111';
const names = (src) => violationsInSource(src, 'DESIGN.md', ACCENT).map((v) => v.found);

describe('brandAccent — where the value comes from', () => {
  it('resolves the accent through semantic.accent.rest, following the alias', () => {
    expect(brandAccent(TOKENS)).toBe('#111111');
  });

  it('does NOT return the blue primitive, which is what the old gate read', () => {
    // The whole defect in one assertion. If this ever goes back to #1E2EFD the
    // gate is once again validating the docs against the wrong source.
    expect(brandAccent(TOKENS)).not.toBe('#1E2EFD');
  });

  it('follows a chain of aliases, not just one hop', () => {
    const chained = structuredClone(TOKENS);
    chained.semantic.accent.rest.$value = '{semantic.accent.base}';
    chained.semantic.accent.base = { $value: '{primitive.color.neutral.800}' };
    expect(brandAccent(chained)).toBe('#262626');
  });

  it('throws rather than guessing when the accent token is missing', () => {
    // A silent fallback is how build-handoff.mjs:401 ended up emitting
    // #1E2FFF — a typo of a colour that exists nowhere in the token file.
    const broken = structuredClone(TOKENS);
    delete broken.semantic.accent;
    expect(() => brandAccent(broken)).toThrow(/semantic\.accent\.rest/);
  });
});

describe('violationsInSource — what the rule catches', () => {
  it('flags a line claiming the old blue is the brand accent', () => {
    expect(names('- **Primary** (`#1E2EFD`): the single brand accent.')).toEqual(['#1e2efd']);
  });

  it('flags a table row asserting a brand colour', () => {
    expect(names('| Brand blue | #1E2EFD | the accent |')).toEqual(['#1e2efd']);
  });

  it('flags a wrong hex that is not blue at all', () => {
    // Proves the rule compares against the resolved accent rather than
    // hunting for blues — the old gate could only ever find blues.
    expect(names('The brand accent is #FF00AA.')).toEqual(['#ff00aa']);
  });

  it('reports the file, line and both values so the fix needs no search', () => {
    const [v] = violationsInSource('a\n**One accent color:** #1E2EFD only', 'DESIGN.md', ACCENT);
    expect(v).toMatchObject({ file: 'DESIGN.md', line: 2, found: '#1e2efd', expected: ACCENT });
  });
});

describe('violationsInSource — what the rule deliberately leaves alone', () => {
  it('passes a line naming the correct accent', () => {
    expect(names('- **Primary** (`#111111`): the single brand accent.')).toEqual([]);
  });

  it('does NOT flag the blue ramp documented as the info colour', () => {
    // semantic.color.feedback.info still aliases primitive.color.blue.500.
    // Blue is not the brand; it is also not stale.
    expect(names('| Info | #1E2EFD | feedback.info |')).toEqual([]);
    expect(names('Info and in-progress states use #1E2EFD.')).toEqual([]);
  });

  it('does NOT flag a bare primitive ramp listing', () => {
    expect(names('blue: 50 #EEF0FF, 500 #1E2EFD, 600 #1726CA')).toEqual([]);
  });

  it('does NOT flag a historical record', () => {
    expect(names('Migrated from #1E2EFD to the neutral accent (#208).')).toEqual([]);
    expect(names('The brand accent was #1E2EFD before #208.')).toEqual([]);
  });

  it('does NOT flag a line with a brand word but no hex', () => {
    expect(names('The brand accent is a per-tenant knob.')).toEqual([]);
  });

  it('is case-insensitive about the hex, since docs mix both', () => {
    expect(names('The brand accent is #111111.')).toEqual([]);
    expect(names('The brand accent is #111111'.toLowerCase())).toEqual([]);
  });
});

describe('violationsInSource — a reference table documents tokens, it does not claim a brand', () => {
  // Found by running the widened gate on the real DESIGN-HANDOFF.md: 3 true
  // violations and 11 of these. Every one is a row of the primitive reference
  // table whose DESCRIPTION happens to contain "accent", because these
  // primitives are what tenant accent roles alias. The row is about the token
  // in its first cell; it asserts nothing about the brand.
  it('does not flag a table row whose first cell is a token path', () => {
    expect(
      names('| `primitive.color.lilac.500` | `#6f3fd4` | Lilac accent rest — AA for white text. |'),
    ).toEqual([]);
  });

  it('does not flag the warm stone ramp documented as tenant accent steps', () => {
    const table = [
      '| `primitive.color.stone.600` | `#8B6F47` | Stone 600 — light-mode rest accent and CTA surface. |',
      '| `primitive.color.stone.700` | `#75593A` | Stone 700 — light-mode hover accent. |',
      '| `primitive.color.projectBrand.microsoftGameDev.500` | `#6d31fb` | Primary accent tone. |',
    ].join('\n');
    expect(names(table)).toEqual([]);
  });

  it('STILL flags a table row whose first cell is prose, not a token path', () => {
    // The guard that keeps the exemption honest. DESIGN-HANDOFF.md:17 is a
    // table row too — but its first cell is the label "Brand blue", so the row
    // is asserting what the brand is, not documenting a token.
    expect(names('| Brand blue | `#1E2EFD` (`primitive.color.blue.500`) |')).toEqual(['#1e2efd']);
  });

  it('STILL flags prose that names a token path alongside the claim', () => {
    // DESIGN.md:16 cites `primitive.color.blue.500` inside a sentence claiming
    // it is the brand accent. Citing a path is not the same as being a row
    // about that path.
    expect(
      names(
        '- **Primary** (`#1E2EFD`): the single brand accent. `primitive.color.blue.500` / `semantic.accent.rest`.',
      ),
    ).toEqual(['#1e2efd']);
  });
});

describe('violationsInSource — an issue reference is not a colour', () => {
  // Caught by the gate firing on this repo's own source: `#208` and `#246` are
  // issue numbers, and this codebase cites them constantly — including inside
  // the comments explaining this very fix. They are valid 3-digit hex syntax,
  // which is why the first version of the rule read them as colours.
  //
  // Three-digit hex is simply dropped. hirobius.tokens.json is 6- and 8-digit
  // throughout and every doc quotes it that way, so supporting #abc buys
  // nothing and costs a false positive on every issue reference in the repo.
  it('does not read an issue reference as a brand colour', () => {
    expect(names('The brand accent became a neutral in #208.')).toEqual([]);
    expect(names('// #246: the accent is resolved, not hardcoded')).toEqual([]);
  });

  it('does not read a 3-digit hex as a colour at all', () => {
    expect(names('The brand accent is #abc.')).toEqual([]);
  });

  it('STILL reads a 6-digit hex, which is what the tokens actually use', () => {
    expect(names('The brand accent is #1E2EFD.')).toEqual(['#1e2efd']);
  });

  it('STILL reads an 8-digit hex with alpha', () => {
    expect(names('The brand accent is #1E2EFDFF.')).toEqual(['#1e2efdff']);
  });
});

describe('violationsInSource — prose can name a hue without ever writing a hex', () => {
  // This is how #246 survived in the FIRST SENTENCE of the brand spec. A hex
  // check alone never reads "a single electric-blue accent", and CLAUDE.md
  // sends every agent to that sentence before visual work. The accent is
  // #111111, a neutral, so any hue word attached to "accent" is a live lie.
  it('flags a hue word attached to the accent', () => {
    const v = violationsInSource(
      '…palette and a single electric-blue accent.',
      'DESIGN.md',
      ACCENT,
    );
    expect(v).toHaveLength(1);
    expect(v[0].found).toBe('blue');
  });

  it('flags it with or without the hyphen', () => {
    expect(names('Hirobius uses one electric blue accent.')).toEqual(['blue']);
    expect(names('Hirobius uses one electric-blue accent.')).toEqual(['blue']);
  });

  it('flags a hue other than blue, so the rule is not blue-specific', () => {
    expect(names('a single violet accent')).toEqual(['violet']);
  });

  it('does NOT flag a neutral accent, which is what the accent now is', () => {
    expect(names('a high-contrast monochromatic palette with a neutral accent')).toEqual([]);
  });

  it('does NOT flag a hue word that is not attached to the accent', () => {
    // The blue ramp is still real and still documented.
    expect(names('The blue ramp remains for feedback.info; the accent is neutral.')).toEqual([]);
  });

  it('does NOT flag a historical note about the old hue', () => {
    expect(names('Previously a single electric-blue accent; now neutral (#208).')).toEqual([]);
  });
});

describe('violationsInSource — a tenant accent is a hue on purpose', () => {
  // #208 did not make the accent neutral-forever; it made it A PER-TENANT KNOB
  // whose default is neutral. `accent-lilac` is a shipped tenant exemplar, so
  // "Lilac accent ramp step for the accent-lilac tenant exemplar" is correct
  // and must not be flagged — caught when the hue rule first ran on the repo.
  it('does not flag a hue bound to a named tenant', () => {
    expect(names('Lilac accent ramp step for the accent-lilac tenant exemplar.')).toEqual([]);
  });

  it('does not flag a per-tenant statement about accents in general', () => {
    expect(names('Each tenant supplies its own accent hue; the default is neutral.')).toEqual([]);
  });

  it('STILL flags an unqualified hue claim about THE accent', () => {
    // The guard. Without a tenant in scope, "one electric blue accent" is a
    // claim about the brand and stays a violation.
    expect(names('Hirobius uses one electric blue accent.')).toEqual(['blue']);
  });
});

describe('BRAND_CLAIM — the vocabulary is explicit, not inferred', () => {
  it('treats brand, primary and accent as claim words', () => {
    for (const word of ['brand', 'primary', 'accent']) {
      expect(BRAND_CLAIM.test(`the ${word} is #1E2EFD`)).toBe(true);
    }
  });

  it('does not treat an unrelated sentence as a claim', () => {
    expect(BRAND_CLAIM.test('the info colour is #1E2EFD')).toBe(false);
  });
});
