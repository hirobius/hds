// @vitest-environment node
import { makeRuleTester } from './test-helpers.mjs';
import rule from '../rules/no-delight-on-actions.mjs';

makeRuleTester().run('no-delight-on-actions', rule, {
  valid: [
    'const x = <Badge style={{ background: "var(--semantic-accent-delight-base)" }}>New</Badge>;',
    'const x = <span className="bg-[var(--semantic-accent-delight-pale)]">Best fit</span>;',
    'const x = <Button variant="primary">Save</Button>;',
    { code: 'const c = "var(--semantic-accent-delight-base)";', filename: 'streak-badge.tsx' },
    { code: 'const c = "var(--semantic-accent-rest)";', filename: 'button.tsx' },
  ],
  invalid: [
    {
      code: 'const x = <Button style={{ background: "var(--semantic-accent-delight-base)" }}>Go</Button>;',
      errors: [{ messageId: 'action' }],
    },
    {
      code: 'const x = <a className="text-[var(--semantic-accent-delight-deep)]" href="/">Go</a>;',
      errors: [{ messageId: 'action' }],
    },
    {
      code: 'const x = <IconButton sx={{ bg: "semantic.accent.delight.base" }} />;',
      errors: [{ messageId: 'action' }],
    },
    {
      code: 'const x = <NavLink className={`bg-[var(--semantic-accent-delight-pale)]`} />;',
      errors: [{ messageId: 'action' }],
    },
    {
      code: 'const x = <div className="focus-visible:outline-[var(--semantic-accent-delight-base)]" />;',
      errors: [{ messageId: 'focus' }],
    },
    {
      code: 'const x = <div className="group-focus-visible:ring-[var(--semantic-accent-delight-base)]" />;',
      errors: [{ messageId: 'focus' }],
    },
    {
      code: 'const bg = "var(--semantic-accent-delight-base)";',
      filename: 'src/app/components/icon-button.tsx',
      errors: [{ messageId: 'actionFile' }],
    },
  ],
});
