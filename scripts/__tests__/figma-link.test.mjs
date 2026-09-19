/**
 * Tests for scripts/lib/figma-link.mjs — how generate-manifest.mjs resolves a
 * componentSpec's `figmaLink` and reports how many specs really link to Figma.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { figmaLinkCoverage, resolveFigmaLink } from '../lib/figma-link.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE_URL = 'https://www.figma.com/design/AbC123/HDS?node-id=1-2';

describe('resolveFigmaLink', () => {
  it('returns the first real Figma URL among the candidates', () => {
    expect(resolveFigmaLink(null, NODE_URL, 'https://www.figma.com/design/other')).toBe(NODE_URL);
  });

  it('returns null when no candidate is a URL, instead of inventing a placeholder', () => {
    expect(resolveFigmaLink(undefined, null, undefined)).toBeNull();
  });

  it('drops a legacy TODO:hds-master placeholder so it cannot survive a regen', () => {
    expect(resolveFigmaLink('TODO:hds-master:Button', null, null)).toBeNull();
    expect(resolveFigmaLink('TODO:hds-master:Button', NODE_URL)).toBe(NODE_URL);
  });

  it('rejects strings that are not http(s) Figma URLs', () => {
    expect(resolveFigmaLink('', 'FIGMA_NODE_URL', 'https://example.com/figma')).toBeNull();
  });
});

describe('figmaLinkCoverage', () => {
  it('counts only specs whose figmaLink is a real Figma URL', () => {
    const coverage = figmaLinkCoverage({
      Button: { figmaLink: NODE_URL },
      Badge: { figmaLink: 'TODO:hds-master:Badge' },
      Card: { figmaLink: null },
      Tag: {},
    });
    expect(coverage).toEqual({ linked: 1, total: 4, percent: 25 });
  });

  it('reports 0% (not NaN) for an empty spec map', () => {
    expect(figmaLinkCoverage({})).toEqual({ linked: 0, total: 0, percent: 0 });
  });
});

describe('public/hds-manifest.json', () => {
  it('carries no placeholder figmaLink values', () => {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, 'public', 'hds-manifest.json'), 'utf8'),
    );
    const placeholders = Object.entries({ ...manifest.componentSpecs, ...manifest.utilities })
      .filter(([, spec]) => spec.figmaLink != null && resolveFigmaLink(spec.figmaLink) === null)
      .map(([name, spec]) => `${name}: ${spec.figmaLink}`);
    expect(placeholders).toEqual([]);
  });
});
