/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The Brand and Density collections this repo actually builds: from
 * hirobius.tokens.json, figma/brand-modes.json and tenants/*.
 *
 * Expectations come from the tenant files, read here without the exporter.
 * Tenant slugs and names are read at run time and never written into this
 * file: the point of the last checks is that tenants the config does not list
 * leave no trace in the Figma model.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { BRAND_MODES_FILE, demoTenantProblems } from '../lib/figma-brand-modes.mjs';
import { PRO_MODE_LIMIT } from '../lib/figma-model-invariants.mjs';
import { hdsRunPush } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { createFakeFigma } from './helpers/fake-figma.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

const config = readJson(BRAND_MODES_FILE);
const raw = readJson('hirobius.tokens.json');
const { model } = loadFigmaInputs(ROOT);
const brand = model.collections.find((c) => c.key === 'brand');
const variableByPath = new Map(
  model.collections.flatMap((c) => c.variables.map((v) => [v.path, v])),
);

const tenantDirs = readdirSync(join(ROOT, 'tenants'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name);
const unlisted = tenantDirs.filter((slug) => !config.tenants.includes(slug));

const leavesOf = (overlay) => {
  const leaves = [];
  (function walk(node, path) {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      leaves.push({
        path: path.join('.'),
        value: node.$value,
        modes: node.$extensions?.['com.figma.variables']?.modes ?? {},
      });
      return;
    }
    for (const [key, child] of Object.entries(node))
      if (!key.startsWith('$')) walk(child, [...path, key]);
  })(overlay, []);
  return leaves;
};

describe(`${BRAND_MODES_FILE}`, () => {
  it('lists at least one tenant, and only demo tenants', () => {
    expect(config.tenants.length).toBeGreaterThan(0);
    for (const slug of config.tenants) {
      expect(demoTenantProblems(readJson('tenants', slug, 'metadata.json')), slug).toEqual([]);
    }
  });

  it(`gives Hirobius/Brand the base mode plus one mode per listed tenant, at most ${PRO_MODE_LIMIT}`, () => {
    expect(brand.modes).toEqual([config.baseMode, ...config.tenants]);
    expect(brand.modes.length).toBeLessThanOrEqual(PRO_MODE_LIMIT);
  });

  it('carries every listed tenant override as that tenant Brand mode value, and the token variable follows it', () => {
    let checked = 0;
    for (const slug of config.tenants) {
      for (const leaf of leavesOf(readJson('tenants', slug, 'tokens.json'))) {
        if (!variableByPath.has(leaf.path)) continue; // declared not in Figma
        const variants = brand.variables.filter(
          (v) => v.path === `brand.${leaf.path}` || v.path.startsWith(`brand.${leaf.path}.`),
        );
        expect(variants.length, leaf.path).toBeGreaterThan(0);
        for (const v of variants) {
          const variant = v.path.slice(`brand.${leaf.path}.`.length) || null;
          const ref =
            variant === 'Compact' || variant === 'Dark'
              ? (leaf.modes[variant] ?? leaf.value)
              : (leaf.modes.Light ?? leaf.value);
          const entry = v.valuesByMode[slug];
          if (typeof ref === 'string' && ref.startsWith('{')) {
            expect(entry, v.path).toEqual({ alias: ref.slice(1, -1) });
          } else if (ref?.unit === 'px') {
            expect(entry, v.path).toEqual({ value: ref.value });
          } else {
            expect(entry, v.path).toHaveProperty('value');
          }
          checked++;
        }
        for (const entry of Object.values(variableByPath.get(leaf.path).valuesByMode)) {
          expect(entry.alias, leaf.path).toMatch(/^(brand|density)\./);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('adds no mention of any unlisted tenant to the model', () => {
    const count = (text, needle) => text.split(needle).length - 1;
    const withBrands = JSON.stringify(model);
    const withoutBrands = JSON.stringify(buildFigmaModel(raw));
    unlisted.forEach((slug, i) => {
      const metadataPath = join(ROOT, 'tenants', slug, 'metadata.json');
      const needles = [slug];
      if (existsSync(metadataPath))
        needles.push(readJson('tenants', slug, 'metadata.json').displayName);
      for (const needle of needles.filter(Boolean)) {
        expect(count(withBrands, needle), `unlisted tenant #${i}`).toBe(
          count(withoutBrands, needle),
        );
      }
    });
    for (const c of model.collections) {
      expect(
        c.modes.filter((mode) => unlisted.includes(mode)),
        c.name,
      ).toEqual([]);
    }
  });

  it('pushes into an empty file and converges to zero changes', async () => {
    const fonts = [...new Set(model.textStyles.map((s) => `${s.fontFamily}|${s.fontStyle}`))].map(
      (key) => ({ family: key.split('|')[0], style: key.split('|')[1] }),
    );
    const figma = createFakeFigma({ fonts: [{ family: 'Inter', style: 'Regular' }, ...fonts] });
    const run = async () => {
      const { payload, checksum } = buildPushPayload(model);
      return hdsRunPush(figma, payload, checksum);
    };
    const first = await run();
    expect(first.summary.variables.created).toBe(variableByPath.size);
    expect((await run()).line).toBe('updated 0 · created 0 · deleted 0');
  });
});
