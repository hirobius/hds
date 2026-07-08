import rule from '../rules/prefer-hds-layout-primitive.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('prefer-hds-layout-primitive', rule, {
  valid: [
    'const x = <Stack gap="normal"><Child /></Stack>;',
    'const x = <Grid columns={3}><Child /></Grid>;',
    'const x = <div style={{ color: "content.primary" }} />;',
    // display isn't flex/grid — out of scope.
    'const x = <div style={{ display: "none" }} />;',
  ],
  invalid: [
    {
      code: 'const x = <div style={{ display: "flex", gap: 8 }} />;',
      errors: [{ messageId: 'preferPrimitive' }],
    },
    {
      code: 'const x = <div style={{ display: "grid" }} />;',
      errors: [{ messageId: 'preferPrimitive' }],
    },
    {
      code: 'const x = <div style={{ display: "inline-flex" }} />;',
      errors: [{ messageId: 'preferPrimitive' }],
    },
  ],
});
