// @vitest-environment node
import rule from '../rules/no-custom-tracking.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-custom-tracking', rule, {
  valid: [
    'const x = <p className="text-foreground hds-type-caption" />;',
    'const x = <p className="[letter-spacing:var(--semantic-typography-mono-letter-spacing)]" />;',
    'const x = <p className="tracking-[var(--semantic-typography-caption-letter-spacing)]" />;',
    'const x = <p style={{ letterSpacing: "var(--semantic-typography-caption-letter-spacing)" }} />;',
    'const x = <p style={{ letterSpacing: "inherit" }} />;',
    'const x = <p style={{ letterSpacing: computed }} />;',
    'const x = <Box sx={{ letterSpacing: "var(--semantic-typography-ui-letter-spacing)" }} />;',
    // Not tracking at all.
    'const x = <p className="contracting-box" />;',
  ],
  invalid: [
    {
      code: 'const x = <p className="tracking-wide" />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p className="text-xs tracking-wider" />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p className="md:tracking-widest" />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p className="-tracking-tight" />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p className="tracking-[0.2em]" />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p className="[letter-spacing:0.1em]" />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p className={`tracking-tight`} />;',
      errors: [{ messageId: 'trackingClass' }],
    },
    {
      code: 'const x = <p style={{ letterSpacing: "0.05em" }} />;',
      errors: [{ messageId: 'inlineSpacing' }],
    },
    {
      code: 'const x = <p style={{ letterSpacing: 2 }} />;',
      errors: [{ messageId: 'inlineSpacing' }],
    },
    {
      code: 'const x = <Box sx={{ letterSpacing: "normal" }} />;',
      errors: [{ messageId: 'inlineSpacing' }],
    },
  ],
});
