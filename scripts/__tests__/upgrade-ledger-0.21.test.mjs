/**
 * The 0.21.0 ledger (hds#448). 0.21.0 shipped (Version Packages #529) with an
 * upgrade note for each of its seven changesets but before the release
 * compiler (hds#451), so upgrade/releases/0.21.0.json is built by
 * scripts/upgrade/build-ledger.mjs from those notes, frozen in
 * upgrade/sources/0.21.0/notes, and the 0.20.0 and 0.21.0 snapshots.
 *
 * Expectations come from the CHANGELOG's 0.21.0 section, npm's publish time,
 * the published tarballs and the notes themselves, not from the generator.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSources } from '../upgrade/build-ledger.mjs';
import { diffSnapshots } from '../upgrade/diff.mjs';
import { stepIsBreaking, uncoveredFacts } from '../upgrade/ledger.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const VERSION = '0.21.0';
const read = (file) => JSON.parse(readFileSync(join(REPO, file), 'utf8'));
const ledger = read(`upgrade/releases/${VERSION}.json`);
const { release, notes } = readSources(VERSION);
const CHANGELOG = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8').split('\n');

/** The 0-based index in today's CHANGELOG of a line cited as the file read at 0.21.0. */
const liveIndex = (source) => CHANGELOG.indexOf(`## ${VERSION}`) + Number(source.split(':')[1]) - 3;

/** The changeset entries (`- <hash>: ...`) of the 0.21.0 section, by index. */
function sectionEntries() {
  const heading = CHANGELOG.indexOf(`## ${VERSION}`);
  const end = CHANGELOG.findIndex((line, i) => i > heading && line.startsWith('## '));
  const entries = [];
  for (let i = heading + 1; i < end; i++)
    if (/^- [0-9a-f]{7}: /.test(CHANGELOG[i])) entries.push(i);
  return entries;
}

describe('the 0.21.0 ledger', () => {
  it('is the minor npm published on 2026-10-07, written after it shipped', () => {
    // npm: "0.21.0": "2026-10-07T18:58:15.841Z".
    expect(ledger).toMatchObject({
      version: VERSION,
      date: '2026-10-07',
      bump: 'minor',
      backfilled: true,
    });
    expect(release.previous).toBe('0.20.0');
  });

  it('cites one frozen note for each of the seven changeset entries in its CHANGELOG section', () => {
    const entries = sectionEntries();
    expect(entries).toHaveLength(7);
    const cited = Object.values(release.notes).map((cite) => liveIndex(cite.source));
    expect([...cited].sort((a, b) => a - b)).toEqual(entries);
    expect(Object.keys(notes).sort()).toEqual([
      'agent-ready-after-arm',
      'bug-bash-522-component-defects',
      'dsr-38',
      'dsr-42',
      'fonts-opt-in',
      'remove-status-dot',
      'type-ramp-5-roles',
    ]);
    expect(CHANGELOG[liveIndex(release.notes['remove-status-dot'].source)]).toMatch(
      /^- 5d7c98c: \*\*`StatusDot` and `StatusDotProps` are removed/,
    );
  });

  it('carries every note step over field for field, citing its changeset entry', () => {
    let count = 0;
    for (const [name, note] of Object.entries(notes)) {
      for (const { id, ...fields } of note.steps ?? []) {
        count++;
        const step = ledger.steps.find((s) => s.id === `${VERSION}/${id}`);
        expect(step, `${name} ${id}`).toEqual({
          id: `${VERSION}/${id}`,
          ...fields,
          source: release.notes[name].source,
        });
      }
    }
    expect(ledger.steps).toHaveLength(count);
    expect(count).toBe(36);
  });

  it('marks no step backfilled: each was written before 0.21.0 shipped', () => {
    for (const step of ledger.steps) expect(step.backfilled, step.id).toBeUndefined();
  });

  it('accounts for the 0.20.0 to 0.21.0 diff: the StatusDot removals, and the additions its steps name', () => {
    const facts = diffSnapshots(
      read('docs/api/releases/0.20.0.json'),
      read(`docs/api/releases/${VERSION}.json`),
    );
    expect(facts.map((fact) => fact.id).sort()).toEqual([
      'added:./eslint-plugin:default',
      'added:.:TextVariant',
      'bin-added:hds-mcp',
      'exports-key-added:./eslint-plugin',
      'exports-key-added:./fonts.css',
      'removed:.:StatusDot',
      'removed:.:StatusDotProps',
    ]);
    expect(uncoveredFacts(facts, ledger.steps)).toEqual([]);
    const byFact = (id) => ledger.steps.filter((step) => step.facts?.includes(id)).map((s) => s.id);
    expect(byFact('removed:.:StatusDot')).toEqual([`${VERSION}/removed/StatusDot`]);
    expect(byFact('exports-key-added:./fonts.css')).toEqual([`${VERSION}/manual/fonts-css`]);
    expect(byFact('exports-key-added:./eslint-plugin')).toEqual([
      `${VERSION}/exports/./eslint-plugin`,
    ]);
  });

  it('is breaking, so a minor below 1.0: StatusDot and an eyebrow CSS variable are removed', () => {
    expect(ledger.steps.filter(stepIsBreaking).map((step) => step.id)).toEqual(
      expect.arrayContaining([
        `${VERSION}/removed/StatusDot`,
        `${VERSION}/removed/--semantic-typography-eyebrow-text-transform`,
        `${VERSION}/behavior/eslint-no-raw-controls`,
      ]),
    );
  });

  it('leaves no upgrade note of a consumed 0.21.0 changeset pending', () => {
    for (const name of Object.keys(notes)) {
      expect(existsSync(join(REPO, `upgrade/pending/${name}.json`)), name).toBe(false);
      expect(existsSync(join(REPO, `.changeset/${name}.md`)), name).toBe(false);
    }
  });
});
