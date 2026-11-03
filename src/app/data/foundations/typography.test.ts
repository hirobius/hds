import { describe, expect, it } from 'vitest';
import typography from './typography.json';

// hds#483: the docs data teaches the role ramp, never the deprecated aliases,
// so the aliases can be removed in 1.0.0 without stale guidance.
const DEPRECATED =
  /typography\.(h1|h2|h3|eyebrow)\b|typeStyles\.(h1|h2|h3|small|eyebrow)\b|typography[./\/](small)\b|typography\/(h1|h2|h3|eyebrow)\b/;

describe('typography foundation data', () => {
  it('references no deprecated type-ramp alias', () => {
    const hits = JSON.stringify(typography, null, 1)
      .split('\n')
      .filter((line) => DEPRECATED.test(line));
    expect(hits).toEqual([]);
  });

  it('maps the title role', () => {
    expect(typography.mappings.map((m) => m.token)).toContain('semantic.typography.title');
  });
});
