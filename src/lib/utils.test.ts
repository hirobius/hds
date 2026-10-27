import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { cn, SPACING_KEYS } from './utils';

const require = createRequire(import.meta.url);
const preset = require('../../tailwind.config.tokens.cjs') as {
  theme: { extend: { spacing: Record<string, string> } };
};

describe('cn spacing merge (hds#778)', () => {
  it('lets a consumer override replace a semantic spacing class', () => {
    expect(cn('pl-fixed-xs', 'px-6')).toBe('px-6');
    expect(cn('p-surface-padding', 'p-4')).toBe('p-4');
    expect(cn('gap-scale-xs', 'gap-4')).toBe('gap-4');
    expect(cn('-ml-scale-xs', '-ml-4')).toBe('-ml-4');
    expect(cn('px-4', 'px-fixed-sm')).toBe('px-fixed-sm');
  });

  it('keeps classes that only look alike', () => {
    expect(cn('px-fixed-xs', 'text-sm', 'py-scale-xs')).toBe('px-fixed-xs text-sm py-scale-xs');
  });

  it('knows every named spacing key of the Tailwind preset', () => {
    const named = Object.keys(preset.theme.extend.spacing).filter((k) => !/^\d+$/.test(k));
    expect([...SPACING_KEYS].sort()).toEqual(named.sort());
  });
});
