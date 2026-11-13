// @vitest-environment node
/**
 * Byte pass (2026-11-13): motion-tokens reads four durations. Importing the
 * whole `tokenValues` tree put every primitive (colours, type, sizes; about
 * 2 kB gzip) into Button's graph, because an object literal never tree-shakes.
 * The generator emits the duration group as its own export, so motion-tokens
 * imports only `primitiveDuration`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as values from '../generated-token-values';

const src = readFileSync(resolve(__dirname, '../motion-tokens.ts'), 'utf8');

describe('motion-tokens reads only the duration group', () => {
  it('imports primitiveDuration, never the whole tokenValues tree', () => {
    expect(src).toMatch(/import \{ primitiveDuration \} from '\.\/generated-token-values'/);
    expect(src).not.toMatch(/\btokenValues\b/);
  });

  it('emits the duration group as its own export, the same object tokenValues holds', () => {
    expect(values.primitiveDuration).toBe(values.tokenValues.primitive.duration);
    expect(values.primitiveDuration.short).toBe('150ms');
  });
});
