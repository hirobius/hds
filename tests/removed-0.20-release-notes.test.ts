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
 *
 * fixtures/swiss-canon keeps no fixture that renders a removed component, and
 * .token-path-baseline.txt names no deleted file.
 *
 * Every assertion holds after `pnpm changeset:version` deletes the changesets
 * (the "Version Packages" PR runs this suite), and no test names a changeset
 * file (hds#394 R1b review).
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

/**
 * The .changeset/*.md files pending release. `pnpm changeset:version` deletes
 * them all (README.md stays), so a test lists the directory, never a name.
 */
const pendingChangesets = () =>
  readdirSync(resolve(ROOT, '.changeset'))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => `.changeset/${f}`);

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
      'src/index.ts',
      'docs/adr/020-date-time-component-library.md',
      ...pendingChangesets(),
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
    // MIGRATIONS.md, src/index.ts and ADR-020 alone; the changesets add theirs
    // until `changeset version` deletes them.
    expect(cites.length).toBeGreaterThanOrEqual(7);
    expect(cites.filter((c) => !c.endsWith('ADR-034'))).toEqual([]);
  });
});

describe('release notes', () => {
  it('the changesets and MIGRATIONS.md cite one version for the range ops pins', () => {
    const pins = ['MIGRATIONS.md', ...pendingChangesets()].flatMap((file) =>
      [...read(file).matchAll(/pins `\^(\d+\.\d+)(?:\.\d+)?`/g)].map((m) => `${file}: ^${m[1]}`),
    );
    // MIGRATIONS.md keeps its pin after `changeset version` deletes the changesets.
    expect(pins.length).toBeGreaterThanOrEqual(1);
    // One value, whichever it is: an ops pin bump updates the docs, not this test.
    expect(new Set(pins.map((p) => p.split(': ')[1])).size, pins.join('\n')).toBe(1);
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

describe('after `changeset version`', () => {
  // `pnpm changeset:version` deletes every .changeset/*.md except README.md, and
  // ci.yml runs `pnpm test` on the "Version Packages" PR it opens (release.yml,
  // RELEASE_PAT). A test that reads a changeset by name fails that PR with ENOENT;
  // list the directory instead (pendingChangesets above).
  it('no test file reads a .changeset/*.md by name', () => {
    const named = /['"`]\.changeset\/(?!README\.md)[\w.-]+\.md['"`]/;
    const testFiles = ['tests', 'scripts', 'src', 'codemods'].flatMap((dir) =>
      readdirSync(resolve(ROOT, dir), { recursive: true, encoding: 'utf8' })
        .filter((f) => /\.test\.(ts|tsx|mjs|js)$/.test(f))
        .map((f) => `${dir}/${f}`),
    );
    const offenders = testFiles.flatMap((file) =>
      read(file)
        .split('\n')
        .flatMap((line, i) => (named.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});

describe('leftovers of the removed components', () => {
  it('fixtures/swiss-canon has no fixture that renders a removed component', () => {
    const dir = resolve(ROOT, 'fixtures/swiss-canon');
    const offenders = readdirSync(dir)
      .filter((d) => existsSync(resolve(dir, d, 'input.jsx')))
      .flatMap((d) =>
        [...read(`fixtures/swiss-canon/${d}/input.jsx`).matchAll(/<([A-Z][\w.]*)/g)]
          .map((m) => m[1].split('.')[0])
          .filter((tag) => REMOVED.has(tag))
          .map((tag) => `${d}: ${tag}`),
      );
    expect(offenders).toEqual([]);
  });

  it('.token-path-baseline.txt names only files that exist', () => {
    const missing = read('.token-path-baseline.txt')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split(':')[0])
      .filter((file) => !existsSync(resolve(ROOT, file)));
    expect(missing).toEqual([]);
  });
});
