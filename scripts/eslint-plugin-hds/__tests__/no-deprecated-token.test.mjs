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
    'const x = hds.semantic.space.layout;',
    'const x = <div className="p-scale-sm gap-fixed-xs rounded-scale-md" />;',
    // a longer var that merely starts with a deprecated name
    'const x = "var(--semantic-space-layout-tight-x)";',
    // the primitive px6/px10 steps belong to hds/no-primitive-spacing
    'const x = "var(--primitive-space-px6)";',
    // Tailwind-shaped text outside className / cn is not a class
    "const label = 'p-layout-tight';",
  ],
  invalid: [
    {
      code: 'const x = "var(--semantic-space-layout-tight)";',
      errors: [
        {
          messageId: 'deprecated',
          data: {
            text: '--semantic-space-layout-tight',
            note: 'hds#206 — use semantic.space.scale.sm',
            removeIn: '1.0.0',
            fix: ' Use --semantic-space-scale-sm.',
          },
        },
      ],
    },
    {
      code: 'const x = <div style={{ gap: hds.semantic.space.layout.inset }} />;',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      code: 'const x = tokenRefs.semantic.typography.h1.fontSize;',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      code: 'const x = <div className="md:p-layout-tight rounded-scale-md" />;',
      errors: [
        {
          messageId: 'deprecated',
          data: {
            text: 'p-layout-tight',
            note: 'hds#206 — use semantic.space.scale.sm',
            removeIn: '1.0.0',
            fix: ' Use p-scale-sm.',
          },
        },
      ],
    },
    {
      code: 'const x = cn("gap-section-heroMax");',
      errors: [{ messageId: 'deprecated' }],
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
