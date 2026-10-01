// @vitest-environment node
/**
 * The release notes and leftovers of the 0.20.0 removals (hds#389 R1, hds#394
 * wave 4a), pinned after the R1b review.
 *
 * ADR numbers are unique, and each H1 carries its file's number. The
 * date-picker ADR is ADR-034: main took 033 for the zero-click agent sync
 * (docs/adr/033-zero-click-agent-sync.md, #425) after this branch forked, and
 * 030/031 are held by open branches. Two files named 033-*.md would merge
 * without a conflict, so the number is pinned here.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('ADR numbering', () => {
  it('every docs/adr file has a unique number and an H1 that carries it', () => {
    const files = readdirSync(resolve(ROOT, 'docs/adr')).filter((f) => /^\d{3}-.*\.md$/.test(f));
    const numbers = files.map((f) => f.slice(0, 3));
    expect(numbers.filter((n, i) => numbers.indexOf(n) !== i)).toEqual([]);
    const wrongH1 = files.filter(
      (f) => !read(`docs/adr/${f}`).startsWith(`# ADR-${f.slice(0, 3)}:`),
    );
    expect(wrongH1).toEqual([]);
  });

  it('the date-picker ADR is ADR-034, and every reference to it cites 034', () => {
    expect(existsSync(resolve(ROOT, 'docs/adr/033-remove-date-pickers.md'))).toBe(false);
    expect(read('docs/adr/034-remove-date-pickers.md')).toMatch(
      /^# ADR-034: Remove the Date Pickers/,
    );
    expect(read('docs/adr/020-date-time-component-library.md')).toMatch(
      /\*\*Status:\*\* Superseded by ADR-034 /,
    );

    const picker = /date pickers?|date-range picker|date-and-time picker|calendar picker/i;
    const cites = [
      'MIGRATIONS.md',
      '.changeset/dsr-56.md',
      'src/index.ts',
      'docs/adr/020-date-time-component-library.md',
    ].flatMap((file) =>
      read(file)
        .split('\n')
        .flatMap((line, i) =>
          picker.test(line)
            ? [...line.matchAll(/ADR-(\d{3})/g)]
                .map((m) => m[0])
                .filter((adr) => adr !== 'ADR-020')
                .map((adr) => `${file}:${i + 1}: ${adr}`)
            : [],
        ),
    );
    expect(cites.length).toBeGreaterThanOrEqual(8);
    expect(cites.filter((c) => !c.endsWith('ADR-034'))).toEqual([]);
  });
});
