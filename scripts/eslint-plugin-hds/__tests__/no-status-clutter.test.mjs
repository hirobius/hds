// @vitest-environment node
import { makeRuleTester } from './test-helpers.mjs';
import rule from '../rules/no-status-clutter.mjs';

makeRuleTester().run('no-status-clutter', rule, {
  valid: [
    'const x = <Badge tone="success">Applied</Badge>;',
    'const x = <Other dot />;',
    'const x = <blockquote className="border-l-2 border-border pl-4" />;',
    'const x = <Card className="border border-feedback-danger" />;',
    'const x = <StatusListItem title="Paid" trailing={<Badge tone="success">Paid</Badge>} />;',
    'const x = <span className="size-10 rounded-full bg-muted" />;',
    'const x = <span className="size-2 rounded-full bg-current" />;',
    'const x = <span>Ada • 3 min</span>;',
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
    {
      code: 'const x = <StatusListItem tone="success" title="Paid" />;',
      errors: [{ messageId: 'statusListItemTone' }],
    },
    {
      code: 'const x = <span className="status-dot" />;',
      errors: [{ messageId: 'dot' }],
    },
    {
      code: 'const x = <span className="h-2 w-2 rounded-full bg-feedback-success" />;',
      errors: [{ messageId: 'dot' }],
    },
    {
      code: 'const x = <span>● Online</span>;',
      errors: [{ messageId: 'dot' }],
    },
    {
      code: 'const x = <span>{"●"} Online</span>;',
      errors: [{ messageId: 'dot' }],
    },
  ],
});
