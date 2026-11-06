/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/ledger-append.mjs (hds#1297): rows land only in the session
 * named by its heading, the day line is re-summed, and no ledger table repeats a
 * row number (the #1291 and #1293 failure).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rowNumbers,
  duplicateRowNumbers,
  appendRows,
  newSession,
  resumDay,
  run,
} from '../ledger-append.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Two sessions whose tables both have a row 11 with the same tool: the sed trap.
const FIX = `# Ledger

## 2026-11-06 · doc pages

| # | Tool | Kind | Target | Why | Result |
| - | ---- | ---- | ------ | --- | ------ |
| 11 | \`use_figma\` | read | kit | keys | OK. |
| 12 | \`use_figma\` | read | page | keys | OK. |

Session total: 12 calls.

## 2026-11-06 · session \`claude/parity\`

| # | Tool | Kind | Target | Why | Result |
| - | ---- | ---- | ------ | --- | ------ |
| 10 | \`get_screenshot\` | read | set | after | OK. |
| 11 | \`use_figma\` | read | set | count | OK. |

Session total: 11 calls.

Calls logged for 2026-11-06: 23 of 200 (12 and 11).
`;

const row12 = '| 12 | `use_figma` | read | bindings | snapshot | OK. |';

describe('ledger-append', () => {
  it('reads single and ranged row numbers', () => {
    expect(rowNumbers('| 7 | x |')).toEqual([7]);
    expect(rowNumbers('| 4–8 | x |')).toEqual([4, 5, 6, 7, 8]);
    expect(rowNumbers('| 9-11 | x |')).toEqual([9, 10, 11]);
    expect(rowNumbers('| # | x |')).toEqual([]);
    expect(rowNumbers('| --- | x |')).toEqual([]);
  });

  it('appends only to the session the heading names, and re-sums the day', () => {
    let t = appendRows(FIX, 'claude/parity', [row12], 'Session total: 12 calls.');
    t = resumDay(t, '2026-11-06');
    const [doc, parity] = t.split('## 2026-11-06 · session');
    expect(doc).not.toContain('bindings');
    expect(parity).toContain(`| 11 | \`use_figma\` | read | set | count | OK. |\n${row12}\n`);
    expect(parity).toContain('Session total: 12 calls.');
    expect(t).toContain('Calls logged for 2026-11-06: 24 of 200 (12 and 12).');
    expect(t.match(/Calls logged for/g)).toHaveLength(1);
    expect(duplicateRowNumbers(t)).toEqual([]);
  });

  it('refuses an ambiguous or unknown session and an out-of-order row', () => {
    expect(() => appendRows(FIX, '2026-11-06', [row12])).toThrow(/matches 2 headings/);
    expect(() => appendRows(FIX, 'nope', [row12])).toThrow(/matches 0 headings/);
    expect(() => appendRows(FIX, 'claude/parity', ['| 14 | x |'])).toThrow(/number 12/);
  });

  it('flags a table that repeats a row number (rows pasted into the wrong table)', () => {
    const bad = FIX.replace(
      '| 12 | `use_figma` | read | page | keys | OK. |',
      '| 12 | `use_figma` | read | page | keys | OK. |\n| 11 | `use_figma` | read | set | count | OK. |',
    );
    expect(duplicateRowNumbers(bad)).toEqual([
      { heading: '2026-11-06 · doc pages', numbers: [11] },
    ]);
    // A prose line starts a new table: a resumed session may number from 1 again.
    const resumed = FIX.replace(
      '| 12 | `use_figma` | read | page',
      'Resumed.\n| 11 | `use_figma` | read | page',
    );
    expect(duplicateRowNumbers(resumed)).toEqual([]);
  });

  it('--new-session adds a dated heading and an empty table after the day, then rows go in', () => {
    const heading = '2026-11-06 · session `claude/ops`';
    let t = newSession(FIX, heading);
    expect(t.indexOf(`## ${heading}`)).toBeGreaterThan(
      t.indexOf('## 2026-11-06 · session `claude/parity`'),
    );
    t = appendRows(
      t,
      'claude/ops',
      ['| 1 | `use_figma` | read | x | y | OK. |'],
      'Session total: 1 call.',
    );
    t = resumDay(t, '2026-11-06');
    expect(t).toContain(
      `## ${heading}\n\n| # | Tool | Kind | Target | Why | Result |\n| - | ---- | ---- | ------ | --- | ------ |\n| 1 |`,
    );
    expect(t).toContain('Calls logged for 2026-11-06: 24 of 200 (12, 11 and 1).');
    expect(t.trimEnd().endsWith('Calls logged for 2026-11-06: 24 of 200 (12, 11 and 1).')).toBe(
      true,
    );
    expect(() => newSession(t, heading)).toThrow(/already exists/);
    expect(() => newSession(FIX, 'session without a date')).toThrow(/start with a date/);
  });

  it('--new-session for a new day goes at the end of the ledger', () => {
    const t = newSession(FIX, '2026-11-07 · session x');
    expect(
      t
        .trimEnd()
        .endsWith(
          '## 2026-11-07 · session x\n\n| # | Tool | Kind | Target | Why | Result |\n| - | ---- | ---- | ------ | --- | ------ |',
        ),
    ).toBe(true);
  });

  it('the CLI writes the file and prints the day line', () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'ledger-')), 'L.md');
    writeFileSync(file, FIX);
    const out = [];
    run(['--session', 'claude/parity', '--row', row12, '--total', 'Session total: 12 calls.'], {
      file,
      log: (l) => out.push(l),
    });
    expect(out).toEqual(['Calls logged for 2026-11-06: 24 of 200 (12 and 12).']);
    expect(readFileSync(file, 'utf8')).toContain(row12);
    run(
      [
        '--new-session',
        '2026-11-06 · session z',
        '--row',
        '| 1 | x | read | t | w | OK. |',
        '--total',
        'Session total: 1 call.',
      ],
      { file, log: (l) => out.push(l) },
    );
    expect(out[1]).toBe('Calls logged for 2026-11-06: 25 of 200 (12, 12 and 1).');
  });

  it('the real ledger: no table repeats a row number, and each day line re-sums unchanged', () => {
    const text = readFileSync(path.join(REPO, 'figma/MCP-LEDGER.md'), 'utf8');
    expect(duplicateRowNumbers(text)).toEqual([]);
    const days = [...text.matchAll(/^Calls logged for (\S+):/gm)].map((m) => m[1]);
    expect(days.length).toBeGreaterThan(0);
    // Compared as numbers: older day lines join terms with a comma, not "and".
    const nums = (t, d) =>
      t
        .match(new RegExp(`^Calls logged for ${d}: (.*)$`, 'm'))[1]
        .match(/\d+/g)
        .map(Number);
    for (const d of days) expect(nums(resumDay(text, d), d), d).toEqual(nums(text, d));
  });
});
