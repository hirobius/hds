/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/figma-brand-modes.mjs — which tenants become Figma Brand modes.
 *
 * Seams: demoTenantProblems(metadata) and loadBrandModes(root, baseRaw) against
 * a temporary mini-root. Tenant slugs here are synthetic. The shared Figma
 * library must never carry a client tenant, so a tenant enters only when
 * figma/brand-modes.json lists it, its metadata marks it `"demo": true` (a
 * marker nothing writes by default) with tier 1 and empty deployment and legal
 * groups, and its overlay passes the tenant overlay validator.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { demoTenantProblems, loadBrandModes } from '../lib/figma-brand-modes.mjs';

const FIXTURE_TOKENS = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'figma-model',
  'tokens.json',
);

const demoMetadata = (slug, patch = {}) => ({
  slug,
  displayName: 'Synthetic Demo',
  demo: true,
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

/** A mini-root with the fixture tokens, the given tenants and (optionally) a brand-modes config. */
function miniRoot({ config, tenants = {} }) {
  const root = mkdtempSync(join(tmpdir(), 'hds-brand-modes-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS, join(root, 'hirobius.tokens.json'));
  for (const [slug, { metadata, overlay }] of Object.entries(tenants)) {
    mkdirSync(join(root, 'tenants', slug), { recursive: true });
    if (metadata)
      writeFileSync(join(root, 'tenants', slug, 'metadata.json'), JSON.stringify(metadata));
    if (overlay) writeFileSync(join(root, 'tenants', slug, 'tokens.json'), JSON.stringify(overlay));
  }
  if (config !== undefined) {
    mkdirSync(join(root, 'figma'), { recursive: true });
    writeFileSync(join(root, 'figma', 'brand-modes.json'), JSON.stringify(config));
  }
  const baseRaw = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));
  return { root, load: (options) => loadBrandModes(root, baseRaw, options) };
}

/** What `pnpm scaffold:tenant --slug=<client>` writes for a new tier 1 client (scripts/scaffold-tenant.mjs buildMetadata). */
const scaffoldedClientMetadata = (slug) => ({
  slug,
  displayName: 'Synthetic Client',
  tier: 1,
  deployment: { vercelProject: null, primaryDomain: null, previewDomain: null },
  brand: { primaryHex: '#123456', accentName: 'brand-accent', logoPath: null },
  legal: { entity: null, jurisdiction: null, stripeAccountKind: null },
  status: 'scaffold',
});

describe('demoTenantProblems', () => {
  it('accepts a tenant marked demo, tier 1, with empty deployment and legal groups', () => {
    expect(demoTenantProblems(demoMetadata('a-demo'))).toEqual([]);
  });

  it('rejects a freshly scaffolded tier 1 client: only the explicit demo marker admits a tenant', () => {
    expect(demoTenantProblems(scaffoldedClientMetadata('new-client'))).toEqual([
      'demo is not true',
    ]);
    expect(demoTenantProblems({ ...demoMetadata('a-demo'), demo: 'yes' })).toEqual([
      'demo is not true',
    ]);
  });

  it('treats a missing deployment or legal group as a problem, not as empty', () => {
    const { deployment: _deployment, legal: _legal, ...bare } = demoMetadata('a-demo');
    expect(demoTenantProblems(bare)).toEqual(['deployment is missing', 'legal is missing']);
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
  ])('rejects a tenant with %s, naming the field but never its value', (_label, patch, field) => {
    const problems = demoTenantProblems(demoMetadata('a-demo', patch));
    expect(problems.join('\n')).toContain(field);
    expect(problems.join('\n')).not.toMatch(/X LLC|x\.example|: x\b/);
  });

  it('rejects a tenant with no metadata', () => {
    expect(demoTenantProblems(null)).toEqual(['it has no metadata.json']);
  });
});

describe('loadBrandModes', () => {
  it('returns null when figma/brand-modes.json does not exist', () => {
    expect(miniRoot({}).load()).toBeNull();
  });

  it('returns the listed demo tenants, in config order, and nothing else', () => {
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

  it('refuses a listed tenant that looks like a client, before reading its overlay', () => {
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
      /live-tenant.*deployment\.vercelProject.*demo tenants only/s,
    );
    expect(calls).toEqual([]);
  });

  it('refuses a listed tenant with the scaffolder default metadata, so listing a new client by mistake fails', () => {
    const { load } = miniRoot({
      config: { baseMode: 'Hirobius', tenants: ['new-client'] },
      tenants: {
        'new-client': { metadata: scaffoldedClientMetadata('new-client'), overlay: radiusOverlay },
      },
    });
    expect(() => load()).toThrow(/new-client.*demo is not true.*demo tenants only/s);
  });

  it('runs the tenant overlay validator and refuses an overlay it rejects', () => {
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

  it('reports every problem at once: missing tenant, bad slug, slug mismatch', () => {
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
    expect(message).toMatch(/tenants\/gone-demo\/tokens\.json does not exist/);
    expect(message).toMatch(/"_template" is not a tenant slug/);
    expect(message).toMatch(/tenants\/moved-demo\/metadata\.json.*slug/);
  });

  it('refuses a config without a base mode or a tenant list', () => {
    expect(() => miniRoot({ config: { tenants: [] } }).load()).toThrow(/baseMode/);
    expect(() => miniRoot({ config: { baseMode: 'Hirobius' } }).load()).toThrow(/tenants/);
  });
});
