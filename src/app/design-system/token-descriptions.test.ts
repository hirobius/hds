/**
 * Export shape of /tokens and /tokens/descriptions: `tokens` carries values only,
 * `tokenDescriptions` maps dot paths to the prose that left it.
 */
import { describe, it, expect } from 'vitest';
import pkg from '../../../package.json';
import { tokens } from './tokens';
import { tokenDescriptions } from './token-descriptions';

describe('/tokens and /tokens/descriptions', () => {
  it('tokens carries values and no $description', () => {
    expect(tokens.semantic.accent.rest).toHaveProperty('$value');
    expect(JSON.stringify(tokens)).not.toContain('"$description"');
  });
  it('tokenDescriptions maps a token path to its description', () => {
    expect(typeof tokenDescriptions['semantic.accent.rest']).toBe('string');
    expect(tokenDescriptions['semantic.accent.rest'].length).toBeGreaterThan(0);
  });
  it('package.json exports ./tokens/descriptions', () => {
    expect(pkg.exports['./tokens/descriptions']).toEqual({
      types: './dist/types/src/app/design-system/token-descriptions.d.ts',
      import: './dist/token-descriptions.js',
      default: './dist/token-descriptions.js',
    });
  });
});
