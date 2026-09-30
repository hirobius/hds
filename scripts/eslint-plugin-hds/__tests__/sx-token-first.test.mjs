import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import rule from '../rules/sx-token-first.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('sx-token-first', rule, {
  valid: [
    'const x = <Box sx={{ color: "content.primary" }} />;',
    // The t-shirt scale is the recommended spacing vocabulary (hds#206).
    'const x = <Box sx={{ m: "sm", p: "md", gap: "xs" }} />;',
    // Bare numbers still resolve off the 4px scale, so this rule leaves them alone.
    'const x = <Box sx={{ m: 2, p: 4, gap: 8 }} />;',
    'const x = <Box sx={{ m: "normal", top: "var(--primitive-space-2)" }} />;',
    // Responsive object and &-selector nesting are walked but stay clean.
    'const x = <Box sx={{ m: { xs: "sm", md: "lg" }, "&:hover": { color: "accent.hover" } }} />;',
    // Not the sx prop — out of scope.
    'const x = <div style={{ color: "#fff" }} />;',
  ],
  invalid: [
    {
      code: 'const x = <Box sx={{ color: "#fff" }} />;',
      errors: [{ messageId: 'rawHexInSx' }],
    },
    {
      code: 'const x = <Box sx={{ m: "16px" }} />;',
      errors: [{ messageId: 'rawPxInSx' }],
    },
    {
      code: 'const x = <Box sx={{ m: { xs: "8px", md: 4 } }} />;',
      errors: [{ messageId: 'rawPxInSx' }],
    },
    {
      code: 'const x = <Box sx={{ "&:hover": { color: "#000000" } }} />;',
      errors: [{ messageId: 'rawHexInSx' }],
    },
  ],
});

// hds#206: spacing is the t-shirt scale; bare numbers and the old step names
// are the forms it retires, so the fix the rule and its docs offer must not
// point back at them.
const RETIRED = [/bare number/i, /"tight"|'tight'/, /"normal"|'normal'/, /"inset"|'inset'/];

test('rawPxInSx recommends the t-shirt scale (hds#206)', () => {
  const message = rule.meta.messages.rawPxInSx;
  assert.match(message, /"xs" \| "sm" \| "md" \| "lg" \| "xl"/);
  for (const retired of RETIRED) assert.doesNotMatch(message, retired);
});

test('the README section recommends the t-shirt scale (hds#206)', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const start = readme.indexOf('### `hds/sx-token-first`');
  const section = readme.slice(start, readme.indexOf('\n## ', start));
  assert.match(section, /<Box sx=\{\{ m: 'sm', gap: 'md' \}\} \/>/);
  assert.doesNotMatch(section, /<Box sx=\{\{ m: 2, gap: 4 \}\} \/>/);
  assert.doesNotMatch(section, /_feature_/);
});
