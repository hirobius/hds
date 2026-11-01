// @vitest-environment node
import { describe, expect, it } from 'vitest';
import rule from '../rules/no-deprecated-import.mjs';
import plugin from '../index.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-deprecated-import', rule, {
  valid: [
    "import { Card } from '@hirobius/design-system';",
    // same name from another package is not ours
    "import { MetricTile } from 'other-lib';",
  ],
  invalid: [
    {
      code: "import { MetricTile } from '@hirobius/design-system';",
      errors: [
        {
          messageId: 'deprecated',
          data: {
            name: 'MetricTile',
            removeIn: '1.0.0',
            note: 'No replacement planned: compose a Card with the type roles (caption label, display/title value).',
            instead: '',
          },
        },
      ],
    },
    {
      code: "import { MetricTiles as Row, Card } from '@hirobius/design-system/patterns';",
      errors: [{ messageId: 'deprecated' }],
    },
    {
      code: "import { CardMetricProps } from '@hirobius/design-system';",
      errors: [{ messageId: 'deprecated' }],
    },
  ],
});

describe('recommended config', () => {
  it('warns on hds/no-deprecated-import', () => {
    expect(plugin.configs.recommended[0].rules['hds/no-deprecated-import']).toBe('warn');
  });
});
