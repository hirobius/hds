/**
 * hds#459 value changes: the upgrade command compares the installed and the
 * target dist/css-contract.json and reports a variable whose value changed
 * only where the consumer reads or writes it.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { valueChanges, varUses } from '../../codemods/css-vars.mjs';
import { PKG, REPO, makeProject, npmLock, pkgJson, runCli } from './helpers/upgrade-fixtures.mjs';

const contract = (variables) => ({
  format: 1,
  bundles: { './styles.css': { classes: [], fontFaces: [], layers: [], variables } },
  publicClasses: [],
});

const SOURCE = contract({
  '--semantic-color-accent': { ':root': '#00f' },
  '--semantic-color-border': { ':root': '#ccc' },
  '--semantic-color-unused': { ':root': '#111' },
  '--primitive-space-4': { ':root': '16px' },
});
const TARGET = contract({
  '--semantic-color-accent': { ':root': '#06f' },
  '--semantic-color-border': { ':root': '#ccc', '[data-theme=dark]': '#333' },
  '--semantic-color-unused': { ':root': '#222' },
  '--primitive-space-4': { ':root': '16px' },
});

describe('varUses', () => {
  it('collects HDS names a source reads and writes', () => {
    const uses = varUses(
      ':root { --semantic-color-border: red; }\n.a { color: var(--semantic-color-accent); }\n',
    );
    expect(uses.get('--semantic-color-accent')).toEqual({ read: true, write: false });
    expect(uses.get('--semantic-color-border')).toEqual({ read: false, write: true });
    expect(uses.has('--my-own')).toBe(false);
  });
});

describe('valueChanges', () => {
  const changes = valueChanges(SOURCE, TARGET);

  it('lists every variable whose value changed in any context', () => {
    expect([...changes.keys()].sort()).toEqual([
      '--semantic-color-accent',
      '--semantic-color-border',
      '--semantic-color-unused',
    ]);
    expect(changes.get('--semantic-color-accent')).toEqual({
      from: { ':root': '#00f' },
      to: { ':root': '#06f' },
    });
  });

  it('is empty without a source contract', () => {
    expect(valueChanges(null, TARGET).size).toBe(0);
  });
});

const posix = process.platform === 'win32' ? it.skip : it;
const DIST = join(REPO, 'dist/css-contract.json');
const built = existsSync(DIST);

// Variables some release's ledger already records a value-changed step for.
const ledgered = new Set(
  readdirSync(join(REPO, 'upgrade/releases'))
    .flatMap((f) => JSON.parse(readFileSync(join(REPO, 'upgrade/releases', f), 'utf8')).steps ?? [])
    .filter((st) => st.kind === 'value-changed')
    .flatMap((st) => st.detect?.cssVars ?? []),
);

describe('upgrade command', () => {
  (built ? posix : it.skip)('reports a changed value only for variables the consumer uses', () => {
    const target = JSON.parse(readFileSync(DIST, 'utf8'));
    const names = [
      ...new Set(Object.values(target.bundles).flatMap((b) => Object.keys(b.variables ?? {}))),
    ].filter((n) => n.startsWith('--semantic-color-') && !ledgered.has(n));
    const [read, written, unused] = names;
    const covered = [...ledgered].find((n) => n.startsWith('--semantic-'));
    const source = structuredClone(target);
    for (const b of Object.values(source.bundles))
      for (const n of [read, written, unused, covered])
        if (b.variables?.[n]) b.variables[n] = { ':root': 'rgb(1 2 3)' };
    const root = makeProject({
      'package.json': pkgJson('app', { [PKG]: '^0.16.0' }),
      'package-lock.json': npmLock('0.16.0'),
      [`node_modules/${PKG}/package.json`]: { name: PKG, version: '0.16.0' },
      [`node_modules/${PKG}/dist/css-contract.json`]: source,
      'src/app.css': `@import '${PKG}/styles.css';\n.a { color: var(${read}); border-color: var(${covered}); }\n:root { ${written}: red; }\n`,
    });
    const res = runCli(['upgrade', '--root', root, '--check', '--json', '--no-typecheck']);
    const report = JSON.parse(res.stdout);
    const items = report.looksDifferent;
    const ids = items.map((i) => i.id);
    const readItem = items.find((i) => i.id === `hds-css-vars/value/${read}`);
    expect(readItem).toBeDefined();
    expect(readItem.files).toEqual(['src/app.css']);
    expect(readItem.plain).toContain('reads');
    expect(readItem.plain).toContain('rgb(1 2 3)');
    const writeItem = items.find((i) => i.id === `hds-css-vars/value/${written}`);
    expect(writeItem.plain).toContain('sets');
    // Not used: no report.
    expect(ids).not.toContain(`hds-css-vars/value/${unused}`);
    // A ledger value-changed step already covers it: not reported twice.
    expect(ids).not.toContain(`hds-css-vars/value/${covered}`);
    expect(report.doByHand.some((i) => i.id.startsWith('hds-css-vars/value/'))).toBe(false);
  });
});
