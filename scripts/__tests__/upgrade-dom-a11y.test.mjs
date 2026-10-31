/**
 * The DOM and accessibility baseline in the upgrade gate (hds#468): a change to
 * a demo's roles, accessible names, states or data-* attributes since the last
 * release is a behavior fact, and its step must say how to find the consumer
 * code that selects on it (detect.regex).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import { factImpact } from '../upgrade/ledger.mjs';
import { writeNote } from '../upgrade/note.mjs';
import {
  RELEASED_DOM,
  changeset,
  cleanUpRepos,
  domRepo,
  note,
  readNote,
  write,
  writeDomBaseline,
} from './helpers/upgrade-repo.mjs';

afterEach(cleanUpRepos);

const rules = (result) => result.violations.map((v) => v.rule).sort();
const factIds = (result) => result.violations.map((v) => v.fact).filter(Boolean);

/** RELEASED_DOM with Table's outline passed through `change`. */
function withTable(change) {
  const dom = structuredClone(RELEASED_DOM);
  dom.Table = change(dom.Table);
  return dom;
}

const roleChanged = withTable((t) => ({
  ...t,
  dom: t.dom.map((l) => l.replace('"row"', '"group"')),
}));

const behaviorStep = (extra = {}) => ({
  id: 'behavior/Table.dom',
  kind: 'behavior',
  impact: 'behavior',
  plain: 'Table rows are groups now; select them with getByRole("group").',
  detect: { regex: ['getByRole\\([\'"]row'] },
  facts: ['dom-changed:Table'],
  ...extra,
});

describe('dom facts', () => {
  it('changing a role fails without a step', () => {
    const root = domRepo();
    writeDomBaseline(root, roleChanged);
    const result = checkUpgradeLedger(root);
    expect(result.ok).toBe(false);
    expect(factIds(result)).toEqual(['dom-changed:Table']);
    expect(result.violations[0].message).toContain('docs/baselines/dom-a11y.json');
  });

  it('changing a data-* value fails without a step', () => {
    const root = domRepo();
    writeDomBaseline(
      root,
      withTable((t) => ({ ...t, dom: t.dom.map((l) => l.replace('"label"', '"title"')) })),
    );
    expect(factIds(checkUpgradeLedger(root))).toEqual(['dom-changed:Table']);
  });

  it('changing an accessible name fails without a step', () => {
    const root = domRepo();
    writeDomBaseline(
      root,
      withTable((t) => ({ ...t, reader: ['table, Work', ...t.reader.slice(1)] })),
    );
    expect(factIds(checkUpgradeLedger(root))).toEqual(['dom-changed:Table']);
  });

  it('is a behavior fact', () => {
    expect(factImpact({ kind: 'dom-changed', name: 'Table' })).toBe('behavior');
  });

  it('passes with a behavior step that detects by regex, under a patch', () => {
    const root = domRepo();
    writeDomBaseline(root, roleChanged);
    changeset(root, 'table-rows', 'patch');
    note(root, 'table-rows', {
      impact: 'behavior',
      plain: behaviorStep().plain,
      steps: [behaviorStep()],
    });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('refuses a step for a dom fact with no detect regex', () => {
    const root = domRepo();
    writeDomBaseline(root, roleChanged);
    changeset(root, 'table-rows', 'patch');
    const step = behaviorStep({ detect: { jsx: ['Table'] } });
    note(root, 'table-rows', { impact: 'behavior', plain: step.plain, steps: [step] });
    expect(rules(checkUpgradeLedger(root))).toEqual(['dom-step-without-detect']);
  });

  it('refuses a step for a dom fact that is not a behavior step', () => {
    const root = domRepo();
    writeDomBaseline(root, roleChanged);
    changeset(root, 'table-rows', 'patch');
    const step = behaviorStep({ id: 'look/Table.dom', kind: 'look', impact: 'look' });
    note(root, 'table-rows', { impact: 'look', plain: step.plain, steps: [step] });
    expect(rules(checkUpgradeLedger(root))).toEqual(['dom-step-without-detect']);
  });

  it('pnpm upgrade:note pre-fills a behavior step the gate still refuses until it has a regex', () => {
    const root = domRepo();
    writeDomBaseline(root, roleChanged);
    changeset(root, 'table-rows', 'patch');
    writeNote(root, { name: 'table-rows' });
    const [step] = readNote(root, 'table-rows').steps;
    expect(step).toMatchObject({
      id: 'behavior/Table.dom',
      kind: 'behavior',
      impact: 'behavior',
      detect: { jsx: ['Table'] },
      facts: ['dom-changed:Table'],
    });
    expect(rules(checkUpgradeLedger(root))).toContain('dom-step-without-detect');
  });

  it('reports nothing against a release snapshot with no dom section', () => {
    const root = domRepo();
    const file = join(root, 'docs/api/releases/0.20.0.json');
    const snapshot = JSON.parse(readFileSync(file, 'utf8'));
    expect(snapshot.dom).toEqual(RELEASED_DOM);
    delete snapshot.dom;
    write(root, 'docs/api/releases/0.20.0.json', JSON.stringify(snapshot));
    writeDomBaseline(root, roleChanged);
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });
});
