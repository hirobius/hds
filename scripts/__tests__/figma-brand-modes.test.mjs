/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/figma-brand-modes.mjs — which directions become Figma Brand modes.
 *
 * Seams: directionProblems(metadata) and loadBrandModes(root, baseRaw) against
 * a temporary mini-root. Slugs here are synthetic. The shared Figma library
 * must never carry a client's brand, so a direction enters only when
 * figma/brand-modes.json lists it, it lives under directions/ (ADR-035: a
 * direction is a shared art direction, never a client), its metadata keeps the
 * deployment and legal groups empty at tier 1, and its overlay passes the
 * overlay validator.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { directionProblems, loadBrandModes } from '../lib/figma-brand-modes.mjs';

const FIXTURE_TOKENS = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'figma-model',
  'tokens.json',
);

const demoMetadata = (slug, patch = {}) => ({
  slug,
  displayName: 'Synthetic Demo',
  tier: 1,
  deployment: { vercelProject: null, primaryDomain: null, previewDomain: null },
  brand: { primaryHex: '#111111', accentName: 'ink', logoPath: null },
  legal: { entity: null, jurisdiction: null, stripeAccountKind: null },
  status: 'scaffold',
  ...patch,
});
const radiusOverlay = {
  role: { radius: { $type: 'dimension', $value: { value: 0, unit: 'px' } } },
};

let dirs = [];
afterEach(() => {
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});

/** A mini-root with the fixture tokens, the given directions and (optionally) a brand-modes config. */
function miniRoot({ config, tenants = {} }) {
  const root = mkdtempSync(join(tmpdir(), 'hds-brand-modes-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS, join(root, 'hirobius.tokens.json'));
  for (const [slug, { metadata, overlay }] of Object.entries(tenants)) {
    mkdirSync(join(root, 'directions', slug), { recursive: true });
    if (metadata)
      writeFileSync(join(root, 'directions', slug, 'metadata.json'), JSON.stringify(metadata));
    if (overlay)
      writeFileSync(join(root, 'directions', slug, 'tokens.json'), JSON.stringify(overlay));
  }
  if (config !== undefined) {
    mkdirSync(join(root, 'figma'), { recursive: true });
    writeFileSync(join(root, 'figma', 'brand-modes.json'), JSON.stringify(config));
  }
  const baseRaw = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));
  return { root, load: (options) => loadBrandModes(root, baseRaw, options) };
}

/** What a client's brand metadata looks like (a deployment and a legal entity): never a direction. */
const clientMetadata = (slug) => ({
  slug,
  displayName: 'Synthetic Client',
  tier: 2,
  deployment: { vercelProject: 'synthetic', primaryDomain: null, previewDomain: null },
  brand: { primaryHex: '#123456', accentName: 'brand-accent', logoPath: null },
  legal: { entity: 'Synthetic LLC', jurisdiction: null, stripeAccountKind: null },
  status: 'scaffold',
});

describe('directionProblems', () => {
  it('accepts a direction at tier 1 with empty deployment and legal groups', () => {
    expect(directionProblems(demoMetadata('a-demo'))).toEqual([]);
  });

  it('ignores the retired demo marker either way: the directions/ folder is the statement', () => {
    expect(directionProblems({ ...demoMetadata('a-demo'), demo: true })).toEqual([]);
    expect(directionProblems({ ...demoMetadata('a-demo'), demo: false })).toEqual([]);
  });

  it('rejects metadata shaped like a client, naming every field that gives it away', () => {
    expect(directionProblems(clientMetadata('new-client'))).toEqual([
      'deployment.vercelProject is set',
      'legal.entity is set',
      'tier is not 1',
    ]);
  });

  it('treats a missing deployment or legal group as a problem, not as empty', () => {
    const { deployment: _deployment, legal: _legal, ...bare } = demoMetadata('a-demo');
    expect(directionProblems(bare)).toEqual(['deployment is missing', 'legal is missing']);
  });

  it.each([
    [
      'a Vercel project',
      { deployment: { vercelProject: 'x', primaryDomain: null } },
      'deployment.vercelProject',
    ],
    [
      'a preview domain',
      { deployment: { previewDomain: 'x.example' } },
      'deployment.previewDomain',
    ],
    ['a legal entity', { legal: { entity: 'X LLC' } }, 'legal.entity'],
    ['a tier above 1', { tier: 2 }, 'tier'],
  ])(
    'rejects a direction with %s, naming the field but never its value',
    (_label, patch, field) => {
      const problems = directionProblems(demoMetadata('a-demo', patch));
      expect(problems.join('\n')).toContain(field);
      expect(problems.join('\n')).not.toMatch(/X LLC|x\.example|: x\b/);
    },
  );

  it('rejects a direction with no metadata', () => {
    expect(directionProblems(null)).toEqual(['it has no metadata.json']);
  });
});

describe('loadBrandModes', () => {
  it('returns null when figma/brand-modes.json does not exist', () => {
    expect(miniRoot({}).load()).toBeNull();
  });

  it('returns the listed directions, in config order, and nothing else', () => {
    const { load } = miniRoot({
      config: { baseMode: 'Hirobius', tenants: ['b-demo', 'a-demo'] },
      tenants: {
        'a-demo': { metadata: demoMetadata('a-demo'), overlay: radiusOverlay },
        'b-demo': { metadata: demoMetadata('b-demo'), overlay: radiusOverlay },
        'unlisted-tenant': {
          metadata: demoMetadata('unlisted-tenant', { tier: 2 }),
          overlay: radiusOverlay,
        },
      },
    });
    expect(load()).toEqual({
      baseMode: 'Hirobius',
      tenants: [
        { slug: 'b-demo', overlay: radiusOverlay },
        { slug: 'a-demo', overlay: radiusOverlay },
      ],
    });
  });

  it('refuses a listed direction that looks like a client, before reading its overlay', () => {
    const calls = [];
    const { load } = miniRoot({
      config: { baseMode: 'Hirobius', tenants: ['live-tenant'] },
      tenants: {
        'live-tenant': {
          metadata: demoMetadata('live-tenant', { deployment: { vercelProject: 'live' } }),
          overlay: radiusOverlay,
        },
      },
    });
    expect(() => load({ validateOverlay: (...args) => calls.push(args) && [] })).toThrow(
      /live-tenant.*deployment\.vercelProject.*directions only/s,
    );
    expect(calls).toEqual([]);
  });

  it('refuses a listed slug whose metadata is a client (a deployment, a legal entity), so a client filed under directions/ by mistake still fails', () => {
    const { load } = miniRoot({
      config: { baseMode: 'Hirobius', tenants: ['new-client'] },
      tenants: {
        'new-client': { metadata: clientMetadata('new-client'), overlay: radiusOverlay },
      },
    });
    expect(() => load()).toThrow(/new-client.*legal\.entity is set.*directions only/s);
  });

  it('runs the overlay validator and refuses an overlay it rejects', () => {
    const { load } = miniRoot({
      config: { baseMode: 'Hirobius', tenants: ['bad-demo'] },
      tenants: {
        'bad-demo': {
          metadata: demoMetadata('bad-demo'),
          overlay: {
            primitive: { space: { $type: 'dimension', 2: { $value: { value: 1, unit: 'px' } } } },
          },
        },
      },
    });
    expect(() => load()).toThrow(/R1 \[bad-demo:primitive\.space\.2\]/);
  });

  it('reports every problem at once: missing direction, bad slug, slug mismatch', () => {
    const { load } = miniRoot({
      config: { baseMode: 'Hirobius', tenants: ['gone-demo', '_template', 'moved-demo'] },
      tenants: {
        'moved-demo': { metadata: demoMetadata('other-slug'), overlay: radiusOverlay },
      },
    });
    let message = '';
    try {
      load();
    } catch (error) {
      message = error.message;
    }
    expect(message).toMatch(/directions\/gone-demo\/tokens\.json does not exist/);
    expect(message).toMatch(/"_template" is not a direction slug/);
    expect(message).toMatch(/directions\/moved-demo\/metadata\.json.*slug/);
  });

  it('refuses a config without a base mode or a tenant list', () => {
    expect(() => miniRoot({ config: { tenants: [] } }).load()).toThrow(/baseMode/);
    expect(() => miniRoot({ config: { baseMode: 'Hirobius' } }).load()).toThrow(/tenants/);
  });
});
