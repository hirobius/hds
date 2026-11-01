/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Every spacing and radius value a design calls for has a semantic token, so
 * no designer or agent types a px value or reaches for a primitive step (the
 * hds/no-primitive-spacing lint bans those). A value counts only through a
 * live (not $deprecated) semantic token at the comfortable density.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkTokens, resolveAlias } from '../lib/token-tree.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

const SPACING_PX = [4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64];
const RADIUS_PX = [8, 12, 16, 24, 9999];

/** px → the live semantic token paths under `semantic.<group>` that resolve to it. */
function liveValues(group) {
  const byPx = new Map();
  for (const t of walkTokens(tokens.semantic[group], ['semantic', group])) {
    if (t.deprecated) continue;
    const v = resolveAlias(t.value, tokens);
    if (!v || typeof v !== 'object' || v.unit !== 'px') continue;
    if (!byPx.has(v.value)) byPx.set(v.value, []);
    byPx.get(v.value).push(t.path.join('.'));
  }
  return byPx;
}

describe('semantic token coverage', () => {
  it.each(SPACING_PX)('spacing %ipx has a live semantic token', (px) => {
    expect(liveValues('space').get(px) ?? []).not.toEqual([]);
  });

  it.each(RADIUS_PX)('radius %ipx has a live semantic token', (px) => {
    expect(liveValues('radius').get(px) ?? []).not.toEqual([]);
  });

  it('names the new steps on the existing ladders', () => {
    const fixed = Object.keys(tokens.semantic.space.fixed).filter((k) => !k.startsWith('$'));
    expect(fixed).toEqual(['2xs', 'xs', 'sm', 'md', 'lg', 'xl']);
    const radius = Object.keys(tokens.semantic.radius.scale).filter((k) => !k.startsWith('$'));
    expect(radius).toEqual(['sm', 'md', 'lg', 'xl', 'pill']);
  });
});
