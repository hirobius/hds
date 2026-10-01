/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/generate-consumer-skill.mjs (hds#345): the consumer SKILL.md
 * is a projection of the manifest, the barrel, the shared layout recipe and
 * CONSUMING.md. Pure-function cases run on an in-memory manifest; repo cases run
 * against the committed file.
 */

import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  buildConsumerSkill,
  firstSentence,
  LINT_INSTALL_LINE,
  SKILL_PATH,
} from '../generate-consumer-skill.mjs';
import { layoutRecipeSteps, layoutNegativeRules } from '../lib/layout-recipe.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const spec = (filePath, description, category = 'Core') => ({
  filePath,
  description,
  category,
  hidden: false,
});

const fixtureManifest = () => ({
  componentInventory: ['Zed', 'Alpha', 'Ghost', 'Orphan', 'Beta'],
  componentSpecs: {
    Zed: spec('src/app/components/zed.tsx', 'Zed does zed things. More detail here.'),
    Alpha: spec('src/app/components/alpha.tsx', 'Alpha is first. Second sentence.'),
    Ghost: { ...spec('src/app/components/ghost.tsx', 'Hidden one.'), hidden: true },
    Orphan: spec('src/app/components/orphan.tsx', 'Not in barrel.'),
    Beta: spec('src/app/components/beta.tsx', 'Beta lives in Forms.', 'Forms'),
  },
});
const fixtureIndex = [
  "export * from './app/components/zed';",
  "export * from './app/components/alpha';",
  "export * from './app/components/ghost';",
  "export * from './app/components/beta';",
].join('\n');
const fixtureExports = {
  '.': {},
  './tokens': {},
  './styles.css': '',
  './package.json': '',
};

const build = (over = {}) =>
  buildConsumerSkill({
    manifest: fixtureManifest(),
    indexSource: fixtureIndex,
    packageExports: fixtureExports,
    ...over,
  });

describe('firstSentence', () => {
  it('does not end on an abbreviation such as e.g.', () => {
    expect(firstSentence('Renders a key, e.g. `<Kbd>K</Kbd>`. More.')).toBe(
      'Renders a key, e.g. `<Kbd>K</Kbd>`.',
    );
    expect(firstSentence('A row (i.e. a list item). Next.')).toBe('A row (i.e. a list item).');
    expect(firstSentence('Hides text, etc. from view. Next.')).toBe('Hides text, etc. from view.');
  });
  it('still splits plain sentences', () => {
    expect(firstSentence('One. Two.')).toBe('One.');
  });
});

describe('allow-list wording', () => {
  it('does not claim the list is the only importable surface', () => {
    const out = build();
    expect(out).not.toContain('Import only these names');
    expect(out).toContain('HdsThemeProvider');
  });
});

describe('module import safety', () => {
  it('imports without process.argv[1]', () => {
    const r = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', "await import('./scripts/generate-consumer-skill.mjs')"],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(r.status).toBe(0);
  });
});

describe('buildConsumerSkill (in-memory)', () => {
  it('frontmatter is valid YAML (a bare colon in the description broke skills add)', () => {
    const fm = build().split('---\n')[1];
    const data = parseYaml(fm);
    expect(data.name).toBe('hds-consumer');
    expect(typeof data.description).toBe('string');
    expect(data.description).toContain('@hirobius/design-system');
  });

  it('starts with frontmatter naming hds-consumer and a description', () => {
    const out = build();
    expect(out.startsWith('---\nname: hds-consumer\ndescription: ')).toBe(true);
    const desc = out.split('\n')[2].replace('description: ', '');
    expect(desc.length).toBeGreaterThan(20);
  });

  it('excludes hidden entries and names whose module is not barrel-exported', () => {
    const out = build();
    expect(out).not.toContain('`Ghost`');
    expect(out).not.toContain('`Orphan`');
    expect(out).toContain('`Zed`');
    expect(out).toContain('`Beta`');
  });

  it('groups by category, sorted, one first-sentence line each', () => {
    const out = build();
    expect(out).toContain('- `Zed` — Zed does zed things.');
    expect(out).not.toContain('More detail here');
    expect(out.indexOf('`Alpha`')).toBeLessThan(out.indexOf('`Zed`'));
    expect(out.indexOf('### Core')).toBeLessThan(out.indexOf('### Forms'));
  });

  it('is independent of inventory order', () => {
    const m = fixtureManifest();
    m.componentInventory.reverse();
    expect(build({ manifest: m })).toBe(build());
  });

  it('contains every string from the shared layout recipe module', () => {
    const out = build();
    for (const s of [...layoutRecipeSteps, ...layoutNegativeRules]) expect(out).toContain(s);
  });

  it('lists root barrel and package subpaths, but not package.json', () => {
    const out = build();
    expect(out).toContain('`@hirobius/design-system/tokens`');
    expect(out).toContain('`@hirobius/design-system/styles.css`');
    expect(out).not.toContain('/package.json');
  });

  it('carries the do/dont rules from the docs', () => {
    const out = build();
    for (const s of ['data-hds', '--<prefix>-*', 'tenant overlay', 'upstream']) {
      expect(out).toContain(s);
    }
  });

  it('ends with a numbered step naming the lint plugin', () => {
    const out = build().trimEnd();
    const lines = out.split('\n');
    const lastNumbered = lines.filter((l) => /^\d+\. /.test(l)).pop();
    expect(lastNumbered).toContain('@hirobius/eslint-plugin-hds');
    expect(lines[lines.length - 1]).toBe(lastNumbered);
    expect(out).toContain(LINT_INSTALL_LINE);
  });

  it('lint install line points at the hds repo', () => {
    expect(LINT_INSTALL_LINE).toContain('github:hirobius/hds#path:/scripts/eslint-plugin-hds');
  });

  it('changes when a name is added to the inventory', () => {
    const m = fixtureManifest();
    m.componentInventory.push('Gamma');
    m.componentSpecs.Gamma = spec('src/app/components/gamma.tsx', 'Gamma is new.');
    const idx = `${fixtureIndex}\nexport * from './app/components/gamma';`;
    expect(build({ manifest: m, indexSource: idx })).not.toBe(build());
    expect(build({ manifest: m, indexSource: idx })).toContain('`Gamma`');
  });
});

describe('committed skills/hds-consumer/SKILL.md', () => {
  const manifest = JSON.parse(read('public/hds-manifest.json'));
  const expected = () =>
    buildConsumerSkill({
      manifest,
      indexSource: read('src/index.ts'),
      packageExports: JSON.parse(read('package.json')).exports,
    });

  it('equals the generator output on the real manifest and barrel', () => {
    expect(read(SKILL_PATH)).toBe(expected());
  });

  it('allow-list is non-hidden inventory intersected with barrel modules', () => {
    const index = read('src/index.ts');
    const modules = new Set(
      [...index.matchAll(/^export \* from '\.\/(app\/components\/[^']+)'/gm)].map((m) => m[1]),
    );
    const want = manifest.componentInventory.filter((n) => {
      const s = manifest.componentSpecs[n];
      return s && !s.hidden && modules.has(s.filePath.replace(/^src\//, '').replace(/\.tsx?$/, ''));
    });
    const listed = [...read(SKILL_PATH).matchAll(/^- `([A-Za-z0-9]+)` — /gm)].map((m) => m[1]);
    expect([...listed].sort()).toEqual([...want].sort());
    expect(listed).not.toContain('StackedCardRail');
    expect(listed).toContain('Tooltip');
  });

  it('lint install line appears verbatim in docs/CONSUMING.md', () => {
    expect(read('docs/CONSUMING.md')).toContain(LINT_INSTALL_LINE);
  });
});

describe('--check mode', () => {
  it('exits 0 on the committed file', () => {
    const r = spawnSync('node', ['scripts/generate-consumer-skill.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
  });

  it('fails after a hand edit to the file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skill-'));
    const p = join(dir, 'SKILL.md');
    writeFileSync(p, `${read(SKILL_PATH)}\nhand edit\n`);
    const r = spawnSync('node', ['scripts/generate-consumer-skill.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, HDS_SKILL_OUT: p },
    });
    expect(r.status).toBe(1);
  });

  it('fails when a component is added to the manifest without regenerating', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skill-'));
    const m = JSON.parse(read('public/hds-manifest.json'));
    m.componentInventory.push('BrandNewThing');
    m.componentSpecs.BrandNewThing = {
      ...spec('src/app/components/alert.tsx', 'Brand new.'),
    };
    const mp = join(dir, 'manifest.json');
    writeFileSync(mp, JSON.stringify(m));
    const r = spawnSync('node', ['scripts/generate-consumer-skill.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, HDS_SKILL_MANIFEST: mp },
    });
    expect(r.status).toBe(1);
  });
});
