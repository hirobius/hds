// @vitest-environment node
import { makeRuleTester } from './test-helpers.mjs';
import rule from '../rules/no-status-clutter.mjs';

makeRuleTester().run('no-status-clutter', rule, {
  valid: [
    'const x = <Badge tone="success">Applied</Badge>;',
    'const x = <Other dot />;',
    'const x = <blockquote className="border-l-2 border-border pl-4" />;',
    'const x = <Card className="border border-feedback-danger" />;',
  ],
  invalid: [
    { code: 'const x = <Badge dot tone="success" />;', errors: [{ messageId: 'badgeDot' }] },
    {
      code: 'const x = <div className="border-l-4 border-l-feedback-success p-4" />;',
      errors: [{ messageId: 'accentBar' }],
    },
    {
      code: 'const x = <div className={`border-l-[3px] border-primary`} />;',
      errors: [{ messageId: 'accentBar' }],
    },
  ],
});
