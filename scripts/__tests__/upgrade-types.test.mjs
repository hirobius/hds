/**
 * The types baseline (hds#467): each export of each package.json#exports
 * entry read with the TypeScript checker (value or type, signatures, static
 * members, object key paths), and the upgrade facts the gate draws from it.
 * The release snapshot only had export names, so each change below passed
 * the gate with 0 findings.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import { diffSnapshots } from '../upgrade/diff.mjs';
import { factImpact } from '../upgrade/ledger.mjs';
import { writeNote } from '../upgrade/note.mjs';
import { buildTypes, writeTypesBaseline } from '../upgrade/types.mjs';
import { snapshotFromSource } from '../upgrade/snapshot.mjs';
import {
  RELEASED_TYPES_SOURCE,
  changeset,
  cleanUpRepos,
  readNote,
  releasedRepo,
  typesRepo,
  write,
} from './helpers/upgrade-repo.mjs';

afterEach(cleanUpRepos);

const rules = (result) => result.violations.map((v) => v.rule).sort();
const factIds = (result) => result.violations.map((v) => v.fact).filter(Boolean);

/** Changes the typesRepo() tree and regenerates its baseline, as `pnpm api:update` does. */
function change(root, rel, text) {
  write(root, rel, text);
  writeTypesBaseline(root);
}

const released = (root) =>
  JSON.parse(readFileSync(join(root, 'docs/api/releases/0.20.0.json'), 'utf8'));

describe('buildTypes', () => {
  it('records kind, signatures, the tree’s own static members and object key paths', () => {
    const root = typesRepo();
    const types = buildTypes(root)['.'];
    expect(types.Menu).toEqual({
      kind: 'value',
      signatures: ['(): null'],
      members: ['Group', 'Item'],
    });
    expect(types.useCount).toEqual({ kind: 'value', signatures: ['(start: number): number'] });
    expect(types.hds.keys).toEqual([
      'color',
      'color.content',
      'color.content.primary',
      'color.content.secondary',
      'space',
      'space.sm',
    ]);
  });

  it('records an interface, and a value exported with export type, as a type', () => {
    const root = typesRepo();
    write(root, 'src/callout.tsx', 'export interface CalloutProps { tone?: string }\n');
    write(
      root,
      'src/index.ts',
      "export * from './callout';\nexport type { Menu } from './menu';\n",
    );
    const types = buildTypes(root)['.'];
    expect(types.CalloutProps).toEqual({ kind: 'type' });
    expect(types.Menu).toEqual({ kind: 'type' });
  });

  it('is the snapshot’s types section', () => {
    const root = typesRepo();
    expect(snapshotFromSource(root).types).toEqual(buildTypes(root));
  });
});

describe('type facts in the upgrade gate', () => {
  it('fails removing a compound part (Menu.Item)', () => {
    const root = typesRepo();
    change(
      root,
      'src/menu.tsx',
      RELEASED_TYPES_SOURCE['src/menu.tsx'].replace('Item: MenuItem, ', ''),
    );
    const result = checkUpgradeLedger(root);
    expect(factIds(result)).toEqual(['member-removed:.:Menu.Item']);
    expect(result.violations[0].message).toContain('Menu.Item');
  });

  it('fails turning a value into a type-only export', () => {
    const root = typesRepo();
    change(
      root,
      'src/index.ts',
      RELEASED_TYPES_SOURCE['src/index.ts'].replace(
        "export * from './hooks';",
        "export type { useCount } from './hooks';",
      ),
    );
    expect(factIds(checkUpgradeLedger(root))).toEqual(['export-type-only:.:useCount']);
  });

  it('fails a hook signature change', () => {
    const root = typesRepo();
    change(
      root,
      'src/hooks.ts',
      'export function useCount(start: number, step: number): number { return start + step; }\n',
    );
    const result = checkUpgradeLedger(root);
    expect(factIds(result)).toEqual(['signature-changed:.:useCount']);
    expect(result.violations[0].message).toContain('(start: number, step: number): number');
  });

  it('fails removing a token key, reporting only the top key that left', () => {
    const root = typesRepo();
    change(
      root,
      'src/tokens.ts',
      "export const hds = { color: { content: { primary: '#000' } } };\n",
    );
    expect(factIds(checkUpgradeLedger(root))).toEqual([
      'key-removed:.:hds.color.content.secondary',
      'key-removed:.:hds.space',
    ]);
  });

  it('fails removing an export * as namespace', () => {
    const root = typesRepo();
    change(root, 'src/index.ts', "export * from './button';\nexport * as parts from './menu';\n");
    write(root, 'docs/api/releases/0.20.0.json', JSON.stringify(snapshotFromSource(root)));
    change(root, 'src/index.ts', "export * from './button';\n");
    expect(factIds(checkUpgradeLedger(root))).toEqual(['removed:.:parts']);
  });

  it('reports a namespace that lost an export as a removed key', () => {
    const root = typesRepo();
    change(
      root,
      'src/index.ts',
      "export * as parts from './menu';\nexport * as t from './tokens';\n",
    );
    write(root, 'docs/api/releases/0.20.0.json', JSON.stringify(snapshotFromSource(root)));
    change(root, 'src/tokens.ts', 'export const other = 1;\n');
    expect(factIds(checkUpgradeLedger(root))).toEqual(['key-removed:.:t.hds']);
  });

  it('does not fail a symbol that moved between root modules', () => {
    const root = typesRepo();
    write(root, 'src/hooks.ts', 'export const unused = 1;\n');
    change(
      root,
      'src/tokens.ts',
      `${RELEASED_TYPES_SOURCE['src/tokens.ts']}export function useCount(start: number): number { return start; }\n`,
    );
    const facts = diffSnapshots(released(root), snapshotFromSource(root));
    expect(facts.map((fact) => fact.id)).toEqual(['added:.:unused']);
  });

  it('counts every type fact as breaking', () => {
    for (const kind of ['export-type-only', 'signature-changed', 'member-removed', 'key-removed']) {
      expect(factImpact({ kind })).toBe('breaking');
    }
  });

  it('pre-fills a step for each type fact, so the note covers them', () => {
    const root = typesRepo();
    change(
      root,
      'src/menu.tsx',
      RELEASED_TYPES_SOURCE['src/menu.tsx'].replace('Item: MenuItem, ', ''),
    );
    change(
      root,
      'src/hooks.ts',
      'export function useCount(start: string): number { return Number(start); }\n',
    );
    change(
      root,
      'src/tokens.ts',
      "export const hds = { color: { content: { primary: '#000' } } };\n",
    );
    changeset(root, 'types', 'minor');
    writeNote(root, { name: 'types' });
    const steps = readNote(root, 'types').steps;
    expect(steps.map((step) => [step.id, step.impact])).toEqual([
      ['behavior/useCount', 'breaking'],
      ['removed/Menu.Item', 'breaking'],
      ['removed/hds.color.content.secondary', 'breaking'],
      ['removed/hds.space', 'breaking'],
    ]);
    const menuItem = steps.find((step) => step.id === 'removed/Menu.Item');
    expect(new RegExp(menuItem.detect.regex[0]).test('<Menu.Item>')).toBe(true);
    // Only the TODO plain lines are left for the author.
    expect(rules(checkUpgradeLedger(root))).toEqual(['note-invalid']);
  });

  it('fails a committed baseline that no longer matches the source', () => {
    const root = typesRepo();
    write(root, 'src/hooks.ts', 'export function useCount(): number { return 0; }\n');
    expect(rules(checkUpgradeLedger(root))).toContain('types-baseline-stale');
  });

  it('reports nothing against a release snapshot with no types section', () => {
    const root = releasedRepo();
    for (const [rel, text] of Object.entries(RELEASED_TYPES_SOURCE)) write(root, rel, text);
    write(root, 'docs/api/releases/0.20.0.json', JSON.stringify(snapshotFromSource(root)));
    change(root, 'src/hooks.ts', 'export function useCount(): number { return 0; }\n');
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });
});
