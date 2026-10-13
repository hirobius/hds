/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-a11y-contracts.mjs and scripts/lib/a11y-interactive.mjs.
 * The gate lists every a11y-contract gap (report mode exits 0, --enforce exits
 * 1): an interactive root with no rules, a rule with no owner, an
 * owner:component rule whose test id is absent, skipped or marked .fails, and
 * a component in a governed category that nobody classified.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectTestIds, findA11yGaps } from '../check-a11y-contracts.mjs';
import { COMPOSITE, INTERACTIVE, PARTS } from '../lib/a11y-interactive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'));
const tmp = mkdtempSync(path.join(tmpdir(), 'a11y-contracts-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const run = (args, env = {}) =>
  spawnSync('node', ['scripts/check-a11y-contracts.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

const spec = (category, a11yRules) => ({
  category,
  filePath: 'src/x.tsx',
  hidden: false,
  a11yRules,
});
const owned = (testId) => ({ rule: 'Does it.', required: true, owner: 'component', testId });
const file = (text) => ({ path: 'tests/primitive-contracts/x.test.tsx', text });
const gaps = (specs, testFiles = [], gateIds = []) => findA11yGaps({ specs, testFiles, gateIds });
const codes = (out) => out.errors.map((e) => `${e.code} ${e.component}`);

describe('findA11yGaps', () => {
  it('E1: an interactive root with no a11yRules names the component', () => {
    expect(codes(gaps({ Menu: spec('Overlays', []) }))).toEqual(['E1-empty Menu']);
    expect(gaps({ Menu: spec('Overlays', []) }).errors[0].message).toMatch(/^Menu: no a11yRules/);
  });

  it('E2: a rule on an interactive root needs an owner', () => {
    const out = gaps({ Menu: spec('Overlays', [{ rule: 'x', required: true }]) });
    expect(codes(out)).toEqual(['E2-owner Menu']);
  });

  it('E3: an owner:component rule with no test id fails', () => {
    const out = gaps({ Menu: spec('Overlays', [owned(undefined)]) });
    expect(codes(out)).toEqual(['E3-untested Menu']);
  });

  it('E3: an a11y id absent from every test fails and names the id and the component', () => {
    const out = gaps({ Menu: spec('Overlays', [owned('a11y:menu.nope')]) }, [file('it("x")')]);
    expect(codes(out)).toEqual(['E3-untested Menu']);
    expect(out.errors[0].message).toContain('a11y:menu.nope');
  });

  it('E3: an id present as a literal in an active test passes', () => {
    const out = gaps({ Menu: spec('Overlays', [owned('a11y:menu.esc')]) }, [
      file("it('a11y:menu.esc closes', () => {})"),
    ]);
    expect(out.errors).toEqual([]);
  });

  it('E3: an id only in a file with a skipped or todo test does not count', () => {
    for (const text of [
      "it.skip('a11y:menu.esc', () => {})",
      "it('a11y:menu.esc', () => {}); it.todo('later')",
      "xit('a11y:menu.esc', () => {})",
      "describe.skip('x', () => { it('a11y:menu.esc', () => {}) })",
    ]) {
      const out = gaps({ Menu: spec('Overlays', [owned('a11y:menu.esc')]) }, [file(text)]);
      expect(codes(out), text).toEqual(['E3-untested Menu']);
    }
  });

  it('E3: an id on a .fails( line does not count', () => {
    const out = gaps({ Menu: spec('Overlays', [owned('a11y:menu.esc')]) }, [
      file("it.fails('a11y:menu.esc', () => {})"),
    ]);
    expect(codes(out)).toEqual(['E3-untested Menu']);
  });

  it('E3: a gate: id must name a gate in the registry', () => {
    const rules = [owned('gate:check-contrast')];
    expect(codes(gaps({ Menu: spec('Overlays', rules) }))).toEqual(['E3-untested Menu']);
    expect(gaps({ Menu: spec('Overlays', rules) }, [], ['check-contrast']).errors).toEqual([]);
  });

  it('a consumer rule needs no test id', () => {
    const rules = [{ rule: 'Name it.', required: true, owner: 'consumer' }];
    expect(gaps({ Menu: spec('Overlays', rules) }).errors).toEqual([]);
  });

  it('E4: a governed-category component nobody classified fails; hidden and deprecated do not', () => {
    const specs = {
      Knob: spec('Inputs', []),
      Hid: { ...spec('Inputs', []), hidden: true },
      Old: { ...spec('Inputs', []), deprecated: 'Use Knob.' },
      Badge: spec('Feedback', []),
      FormActions: spec('Actions', []),
      DialogTitle: spec('Overlays', []),
    };
    expect(codes(gaps(specs))).toEqual(['E4-unclassified Knob']);
  });

  it('W1/W2 only warn: an orphan test id, and two rules sharing one', () => {
    const rules = [owned('a11y:menu.esc'), owned('a11y:menu.esc')];
    const out = gaps({ Menu: spec('Overlays', rules) }, [
      file("it('a11y:menu.esc a11y:menu.orphan', () => {})"),
    ]);
    expect(out.errors).toEqual([]);
    expect(out.warnings.map((w) => w.code).sort()).toEqual(['W1-orphan', 'W2-duplicate']);
  });

  it('W2 skips gate: ids: one gate proves one property for many components', () => {
    const out = gaps(
      {
        Menu: spec('Overlays', [owned('gate:check-a11y-contracts')]),
        Select: spec('Inputs', [owned('gate:check-a11y-contracts')]),
      },
      [],
      ['check-a11y-contracts'],
    );
    expect(out.errors).toEqual([]);
    expect(out.warnings).toEqual([]);
  });
});

describe('collectTestIds', () => {
  it('collects ids with dots and dashes and keeps the proving files', () => {
    const ids = collectTestIds([
      file("it('a11y:select.typeahead-moves a11y:tabs.arrow', () => {})"),
    ]);
    expect([...ids.keys()].sort()).toEqual(['a11y:select.typeahead-moves', 'a11y:tabs.arrow']);
  });
});

describe('the interactive lists', () => {
  it('every INTERACTIVE root, PARTS key and COMPOSITE name exists in the manifest or is out of scope', () => {
    const specs = manifest.componentSpecs;
    for (const name of [...INTERACTIVE, ...Object.keys(PARTS)]) {
      expect(specs[name], name).toBeDefined();
    }
    for (const root of Object.values(PARTS)) expect(INTERACTIVE).toContain(root);
    expect(new Set(INTERACTIVE).size).toBe(INTERACTIVE.length);
    expect(COMPOSITE).toEqual(
      expect.arrayContaining(['FormActions', 'Pin', 'Sidebar', 'EmptyState']),
    );
  });

  it('classifies every governed-category component in the committed manifest (no E4)', () => {
    const out = findA11yGaps({ specs: manifest.componentSpecs, testFiles: [], gateIds: [] });
    expect(out.errors.filter((e) => e.code === 'E4-unclassified')).toEqual([]);
  });
});

describe('the command', () => {
  const fx = (name) => path.join(ROOT, 'fixtures/check-a11y-contracts', `${name}.example.json`);

  it('proof of firing: the violating fixture exits 1 naming Menu, the passing one exits 0', () => {
    const bad = run(['--fixture-mode'], { FIXTURE_FILE: fx('violating'), HDS_FIXTURE_MODE: '1' });
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('Menu');
    const good = run(['--fixture-mode'], { FIXTURE_FILE: fx('passing'), HDS_FIXTURE_MODE: '1' });
    expect(good.status).toBe(0);
  });

  it('report mode lists every gap and exits 0; --enforce exits 1 on the same manifest', () => {
    const dir = path.join(tmp, 'm');
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'manifest.json');
    writeFileSync(
      file,
      JSON.stringify({
        componentSpecs: { Menu: spec('Overlays', []), Tabs: spec('Navigation', []) },
      }),
    );
    const report = run(['--manifest', file, '--tests', dir]);
    expect(report.status).toBe(0);
    expect(report.stdout).toMatch(/E1-empty\s+Menu/);
    expect(report.stdout).toMatch(/E1-empty\s+Tabs/);
    const enforce = run(['--manifest', file, '--tests', dir, '--enforce']);
    expect(enforce.status).toBe(1);
    expect(enforce.stderr).toMatch(/Menu/);
  });

  it('--manifest with no path fails loudly', () => {
    expect(run(['--manifest']).status).toBe(1);
  });

  it('the committed manifest: report mode exits 0', () => {
    expect(run([]).status).toBe(0);
  });

  it('the committed manifest has zero gaps: --enforce exits 0', () => {
    const res = run(['--enforce']);
    expect(res.stderr).toBe('');
    expect(res.stdout).toMatch(/, 0 gap\(s\)/);
    expect(res.status).toBe(0);
  });
});

describe('the flip (hds#520): the gate blocks, it no longer only reports', () => {
  it('the registry entry is severity error', () => {
    const registry = JSON.parse(
      readFileSync(path.join(ROOT, 'docs/guardrails/registry.json'), 'utf8'),
    );
    const gate = registry.gates.find((g) => g.id === 'check-a11y-contracts');
    expect(gate.severity).toBe('error');
  });

  it('pre-commit runs it with --enforce', () => {
    const hook = readFileSync(path.join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-a11y-contracts\.mjs --enforce$/m);
  });
});
