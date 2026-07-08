import rule from '../rules/no-raw-px-spacing.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-raw-px-spacing', rule, {
  valid: [
    'const x = <div style={{ margin: hds.space.px16 }} />;',
    'const x = <div style={{ padding: "var(--semantic-space-component-padding)" }} />;',
    'const x = <div style={{ gap: hds.density.lg }} />;',
    // Zero is exempt — a reset has no scale to violate.
    'const x = <div style={{ margin: 0, padding: 0, gap: 0 }} />;',
    // Non-spacing prop with a raw number is out of scope for this rule.
    'const x = <div style={{ width: 16 }} />;',
    'const x = <Box sx={{ m: 2 }} />;',
  ],
  invalid: [
    {
      code: 'const x = <div style={{ marginBottom: "12px" }} />;',
      errors: [{ messageId: 'rawPxSpacing' }],
    },
    {
      code: 'const x = <div style={{ gap: 24 }} />;',
      errors: [{ messageId: 'rawPxSpacing' }],
    },
    {
      code: 'const x = <div style={{ padding: "16px", margin: "8px" }} />;',
      errors: [{ messageId: 'rawPxSpacing' }, { messageId: 'rawPxSpacing' }],
    },
    {
      code: 'const x = <div style={{ marginLeft: -8 }} />;',
      errors: [{ messageId: 'rawPxSpacing' }],
    },
  ],
});
