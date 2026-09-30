/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The ratified core set (hds#254, hds#374) where consumers read it. The 42
 * names in scripts/lib/core-components.mjs are the only source; the manifest
 * `core` flag, component-api.json, the README block, llms.txt and the consumer
 * SKILL.md are all generated from them and compared here.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_COMPONENTS } from '../lib/core-components.mjs';
import { applyCoreFlag } from '../lib/core-set.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const sorted = (names) => [...names].sort((a, b) => a.localeCompare(b));
const CORE = sorted(CORE_COMPONENTS);

const flagged = (entries) =>
  sorted(
    Object.entries(entries)
      .filter(([, spec]) => spec.core === true)
      .map(([name]) => name),
  );

describe('manifest core flag', () => {
  const manifest = readJson('public/hds-manifest.json');

  it('marks exactly the 42 core components with core: true', () => {
    expect(flagged(manifest.componentSpecs)).toEqual(CORE);
    expect(CORE).toHaveLength(42);
  });

  it('writes no other value of core on any spec or utility', () => {
    const others = [
      ...Object.entries(manifest.componentSpecs),
      ...Object.entries(manifest.utilities ?? {}),
    ].filter(([, spec]) => 'core' in spec && spec.core !== true);
    expect(others.map(([name]) => name)).toEqual([]);
    expect(flagged(manifest.utilities ?? {})).toEqual([]);
  });

  it('component-api.json carries the same 42', () => {
    const api = readJson('src/app/data/component-api.json');
    expect(flagged(api.components)).toEqual(CORE);
  });

  it('the agent projection passes the flag through', () => {
    spawnSync('node', ['scripts/generate-manifest-projection.mjs'], { cwd: ROOT });
    const agent = readJson('public/hds-manifest-agent.json');
    expect(flagged(agent.componentSpecs)).toEqual(CORE);
    expect(agent._agentProjection.strippedFields).not.toContain('core');
  });
});

describe('applyCoreFlag', () => {
  it('sets core: true on the named specs and removes a stale flag from the rest', () => {
    const specs = { A: { tier: 'primitive' }, B: { core: true }, C: { core: false } };
    applyCoreFlag(specs, ['A']);
    expect(specs).toEqual({ A: { tier: 'primitive', core: true }, B: {}, C: {} });
  });

  it('always writes the flag last, so a regen is byte-stable', () => {
    const specs = { A: { core: true, tier: 'primitive', category: 'Inputs' } };
    applyCoreFlag(specs, ['A']);
    expect(Object.keys(specs.A)).toEqual(['tier', 'category', 'core']);
  });

  it('returns the core names that have no spec, and flags the rest', () => {
    const specs = { A: {} };
    expect(applyCoreFlag(specs, ['A', 'Gone'])).toEqual(['Gone']);
    expect(specs).toEqual({ A: { core: true } });
  });
});

describe('validate-manifest', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'core-validate-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const validSpec = {
    category: 'Inputs',
    filePath: 'src/app/components/a.tsx',
    description: 'A.',
    props: {},
    allowedChildren: [],
    propConstraints: {},
    requiredProps: [],
    a11yRules: [],
    tier: 'primitive',
  };
  const validate = (componentSpecs) => {
    mkdirSync(path.join(dir, 'public'), { recursive: true });
    mkdirSync(path.join(dir, 'manifest'), { recursive: true });
    writeFileSync(path.join(dir, 'public/hds-manifest.json'), JSON.stringify({ componentSpecs }));
    writeFileSync(
      path.join(dir, 'manifest/schema.json'),
      readFileSync(path.join(ROOT, 'manifest/schema.json')),
    );
    return spawnSync('node', [path.join(ROOT, 'scripts/validate-manifest.mjs')], {
      cwd: dir,
      encoding: 'utf8',
    });
  };

  it('accepts core: true and a spec without the field', () => {
    expect(validate({ A: { ...validSpec, core: true }, B: validSpec }).status).toBe(0);
  });

  it('rejects any other value of core', () => {
    const out = validate({ A: { ...validSpec, core: false } });
    expect(out.status).toBe(1);
    expect(out.stderr).toContain('"field":"core"');
  });
});

describe('manifest schema', () => {
  const schema = readJson('manifest/schema.json');
  const lock = readJson('manifest/schema.lock.json');

  it('declares core as an optional boolean, distinct from tier', () => {
    expect(schema.properties.core.type).toBe('boolean');
    expect(schema.required).not.toContain('core');
    expect(schema.properties.core.description).toMatch(/tier/);
  });

  it('locks core, so removing it later is reported as breaking', () => {
    expect(lock.properties.core).toEqual(schema.properties.core);
  });

  describe('check-manifest-schema-semver', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'core-semver-'));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const runAgainst = (lockSchema, currentSchema) => {
      mkdirSync(path.join(dir, 'manifest'), { recursive: true });
      writeFileSync(path.join(dir, 'manifest/schema.lock.json'), JSON.stringify(lockSchema));
      writeFileSync(path.join(dir, 'manifest/schema.json'), JSON.stringify(currentSchema));
      return spawnSync('node', ['scripts/check-manifest-schema-semver.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, FIXTURE_DIR: dir },
      });
    };
    const withoutCore = () => {
      const copy = structuredClone(schema);
      delete copy.properties.core;
      return copy;
    };

    it('lists core under minor changes against the lock before it', () => {
      const out = runAgainst(withoutCore(), schema);
      expect(out.status).toBe(0);
      expect(out.stdout).toMatch(/Minor changes[\s\S]*Property added: core/);
    });

    it('fails when core is removed from the locked schema', () => {
      const out = runAgainst(schema, withoutCore());
      expect(out.status).toBe(1);
      expect(out.stderr).toContain('Property removed: core');
    });
  });
});
