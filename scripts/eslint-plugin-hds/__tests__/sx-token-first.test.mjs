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
      // A responsive map reports the spacing key it sits on, not the breakpoint.
      code: 'const x = <Box sx={{ m: { xs: "8px", md: 4 } }} />;',
      errors: [{ messageId: 'rawPxInSx', data: { value: '8px', prop: 'm' } }],
    },
    {
      code: 'const x = <Box sx={{ "&:hover": { color: "#000000" } }} />;',
      errors: [{ messageId: 'rawHexInSx' }],
    },
    // Only the spacing shorthands resolve t-shirt names (`width: "md"` is
    // invalid CSS), so a px string on any other key gets a token, not a step.
    {
      code: 'const x = <Box sx={{ width: "200px", top: "16px" }} />;',
      errors: [
        { messageId: 'rawPxInSxNonSpacing', data: { value: '200px', prop: 'width' } },
        { messageId: 'rawPxInSxNonSpacing', data: { value: '16px', prop: 'top' } },
      ],
    },
    {
      code: 'const x = <Box sx={{ padding: "16px", maxWidth: { md: "640px" } }} />;',
      errors: [
        { messageId: 'rawPxInSxNonSpacing', data: { value: '16px', prop: 'padding' } },
        { messageId: 'rawPxInSxNonSpacing', data: { value: '640px', prop: 'maxWidth' } },
      ],
    },
    {
      // An &-selector block holds real keys again.
      code: 'const x = <Box sx={{ "&:hover": { p: "4px", left: "2px" } }} />;',
      errors: [
        { messageId: 'rawPxInSx', data: { value: '4px', prop: 'p' } },
        { messageId: 'rawPxInSxNonSpacing', data: { value: '2px', prop: 'left' } },
      ],
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

// The steps are 8/16/24/32/48px only at comfortable density; compact
// tightens them, so a fixed px list must say which density it is.
const FIXED_PX_CLAIM = /8\/16\/24\/32\/48px(?![^.]*comfortable)/;

test('rawPxInSx does not promise fixed pixels for the steps (compact tightens them)', () => {
  const message = rule.meta.messages.rawPxInSx;
  assert.doesNotMatch(message, FIXED_PX_CLAIM);
  assert.match(message, /compact/);
});

test('rawPxInSxNonSpacing points at tokens, not at the t-shirt steps', () => {
  const message = rule.meta.messages.rawPxInSxNonSpacing;
  assert.doesNotMatch(message, /"xs" \| "sm"/);
  assert.match(message, /hds\.space\./);
  assert.match(message, /var\(--/);
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

test('the README section says the step pixels depend on density and apply to spacing keys only', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const start = readme.indexOf('### `hds/sx-token-first`');
  const section = readme.slice(start, readme.indexOf('\n## ', start));
  assert.doesNotMatch(section, FIXED_PX_CLAIM);
  assert.match(section, /compact/);
  assert.match(section, /<Box sx=\{\{ width: '200px' \}\} \/>/);
});
