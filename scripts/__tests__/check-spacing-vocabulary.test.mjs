/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-spacing-vocabulary.mjs (hds#206).
 *
 * All tests operate purely in memory — no filesystem reads or writes.
 */

import { describe, it, expect } from 'vitest';
import { findViolationsInText, SPACING_KEYS } from '../check-spacing-vocabulary.mjs';

describe('SPACING_KEYS', () => {
  it('covers the full box-sx.ts spacing shorthand set', () => {
    for (const key of ['p', 'm', 'gap', 'px', 'py', 'mx', 'my', 'rowGap', 'columnGap']) {
      expect(SPACING_KEYS.has(key)).toBe(true);
    }
  });
});

describe('findViolationsInText', () => {
  it('flags a raw integer on p inside sx={{ ... }}', () => {
    const text = `<Box sx={{ p: 2, bgcolor: 'surface.raised' }} />`;
    const violations = findViolationsInText(text, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'fake.tsx', key: 'p', value: '2' });
  });

  it('flags multiple spacing keys on the same line', () => {
    const text = `<Box sx={{ p: 2, gap: 4, mt: 9 }} />`;
    const violations = findViolationsInText(text, 'fake.tsx');
    expect(violations.map((v) => v.key)).toEqual(['p', 'gap', 'mt']);
  });

  it('flags across a multi-line sx object literal', () => {
    const text = [
      '<Box',
      '  sx={{',
      '    p: 6,',
      "    bgcolor: 'surface.raised',",
      '  }}',
      '/>',
    ].join('\n');
    const violations = findViolationsInText(text, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(3);
  });

  it('does not flag string values (already named)', () => {
    const text = `<Box sx={{ p: 'md', gap: 'var(--semantic-space-scale-sm)' }} />`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('does not flag numeric literals outside an sx object', () => {
    const text = `<StepperField min={1} max={99} step={1} />`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('does not flag padding/gap style-object props (covered by check-hardcoded-spacing)', () => {
    const text = `<div style={{ padding: 16, gap: 24 }} />`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('honors // spacing-vocab-ok: <reason> on the same line', () => {
    const text = `<Box sx={{ p: 2 }} /> // spacing-vocab-ok: intentional legacy exception`;
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });

  it('honors // spacing-vocab-ok: <reason> on the preceding line', () => {
    const text = [
      '// spacing-vocab-ok: intentional legacy exception',
      '<Box sx={{ p: 2 }} />',
    ].join('\n');
    expect(findViolationsInText(text, 'fake.tsx')).toHaveLength(0);
  });
});
