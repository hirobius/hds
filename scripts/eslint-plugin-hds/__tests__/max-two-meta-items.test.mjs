// @vitest-environment node
import rule from '../rules/max-two-meta-items.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('max-two-meta-items', rule, {
  valid: [
    'const x = <p>Acme Cloud · Remote</p>;',
    'const x = <p>Remote</p>;',
    'const x = <MetaLine items={["Acme Cloud", "Remote"]} />;',
    'const x = <p>{a} · {b}</p>;',
    'const x = <p>{"Acme"}</p>;',
  ],
  invalid: [
    {
      code: 'const x = <p>Acme Cloud · Remote · Applied 3 days ago</p>;',
      errors: [{ messageId: 'tooMany', data: { count: 3 } }],
    },
    {
      code: 'const x = <p>Acme &middot; Remote &middot; Applied</p>;',
      errors: [{ messageId: 'tooMany', data: { count: 3 } }],
    },
    {
      code: 'const x = <p>{a} · {b} · {c}</p>;',
      errors: [{ messageId: 'tooMany', data: { count: 3 } }],
    },
    {
      code: 'const x = <p>{`A · B · C`}</p>;',
      errors: [{ messageId: 'tooMany', data: { count: 3 } }],
    },
  ],
});
