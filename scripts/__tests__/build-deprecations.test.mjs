/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#469: deprecations.json is generated, not hand-kept — these tests pin
 * the readings that build it (JSDoc classification, ledger removals) and
 * that the committed file matches its sources. (bumpOf/nextVersion are
 * pinned by scripts/__tests__/next-version.test.mjs, not re-tested here.)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDeprecations, deprecationsInFile, removedFromLedgers } from '../lib/deprecations.mjs';
import { renderDeprecations } from '../build-deprecations.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = '@hirobius/design-system';

describe('deprecationsInFile', () => {
  it('classifies an export, a prop and a union value', () => {
    const text = `
/**
 * @deprecated Use NewThing.
 * @removeIn 2.0.0
 * @useInstead NewThing
 */
export const OldThing = () => null;

export interface WidgetProps {
  /**
   * @deprecated Use \`tone\`.
   * @removeIn 2.0.0
   */
  strong?: boolean;
}

export type WidgetVariant =
  | 'solid'
  /**
   * @deprecated Use \`solid\`.
   * @removeIn 2.0.0
   */
  | 'flat';
`;
    const found = deprecationsInFile('src/app/components/widget.tsx', text);
    expect(found).toEqual([
      {
        kind: 'export',
        name: 'OldThing',
        removeIn: '2.0.0',
        notice: 'Use NewThing.',
        useInstead: 'NewThing',
        file: 'src/app/components/widget.tsx',
      },
      {
        kind: 'prop',
        name: 'strong',
        owner: 'WidgetProps',
        removeIn: '2.0.0',
        notice: 'Use `tone`.',
        file: 'src/app/components/widget.tsx',
      },
      {
        kind: 'propValue',
        name: 'flat',
        owner: 'WidgetVariant',
        removeIn: '2.0.0',
        notice: 'Use `solid`.',
        file: 'src/app/components/widget.tsx',
      },
    ]);
  });

  it('skips a file carrying a deprecation-ok exemption', () => {
    const text = '// deprecation-ok: probe\n/**\n * @deprecated Probe.\n */\nexport const X = 1;\n';
    expect(deprecationsInFile('src/x.ts', text)).toEqual([]);
  });
});

describe('removedFromLedgers', () => {
  it('takes removed and folded names from detect.imports, first release wins', () => {
    const ledgers = [
      {
        version: '0.21.0',
        steps: [
          {
            kind: 'removed',
            plain: 'Gone.',
            detect: { imports: [{ from: PKG, names: ['StatusDot'] }] },
          },
          { kind: 'look', plain: 'Shiny.', detect: { imports: [{ from: PKG, names: ['Kept'] }] } },
        ],
      },
      {
        version: '0.20.0',
        steps: [
          {
            kind: 'folded',
            plain: 'Folded.',
            detect: { imports: [{ from: PKG, names: ['StatusDot', 'Old'] }] },
          },
        ],
      },
    ];
    expect(removedFromLedgers(ledgers)).toEqual([
      { name: 'Old', from: PKG, removedIn: '0.20.0', note: 'Folded.' },
      { name: 'StatusDot', from: PKG, removedIn: '0.20.0', note: 'Folded.' },
    ]);
  });

  it('drops a removed name its entry exports again today', () => {
    const record = buildDeprecations({
      version: '0.32.0',
      api: [],
      tokens: [],
      removed: [
        { name: 'Back', from: PKG, removedIn: '0.20.0', note: 'Gone.' },
        { name: 'Gone', from: PKG, removedIn: '0.20.0', note: 'Gone.' },
      ],
      liveExports: new Set([`${PKG} Back`]),
    });
    expect(record.removed.map((r) => r.name)).toEqual(['Gone']);
  });
});

describe('the shipped deprecations.json', () => {
  it('matches what its sources generate (build-deprecations --check)', () => {
    expect(readFileSync(join(ROOT, 'deprecations.json'), 'utf8')).toBe(renderDeprecations(ROOT));
  });

  it('carries the removed name the lint-rule fixture flags: StatusDot, removed in 0.21.0', () => {
    const record = JSON.parse(readFileSync(join(ROOT, 'deprecations.json'), 'utf8'));
    expect(record.removed).toContainEqual(
      expect.objectContaining({ name: 'StatusDot', from: PKG, removedIn: '0.21.0' }),
    );
    expect(record.exports.map((e) => e.name)).toContain('Stat');
    expect(record.propValues.map((e) => `${e.owner}.${e.name}`)).toContain('TextVariant.heading1');
    expect(record.tokens.length).toBeGreaterThan(0);
  });
});
