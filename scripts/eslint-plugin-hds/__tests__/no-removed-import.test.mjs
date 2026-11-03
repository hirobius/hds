// @vitest-environment node
import { describe, expect, it } from 'vitest';
import rule, { isAtOrPast } from '../rules/no-removed-import.mjs';
import plugin from '../index.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-removed-import', rule, {
  valid: [
    // installed version below removeIn: a warning (no-deprecated-import), not an error
    {
      code: "import { MetricTile } from '@hirobius/design-system';",
      options: [{ version: '0.32.0' }],
    },
    { code: "import { Card } from '@hirobius/design-system';", options: [{ version: '9.0.0' }] },
    { code: "import { MetricTile } from 'other-lib';", options: [{ version: '9.0.0' }] },
    // default: the installed package's own version (pre-1.0 today)
    "import { MetricTile } from '@hirobius/design-system';",
    // StatusDot was removed in 0.21.0: an install older than that still has it
    {
      code: "import { StatusDot } from '@hirobius/design-system';",
      options: [{ version: '0.20.0' }],
    },
    // a removed name errors only at the entry point that removed it
    {
      code: "import { StatusDot } from '@hirobius/design-system/patterns';",
      options: [{ version: '0.32.0' }],
    },
  ],
  invalid: [
    {
      code: "import { MetricTile } from '@hirobius/design-system';",
      options: [{ version: '1.0.0' }],
      errors: [
        {
          messageId: 'removed',
          data: { name: 'MetricTile', removeIn: '1.0.0', version: '1.0.0', instead: '' },
        },
      ],
    },
    {
      code: "import { StatusTile as T, Card } from '@hirobius/design-system/patterns';",
      options: [{ version: '1.2.0' }],
      errors: [
        {
          messageId: 'removed',
          data: { name: 'StatusTile', removeIn: '1.0.0', version: '1.2.0', instead: ' Use Card.' },
        },
      ],
    },
    // the shipped deprecations.json removed list: StatusDot, removed in 0.21.0
    {
      code: "import { StatusDot } from '@hirobius/design-system';",
      options: [{ version: '0.32.0' }],
      errors: [
        {
          messageId: 'removed',
          data: { name: 'StatusDot', removeIn: '0.21.0', version: '0.32.0', instead: '' },
        },
      ],
    },
  ],
});

describe('isAtOrPast', () => {
  it('compares semver cores', () => {
    expect(isAtOrPast('1.0.0', '1.0.0')).toBe(true);
    expect(isAtOrPast('0.32.0', '1.0.0')).toBe(false);
    expect(isAtOrPast('0.40.1', '0.40.0')).toBe(true);
    expect(isAtOrPast('0.9.0', '0.10.0')).toBe(false);
    expect(isAtOrPast('1.0.0-next.1', '1.0.0')).toBe(false);
  });
});

describe('recommended config', () => {
  it('errors on hds/no-removed-import', () => {
    expect(plugin.configs.recommended[0].rules['hds/no-removed-import']).toBe('error');
  });
});
