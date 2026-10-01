/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/core-components.mjs and scripts/check-contract-coverage.mjs.
 * The gate reports core components with no usage.when of 20+ characters:
 * --report always exits 0, --enforce exits 1 while any is missing, and the
 * committed manifest has none missing.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_COMPONENTS } from '../lib/core-components.mjs';
import { findContractGaps, MIN_WHEN_LENGTH } from '../check-contract-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'));

const run = (...args) =>
  spawnSync('node', ['scripts/check-contract-coverage.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });

describe('core component list', () => {
  it('has the 39 core names: the 42 of the hds#254 table less the three hds#394 removed', () => {
    expect(CORE_COMPONENTS).toHaveLength(39);
    expect(new Set(CORE_COMPONENTS).size).toBe(39);
  });

  it('the guardrail registry entry states no core count other than the list length', () => {
    const { gates } = JSON.parse(
      readFileSync(path.join(ROOT, 'docs/guardrails/registry.json'), 'utf8'),
    );
    const entry = gates.find((g) => g.id === 'check-contract-coverage');
    expect(entry).toBeDefined();
    const counts = [...entry.description.matchAll(/\b(\d+) core\b/g)].map((m) => Number(m[1]));
    expect(counts.filter((n) => n !== CORE_COMPONENTS.length)).toEqual([]);
  });

  it('drops ButtonGroup, ContextMenu and HoverCard, removed in 0.20.0 (hds#394)', () => {
    for (const gone of ['ButtonGroup', 'ContextMenu', 'HoverCard']) {
      expect(CORE_COMPONENTS).not.toContain(gone);
    }
  });

  it('applies the hds#315 renames', () => {
    for (const renamed of ['Checkbox', 'Radio', 'Select', 'Slider', 'Toggle']) {
      expect(CORE_COMPONENTS).toContain(renamed);
    }
    for (const old of ['HdsCheckbox', 'HdsRadio', 'HdsSelect', 'HdsSlider', 'HdsToggle']) {
      expect(CORE_COMPONENTS).not.toContain(old);
    }
  });

  it('resolves every name to a non-hidden spec in public/hds-manifest.json', () => {
    for (const name of CORE_COMPONENTS) {
      const spec = manifest.componentSpecs[name];
      expect(spec, name).toBeDefined();
      expect(spec.hidden, name).toBe(false);
    }
  });
});

describe('findContractGaps', () => {
  const specs = {
    Good: { usage: { when: 'x'.repeat(MIN_WHEN_LENGTH) } },
    Short: { usage: { when: 'x'.repeat(MIN_WHEN_LENGTH - 1) } },
    Untagged: {},
  };

  it('lists names whose usage.when is missing or shorter than the minimum', () => {
    expect(findContractGaps(['Good', 'Short', 'Untagged', 'Absent'], specs)).toEqual([
      'Short',
      'Untagged',
      'Absent',
    ]);
  });

  it('returns nothing when every name is covered', () => {
    expect(findContractGaps(['Good'], specs)).toEqual([]);
  });
});

describe('check-contract-coverage CLI', () => {
  it('every core component has a usage.when in the committed manifest (hds#340)', () => {
    expect(findContractGaps(CORE_COMPONENTS, manifest.componentSpecs)).toEqual([]);
  });

  it('--enforce exits 0 and reports 39/39 core components covered', () => {
    const out = run('--enforce');
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('39/39');
  });

  it('defaults to --report and exits 0', () => {
    expect(run().status).toBe(0);
  });

  describe('against a manifest with a gap', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'contract-cov-'));
    const file = path.join(dir, 'manifest.json');
    const specs = Object.fromEntries(
      CORE_COMPONENTS.map((n) => [n, { usage: { when: 'x'.repeat(MIN_WHEN_LENGTH) } }]),
    );
    specs.Toggle = {};
    writeFileSync(file, JSON.stringify({ componentSpecs: specs }));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('--report lists the gap and exits 0', () => {
      const out = run('--report', '--manifest', file);
      expect(out.status).toBe(0);
      expect(out.stdout).toContain('Toggle');
    });

    it('--enforce names the gap and exits 1', () => {
      const out = run('--enforce', '--manifest', file);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain('Toggle');
    });
  });
});

describe('gate wiring (hds#340)', () => {
  it('.husky/pre-commit runs the gate with --enforce', () => {
    const hook = readFileSync(path.join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-contract-coverage\.mjs --enforce$/m);
  });

  it('the registry fires it at pre-commit', () => {
    const registry = JSON.parse(
      readFileSync(path.join(ROOT, 'docs/guardrails/registry.json'), 'utf8'),
    );
    const entry = registry.gates.find((g) => g.id === 'check-contract-coverage');
    expect(entry.firingChannel).toBe('pre-commit');
  });
});

describe('llms.txt "Which one when"', () => {
  const llms = readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
  const section = llms.split('## Which one when')[1]?.split(/\n## /)[0] ?? '';
  const names = section
    .split('\n')
    .map((line) => line.match(/^([A-Za-z.]+): /)?.[1])
    .filter(Boolean);

  it('lists every core component', () => {
    expect(CORE_COMPONENTS.filter((n) => !names.includes(n))).toEqual([]);
  });
});

describe('keyboard contract tags on core overlays', () => {
  it.each(['Combobox', 'Dialog', 'Select'])('%s declares keyboard', (name) => {
    expect(manifest.componentSpecs[name].keyboard?.length).toBeGreaterThan(0);
  });
});

describe('contract tags stay on the component they describe (hds#340 review)', () => {
  const coreSet = new Set(CORE_COMPONENTS);
  const subParts = Object.keys(manifest.componentSpecs).filter(
    (n) => /^(Dialog|Tabs)[A-Z]/.test(n) && !coreSet.has(n),
  );

  it('finds the Dialog and Tabs sub-parts', () => {
    expect(subParts.length).toBeGreaterThan(0);
  });

  it.each(subParts)('%s does not inherit its parent contract', (name) => {
    const spec = manifest.componentSpecs[name];
    expect(spec.usage?.when).toBeUndefined();
    expect(spec.useInstead ?? []).toEqual([]);
  });

  it('no two "Which one when" lines share the same text', () => {
    const llms = readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
    const section = llms.split('## Which one when')[1]?.split(/\n## /)[0] ?? '';
    const bodies = section
      .split('\n')
      .map((l) => l.match(/^[A-Za-z.]+: (.*)$/)?.[1])
      .filter(Boolean);
    expect(bodies.length - new Set(bodies).size).toBe(0);
  });
});

describe('--manifest without a path', () => {
  it('exits 1 with an actionable message', () => {
    const r = run('--manifest');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('--manifest needs a path');
  });
});

describe('registry entry', () => {
  it('is severity error and lists the pre-commit channel', () => {
    const registry = JSON.parse(
      readFileSync(path.join(ROOT, 'docs/guardrails/registry.json'), 'utf8'),
    );
    const entry = registry.gates.find((g) => g.id === 'check-contract-coverage');
    expect(entry.severity).toBe('error');
    expect(entry.firingChannels).toEqual(['pre-commit']);
  });
});
