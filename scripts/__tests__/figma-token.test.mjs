/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/figma-token.mjs.
 *
 * The bug this module fixes: the repo read only FIGMA_ACCESS_TOKEN while the
 * environment supplied FIGMA_API_KEY, so authenticated Figma commands reported
 * "not set" with a working token present.
 */

import { describe, it, expect } from 'vitest';
import {
  figmaToken,
  figmaTokenSource,
  missingTokenMessage,
  TOKEN_VARS,
} from '../lib/figma-token.mjs';

describe('figmaToken', () => {
  it('reads FIGMA_ACCESS_TOKEN', () => {
    expect(figmaToken({ FIGMA_ACCESS_TOKEN: 'a' })).toBe('a');
  });

  it('reads FIGMA_API_KEY — the name actually set in this environment', () => {
    expect(figmaToken({ FIGMA_API_KEY: 'b' })).toBe('b');
    expect(figmaTokenSource({ FIGMA_API_KEY: 'b' })).toBe('FIGMA_API_KEY');
  });

  it('prefers FIGMA_ACCESS_TOKEN when both are set, so an explicit override wins', () => {
    const env = { FIGMA_API_KEY: 'inherited', FIGMA_ACCESS_TOKEN: 'explicit' };
    expect(figmaToken(env)).toBe('explicit');
    expect(figmaTokenSource(env)).toBe('FIGMA_ACCESS_TOKEN');
  });

  it('treats blank and whitespace-only as unset, and trims what it returns', () => {
    expect(figmaToken({ FIGMA_ACCESS_TOKEN: '' })).toBeNull();
    expect(figmaToken({ FIGMA_ACCESS_TOKEN: '   ' })).toBeNull();
    expect(figmaToken({ FIGMA_ACCESS_TOKEN: ' tok \n' })).toBe('tok');
  });

  it('falls through a blank first variable to a set second one', () => {
    expect(figmaToken({ FIGMA_ACCESS_TOKEN: '  ', FIGMA_API_KEY: 'b' })).toBe('b');
  });

  it('returns null and no source when nothing is set', () => {
    expect(figmaToken({})).toBeNull();
    expect(figmaTokenSource({})).toBeNull();
  });
});

describe('missingTokenMessage', () => {
  it('names every accepted variable, so nobody sets the wrong one again', () => {
    const message = missingTokenMessage('pnpm figma:inventory --fetch');
    for (const name of TOKEN_VARS) expect(message).toContain(name);
  });

  it('names the command and the remote-session gotcha', () => {
    const message = missingTokenMessage('pnpm figma:inventory --fetch');
    expect(message).toContain('pnpm figma:inventory --fetch');
    expect(message).toMatch(/freshly started container/);
  });
});
