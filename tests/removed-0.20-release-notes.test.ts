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
 *
 * The changesets and MIGRATIONS.md cite one version for ops' pin, and
 * MIGRATIONS.md's `/patterns` section says which pattern modules survive and
 * uses no removed name as a live example.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const REMOVED = new Set(
  Object.values(
    JSON.parse(read('codemods/removed-0.20.json')).modules as Record<string, string[]>,
  ).flat(),
);

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

describe('release notes', () => {
  it('the changesets and MIGRATIONS.md cite one version for the range ops pins', () => {
    const files = [
      'MIGRATIONS.md',
      ...readdirSync(resolve(ROOT, '.changeset'))
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .map((f) => `.changeset/${f}`),
    ];
    const pins = files.flatMap((file) =>
      [...read(file).matchAll(/pins `\^(\d+\.\d+)(?:\.\d+)?`/g)].map((m) => `${file}: ^${m[1]}`),
    );
    expect(pins.length).toBeGreaterThanOrEqual(3);
    expect(new Set(pins.map((p) => p.split(': ')[1]))).toEqual(new Set(['^0.16']));
  });

  it("MIGRATIONS.md's /patterns section says which modules survive and uses no removed name as a live example", () => {
    const text = read('MIGRATIONS.md');
    const start = text.indexOf('## Pattern components move to `/patterns`');
    expect(start).toBeGreaterThan(-1);
    const section = text.slice(start, text.indexOf('\n## ', start + 1));

    expect(section).not.toContain('`/patterns` exports all of it');
    expect(section).toMatch(/AssetImg, CodeBlock, ErrorPattern, Form, Page\s+and Reveal/);

    const stale = section
      .split('\n')
      .flatMap((line) =>
        [...REMOVED]
          .filter(
            (name) =>
              new RegExp(`(?<![\\w$])${name}(?![\\w$])`).test(line) && !/removed/i.test(line),
          )
          .map((name) => `${name}: ${line.trim()}`),
      );
    expect(stale).toEqual([]);
  });
});
