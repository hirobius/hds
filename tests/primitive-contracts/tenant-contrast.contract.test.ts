/**
 * Contract test: per-tenant accent contrast
 *
 * Each tenant overlay (`tenants/<slug>/tokens.json`) re-points the accent
 * role to a brand-specific hue. `semantic.color.content.onAccent` (the fixed
 * white text/icon color used on accent surfaces — see button, badge "accent"
 * tone, etc.) is never overridden per tenant, so a brand's accent hue alone
 * can silently drop below WCAG AA without any per-tenant visual coverage
 * catching it. This asserts that pairing directly, per tenant, per mode.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveAlias } from '../../scripts/build-tokens.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const baseRaw = JSON.parse(readFileSync(resolve(ROOT, 'hirobius.tokens.json'), 'utf8'));

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((node, key) => node?.[key], obj);
}

// Same WCAG 2.1 §1.4.3 formula as scripts/check-contrast.mjs and
// validators/contrast.mjs — kept inline to stay independent of either.
function hexToLuminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hexA: string, hexB: string) {
  const L1 = hexToLuminance(hexA);
  const L2 = hexToLuminance(hexB);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

const AA_NORMAL = 4.5;

/** Resolve a DTCG leaf to a hex string for a given Figma variable mode. */
function resolveModeHex(node: any, mode: 'Light' | 'Dark', root: object) {
  const modeVal = node?.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node?.$value;
  const resolved = resolveAlias(modeVal, root);
  if (typeof resolved !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(resolved)) {
    throw new Error(`Could not resolve to a 6-digit hex, got: ${JSON.stringify(resolved)}`);
  }
  return resolved.toLowerCase();
}

const onAccentNode = getByPath(baseRaw, 'semantic.color.content.onAccent');

// Phase 1 pilot tenants (ISSUE-02 scope) — brutalist-demo is a dev fixture,
// not a real tenant, so it's excluded here.
const TENANTS = ['concrete-creations', 'lilac-bonds'] as const;

describe.each(TENANTS)('tenant contrast contract: %s', (slug) => {
  const overlay = JSON.parse(readFileSync(resolve(ROOT, 'tenants', slug, 'tokens.json'), 'utf8'));
  const accentNode = getByPath(overlay, 'semantic.color.surface.accent');

  it('overrides semantic.color.surface.accent', () => {
    expect(accentNode).toBeDefined();
  });

  it.each(['Light', 'Dark'] as const)(
    'content.onAccent / surface.accent clears WCAG AA (%s mode)',
    (mode) => {
      const onAccentHex = resolveModeHex(onAccentNode, mode, baseRaw);
      const accentHex = resolveModeHex(accentNode, mode, baseRaw);
      const ratio = contrastRatio(onAccentHex, accentHex);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    },
  );
});
