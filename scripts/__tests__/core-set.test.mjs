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
import {
  applyCoreFlag,
  collectCoreSet,
  CORE_SET_BLOCK,
  findCoreSetDrift,
  patternModuleNames,
  renderCoreSetBlock,
} from '../lib/core-set.mjs';

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

describe('patternModuleNames', () => {
  const specs = {
    Lightbox: { filePath: 'src/app/components/image-lightbox.tsx' },
    Form: { filePath: 'src/app/components/form.tsx' },
    FormField: { filePath: 'src/app/components/form.tsx' },
    PageA: { filePath: 'src/app/components/two.tsx' },
    PageB: { filePath: 'src/app/components/two.tsx' },
  };

  it('names each module by its PascalCase component, or its only component, sorted', () => {
    expect(patternModuleNames(['image-lightbox', 'form'], specs)).toEqual(['Form', 'Lightbox']);
  });

  it('throws when a module has no single main component', () => {
    expect(() => patternModuleNames(['two'], specs)).toThrow(/two/);
    expect(() => patternModuleNames(['missing'], specs)).toThrow(/missing/);
  });
});

describe('renderCoreSetBlock', () => {
  const out = renderCoreSetBlock({
    core: [
      { category: 'Actions', names: ['Button', 'ButtonGroup'] },
      { category: 'Layout', names: ['Stack'] },
    ],
    patterns: ['ActivityFeed', 'Page'],
    rootDeprecated: 1,
  });

  it('states the counts and lists the core names by category', () => {
    expect(out).toContain('**3** components are the core set');
    expect(out).toContain('- **Actions:** `Button`, `ButtonGroup`');
    expect(out).toContain('- **Layout:** `Stack`');
  });

  it('names the /patterns modules and the root re-exports kept until 1.0', () => {
    expect(out).toContain('**2** pattern modules ship from `@hirobius/design-system/patterns`');
    expect(out).toContain('`ActivityFeed`, `Page`');
    expect(out).toMatch(/\*\*1\*\* of the pattern modules[^\n]*until 1\.0/);
    expect(out).toContain('(MIGRATIONS.md#pattern-components-move-to-patterns)');
    expect(out).toMatch(/fold[^\n]*until 1\.0/);
  });

  it('links the architecture doc and the ADR', () => {
    expect(out).toContain('(docs/hds-architecture-2026-09-18.html)');
    expect(out).toContain('(docs/adr/031-core-set-and-dispositions.md)');
  });
});

describe('README "What belongs in the system"', () => {
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const data = collectCoreSet(ROOT);

  it('has exactly one core-set block, under its heading, between "In use" and the package guide', () => {
    expect(readme.match(new RegExp(`<!-- auto:start:${CORE_SET_BLOCK} -->`, 'g'))).toHaveLength(1);
    const heading = readme.indexOf('\n## What belongs in the system\n');
    const block = readme.indexOf(`<!-- auto:start:${CORE_SET_BLOCK} -->`);
    expect(heading).toBeGreaterThan(readme.indexOf('\n## In use\n'));
    expect(block).toBeGreaterThan(heading);
    expect(readme.slice(heading + 1, block)).not.toMatch(/\n## /);
    expect(readme.indexOf('\n## Using the published package\n')).toBeGreaterThan(block);
  });

  it('is the generated block, byte for byte', () => {
    expect(findCoreSetDrift(readme, data)).toEqual([]);
  });

  it('reports drift when the block is edited by hand', () => {
    const altered = readme.replace('`Button`, `ButtonGroup`', '`Button`');
    expect(altered).not.toBe(readme);
    expect(findCoreSetDrift(altered, data)).toEqual([expect.stringMatching(/pnpm readme:counts/)]);
  });

  it('names all 42 core components and every /patterns module', () => {
    const block = readme
      .split(`<!-- auto:start:${CORE_SET_BLOCK} -->`)[1]
      .split('<!-- auto:end')[0];
    for (const name of CORE_COMPONENTS) expect(block).toContain(`\`${name}\``);
    const modules = [
      ...readFileSync(path.join(ROOT, 'src/patterns.ts'), 'utf8').matchAll(/^export \* from /gm),
    ];
    expect(data.patterns).toHaveLength(modules.length);
    expect(block).toContain(`**${modules.length}** pattern modules`);
    for (const name of data.patterns) expect(block).toContain(`\`${name}\``);
  });
});

describe('llms.txt "Core set"', () => {
  const files = ['llms.txt', 'public/llms.txt'];
  const texts = files.map((f) => readFileSync(path.join(ROOT, f), 'utf8'));
  const sectionOf = (text, heading) => text.split(`\n## ${heading}\n`)[1]?.split(/\n## /)[0] ?? '';

  it.each(files)('%s has one "## Core set" section, before "## Which one when"', (file) => {
    const text = texts[files.indexOf(file)];
    expect(text.match(/^## Core set$/gm)).toHaveLength(1);
    expect(text.indexOf('\n## Core set\n')).toBeLessThan(text.indexOf('\n## Which one when\n'));
  });

  it('lists the 42 core names, one per line', () => {
    const names = [...sectionOf(texts[1], 'Core set').matchAll(/^- ([A-Za-z]+) \(/gm)].map(
      (m) => m[1],
    );
    expect(names).toHaveLength(42);
    expect(sorted(names)).toEqual(CORE);
  });

  it('marks exactly the core lines of "Which one when" with [core]', () => {
    const lines = sectionOf(texts[1], 'Which one when')
      .split('\n')
      .filter((l) => /^[A-Za-z.]+: /.test(l));
    const marked = lines
      .filter((l) => /^[A-Za-z.]+: \[core\] /.test(l))
      .map((l) => l.split(':')[0]);
    expect(sorted(marked)).toEqual(CORE);
  });

  it('keeps the root and public copies identical', () => {
    expect(texts[0]).toBe(texts[1]);
  });
});

describe('consumer SKILL.md "Core set"', () => {
  const skill = readFileSync(path.join(ROOT, 'skills/hds-consumer/SKILL.md'), 'utf8');

  it('has one "## Core set" section, before the category allow-list', () => {
    expect(skill.match(/^## Core set$/gm)).toHaveLength(1);
    expect(skill.indexOf('\n## Core set\n')).toBeLessThan(skill.indexOf('\n## Allow-list'));
  });

  it('names exactly the 42 core components', () => {
    const section = skill.split('\n## Core set\n')[1].split(/\n## /)[0];
    const names = [...section.matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1]);
    expect(sorted(names)).toEqual(CORE);
  });
});
