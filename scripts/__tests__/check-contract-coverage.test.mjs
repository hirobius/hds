/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/core-components.mjs and scripts/check-contract-coverage.mjs.
 * The gate reports core components with no usage.when of 20+ characters:
 * --report always exits 0, --enforce exits 1 while any is missing.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  it('has the 42 core names of the hds#254 table, without duplicates', () => {
    expect(CORE_COMPONENTS).toHaveLength(42);
    expect(new Set(CORE_COMPONENTS).size).toBe(42);
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
  const gaps = findContractGaps(CORE_COMPONENTS, manifest.componentSpecs);

  it('the worked examples leave some core components uncovered (plumbing ticket)', () => {
    expect(gaps.length).toBeGreaterThan(0);
  });

  it('--report prints the core misses and exits 0', () => {
    const out = run('--report');
    expect(out.status).toBe(0);
    for (const name of gaps) expect(out.stdout).toContain(name);
  });

  it('defaults to --report', () => {
    expect(run().status).toBe(0);
  });

  it('--enforce exits 1 while any core component lacks usage.when', () => {
    const out = run('--enforce');
    expect(out.status).toBe(1);
    expect(out.stderr + out.stdout).toContain(gaps[0]);
  });
});
