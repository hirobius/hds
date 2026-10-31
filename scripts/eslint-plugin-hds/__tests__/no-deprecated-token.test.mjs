// @vitest-environment node
import { describe, expect, it } from 'vitest';
import rule from '../rules/no-deprecated-token.mjs';
import plugin from '../index.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-deprecated-token', rule, {
  valid: [
    'const x = "var(--semantic-space-scale-sm)";',
    'const x = hds.semantic.space.scale.sm;',
    'const x = hds.semantic.space.section;',
    'const x = <div className="p-scale-sm gap-fixed-xs rounded-scale-md" />;',
    // a longer var that merely starts with a deprecated name
    'const x = "var(--semantic-space-section-heroMax-x)";',
    // only a composite's sub-vars share its note
    'const x = "var(--semantic-space-section-heroMax-font-size)".length;',
    // px6/px10 are kept primitive steps, not deprecated ones (hds/no-primitive-spacing reports them)
    'const x = "var(--primitive-space-px6)";',
    // Tailwind-shaped text outside className / cn is not a class
    "const label = 'p-section-heroMax';",
  ],
  invalid: [
    {
      code: 'const x = "var(--semantic-space-section-heroMax)";',
      errors: [
        {
          messageId: 'deprecated',
          data: {
            text: '--semantic-space-section-heroMax',
            note: '2026-10 zero-use audit, removed in 1.0.0 — use semantic.space.section.inset (96px)',
            fix: ' Use --semantic-space-section-inset.',
          },
        },
      ],
    },
    {
      code: 'const x = <div style={{ gap: hds.semantic.space.section.heroMax }} />;',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      code: 'const x = tokenRefs.semantic.typography.h1.fontSize;',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      code: 'const x = <div className="md:py-section-heroMax rounded-scale-md" />;',
      errors: [
        {
          messageId: 'deprecated',
          data: {
            text: 'py-section-heroMax',
            note: '2026-10 zero-use audit, removed in 1.0.0 — use semantic.space.section.inset (96px)',
            fix: ' Use py-section-inset.',
          },
        },
      ],
    },
    {
      code: 'const x = cn("gap-section-heroMax");',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      // a composite's sub-var names the replacement's sub-var
      code: 'const x = "var(--semantic-typography-h1-font-size)";',
      errors: [
        {
          messageId: 'deprecated',
          data: {
            text: '--semantic-typography-h1-font-size',
            note: 'hds#483, removed in 1.0.0 — use semantic.typography.title',
            fix: ' Use --semantic-typography-title-font-size.',
          },
        },
      ],
    },
    {
      // no single replacement: the note says what to do
      code: 'const x = "var(--component-badge-bg)";',
      errors: [{ messageId: 'deprecated' }],
    },
  ],
});

describe('hds/recommended', () => {
  it('makes a deprecated token an error', () => {
    expect(plugin.configs.recommended[0].rules['hds/no-deprecated-token']).toBe('error');
  });
});
