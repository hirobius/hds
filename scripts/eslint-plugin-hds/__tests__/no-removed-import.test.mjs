// @vitest-environment node
import tsParser from '@typescript-eslint/parser';
import rule from '../rules/no-removed-import.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-removed-import', rule, {
  valid: [
    // a live export
    "import { Badge } from '@hirobius/design-system';",
    // the same name from another package is not HDS's removal
    "import { StatusDot } from 'some-other-lib';",
    // StatusDot was removed from the root entry only; the record does not
    // claim it for /patterns, so the rule stays silent there
    "import { StatusDot } from '@hirobius/design-system/patterns';",
  ],
  invalid: [
    {
      // the hds#469 fixture: a StatusDot import is flagged, with the
      // migration the 0.21.0 upgrade ledger recorded
      code: "import { StatusDot } from '@hirobius/design-system';",
      errors: [
        {
          messageId: 'removed',
          data: {
            name: 'StatusDot',
            from: '@hirobius/design-system',
            removedIn: '0.21.0',
            note: 'StatusDot and StatusDotProps are removed, so replace each <StatusDot tone size label> with <Badge dot tone size label> (BadgeProps for the type), moving any style to a wrapper element or a className first.',
          },
        },
      ],
    },
    {
      // a type-only import is an import: the name is just as gone
      code: "import type { StatusDotProps } from '@hirobius/design-system';",
      languageOptions: { parser: tsParser },
      errors: [
        {
          messageId: 'removed',
          data: {
            name: 'StatusDotProps',
            from: '@hirobius/design-system',
            removedIn: '0.21.0',
            note: 'StatusDot and StatusDotProps are removed, so replace each <StatusDot tone size label> with <Badge dot tone size label> (BadgeProps for the type), moving any style to a wrapper element or a className first.',
          },
        },
      ],
    },
    {
      // removed from both entries in 0.20.0: flagged at each
      code: "import { ActivityFeed } from '@hirobius/design-system/patterns';",
      errors: [
        {
          messageId: 'removed',
          data: {
            name: 'ActivityFeed',
            from: '@hirobius/design-system/patterns',
            removedIn: '0.20.0',
            note: 'ActivityFeed is removed with no drop-in replacement, so rewrite or delete the code that imports it.',
          },
        },
      ],
    },
  ],
});
