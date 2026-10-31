// @vitest-environment node
import rule from '../rules/no-deprecated-import.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-deprecated-import', rule, {
  valid: [
    // a live export
    "import { Button } from '@hirobius/design-system';",
    // the same names from another package are not HDS's deprecations
    "import { Stat, StatusTile } from 'some-other-lib';",
    // a relative import inside the repo is not a consumer import
    "import { Stat } from '../app/components/stat';",
    // a type that is not deprecated
    "import { ButtonProps } from '@hirobius/design-system';",
  ],
  invalid: [
    {
      code: "import { Stat } from '@hirobius/design-system';",
      errors: [
        {
          messageId: 'deprecated',
          data: {
            name: 'Stat',
            notice:
              'No replacement planned: compose a Card with the type roles (caption label, display/title value).',
            removeIn: '1.0.0',
            fix: '',
          },
        },
      ],
    },
    {
      // aliased on import: the imported name is what is deprecated
      code: "import { StatusTile as Tile } from '@hirobius/design-system';",
      errors: [
        {
          messageId: 'deprecated',
          data: {
            name: 'StatusTile',
            notice:
              'Compose a Card instead, with the same content and surface (hds#622): `<Card padding="item" className="border-0"><Card.Row trailing={trailing}><Card.RowTitle>{title}</Card.RowTitle>{notes.map((note) => <Card.RowNote key={note}>{note}</Card.RowNote>)}</Card.Row></Card>`. Drop `tone`: StatusTile never painted it, and Card\'s `tone` paints a border.',
            removeIn: '1.0.0',
            fix: ' Use Card instead.',
          },
        },
      ],
    },
    {
      // a deprecated export from the patterns entry is flagged there too
      code: "import { MetricTile } from '@hirobius/design-system/patterns';",
      errors: [
        {
          messageId: 'deprecated',
          data: {
            name: 'MetricTile',
            notice:
              'No replacement planned: compose a Card with the type roles (caption label, display/title value).',
            removeIn: '1.0.0',
            fix: '',
          },
        },
      ],
    },
    {
      // one report per deprecated specifier, live ones pass
      code: "import { Button, Stat, CardMetric } from '@hirobius/design-system';",
      errors: [
        {
          messageId: 'deprecated',
          data: {
            name: 'Stat',
            notice:
              'No replacement planned: compose a Card with the type roles (caption label, display/title value).',
            removeIn: '1.0.0',
            fix: '',
          },
        },
        {
          messageId: 'deprecated',
          data: {
            name: 'CardMetric',
            notice:
              'No replacement planned: compose a Card with the type roles (caption label, display/title value).',
            removeIn: '1.0.0',
            fix: '',
          },
        },
      ],
    },
  ],
});
