import rule from '../rules/no-raw-hex.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-raw-hex', rule, {
  valid: [
    'const x = <div style={{ color: "var(--semantic-color-content-primary)" }} />;',
    'const x = <div style={{ backgroundColor: "content.primary" }} />;',
    'const x = <div className="text-primary bg-surface-raised" />;',
    'const x = <Box sx={{ color: "content.primary" }} />;',
    // Computed values this plugin can't prove are raw — deliberately not flagged.
    'const x = <div style={{ color: computedColor }} />;',
  ],
  invalid: [
    {
      code: 'const x = <div style={{ color: "#fff" }} />;',
      errors: [{ messageId: 'rawHexStyle' }],
    },
    {
      code: 'const x = <div style={{ backgroundColor: "#FF00AA" }} />;',
      errors: [{ messageId: 'rawHexStyle' }],
    },
    {
      code: 'const x = <div style={{ borderColor: "#12345678" }} />;',
      errors: [{ messageId: 'rawHexStyle' }],
    },
    {
      code: 'const x = <div className="bg-[#ff0000]" />;',
      errors: [{ messageId: 'rawHexClassName' }],
    },
    {
      code: 'const x = <div className={`bg-[#ff0000]`} />;',
      errors: [{ messageId: 'rawHexClassName' }],
    },
  ],
});
