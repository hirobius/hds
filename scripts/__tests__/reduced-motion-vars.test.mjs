/**
 * hds#751: the duration vars check-reduced-motion requires are derived from the
 * tokens, so a new duration token cannot ship without its reduced-motion zero.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { requiredDurationVars } from '../lib/reduced-motion-vars.mjs';

const tokens = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));

describe('requiredDurationVars', () => {
  it('lists every primitive duration and every motion role duration', () => {
    const vars = requiredDurationVars(tokens);
    for (const name of ['instant', 'short', 'medium', 'long', 'stagger', 'extended']) {
      expect(vars).toContain(`--primitive-duration-${name}`);
    }
    for (const role of ['productive', 'expressive', 'spatial', 'exit']) {
      expect(vars).toContain(`--hds-motion-${role}-duration`);
    }
  });

  it('adds a new duration token without a code change', () => {
    const next = structuredClone(tokens);
    next.primitive.duration.glacial = { $value: { value: 900, unit: 'ms' } };
    expect(requiredDurationVars(next)).toContain('--primitive-duration-glacial');
  });

  it('skips non-duration semantic motion tokens', () => {
    const vars = requiredDurationVars(tokens);
    expect(vars).not.toContain('--hds-motion-nudge-duration');
    expect(vars).not.toContain('--hds-motion-distance-duration');
  });
});

describe('check-reduced-motion on the repo', () => {
  it('passes: theme.css zeroes every derived duration', () => {
    expect(() =>
      execFileSync('node', ['scripts/check-reduced-motion.mjs'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});
