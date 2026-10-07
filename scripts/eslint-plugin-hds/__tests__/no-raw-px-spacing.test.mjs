// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Linter } from 'eslint';
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
      errors: [
        { messageId: 'rawPxSpacing', data: { value: '12px', prop: 'marginBottom', sxProp: 'mb' } },
      ],
    },
    {
      code: 'const x = <div style={{ gap: 24 }} />;',
      errors: [{ messageId: 'rawPxSpacing', data: { value: '24', prop: 'gap', sxProp: 'gap' } }],
    },
    {
      code: 'const x = <div style={{ padding: "16px", margin: "8px" }} />;',
      errors: [
        { messageId: 'rawPxSpacing', data: { value: '16px', prop: 'padding', sxProp: 'p' } },
        { messageId: 'rawPxSpacing', data: { value: '8px', prop: 'margin', sxProp: 'm' } },
      ],
    },
    {
      code: 'const x = <div style={{ marginLeft: -8 }} />;',
      errors: [
        { messageId: 'rawPxSpacing', data: { value: '-8', prop: 'marginLeft', sxProp: 'ml' } },
      ],
    },
    {
      // Logical props have no Box sx shorthand: sx px/py/mx/my set physical sides.
      code: 'const x = <div style={{ paddingInline: "8px", marginBlockEnd: 4 }} />;',
      errors: [
        { messageId: 'rawPxSpacingNoSxShorthand', data: { value: '8px', prop: 'paddingInline' } },
        { messageId: 'rawPxSpacingNoSxShorthand', data: { value: '4', prop: 'marginBlockEnd' } },
      ],
    },
  ],
});

/** Lints one snippet with only this rule on and returns the messages. */
function lint(code) {
  const linter = new Linter();
  return linter.verify(
    code,
    [
      {
        files: ['**/*.jsx'],
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { hds: { rules: { 'no-raw-px-spacing': rule } } },
        rules: { 'hds/no-raw-px-spacing': 'error' },
      },
    ],
    'snippet.jsx',
  );
}

// hds#206 review: the message once told the author to write Box sx prop
// "marginBottom" with a step, which box-sx does not resolve: it renders
// `margin-bottom:md`, invalid CSS, and no spacing. These pin the exact text.
test('a long-hand prop with an sx shorthand is pointed at that shorthand', () => {
  const [message] = lint('const x = <div style={{ marginBottom: "12px" }} />;');
  assert.equal(
    message.message,
    'Raw spacing value "12px" on "marginBottom" bypasses the HDS spacing scale. Use hds.semantic.space.scale.* (var(--semantic-space-scale-*)), or Box sx prop "mb" with a t-shirt step such as "md".',
  );
});

test('a prop with no sx shorthand is pointed at the scale token only', () => {
  const [message] = lint('const x = <div style={{ paddingInline: "8px" }} />;');
  assert.equal(
    message.message,
    'Raw spacing value "8px" on "paddingInline" bypasses the HDS spacing scale. Use hds.semantic.space.scale.* (var(--semantic-space-scale-*)). Box sx has no shorthand for "paddingInline", so its t-shirt steps do not apply.',
  );
});

// Every style prop the rule checks. Kept here, not imported, so a prop added
// to the rule without a matching case here fails the set-equality test below.
const SPACING_PROPS = [
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginBlock',
  'marginInline',
  'marginBlockStart',
  'marginBlockEnd',
  'marginInlineStart',
  'marginInlineEnd',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingBlock',
  'paddingInline',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
  'gap',
  'rowGap',
  'columnGap',
];

/** box-sx.ts SPACING_PROP_MAP, read from the source: sx key → CSS properties. */
function boxSxSpacingPropMap() {
  const src = readFileSync(
    new URL('../../../src/app/components/box-sx.ts', import.meta.url),
    'utf8',
  );
  const body = src.match(/const SPACING_PROP_MAP[^=]*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(body, 'SPACING_PROP_MAP not found in box-sx.ts');
  const map = new Map();
  for (const [, key, props] of body[1].matchAll(/^\s*(\w+):\s*\[([^\]]*)\]/gm)) {
    map.set(
      key,
      [...props.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    );
  }
  assert.ok(map.size > 0, 'SPACING_PROP_MAP parsed empty');
  return map;
}

const kebab = (prop) => prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

test('the props listed here are exactly the props the rule checks', () => {
  const src = readFileSync(new URL('../rules/no-raw-px-spacing.mjs', import.meta.url), 'utf8');
  const body = src.match(/const SPACING_PROPS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(body, 'SPACING_PROPS not found in no-raw-px-spacing.mjs');
  const ruleProps = [...body[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual([...ruleProps].sort(), [...SPACING_PROPS].sort());
});

test('every Box sx prop the message names sets exactly the flagged CSS property', () => {
  const sxMap = boxSxSpacingPropMap();
  let named = 0;
  for (const prop of SPACING_PROPS) {
    const messages = lint(`const x = <div style={{ ${prop}: "12px" }} />;`);
    assert.equal(messages.length, 1, `${prop} is not checked by the rule`);
    const sxProp = messages[0].message.match(/Box sx prop "([^"]+)"/)?.[1];
    if (sxProp === undefined) {
      // No shorthand offered: there must truly be no sx key for this prop.
      const equivalent = [...sxMap].filter(([, css]) => css.length === 1 && css[0] === kebab(prop));
      assert.deepEqual(equivalent, [], `${prop} has an sx shorthand the message does not offer`);
      continue;
    }
    named += 1;
    assert.deepEqual(
      sxMap.get(sxProp),
      [kebab(prop)],
      `message offers sx "${sxProp}" for "${prop}", which box-sx does not resolve to ${kebab(prop)}`,
    );
  }
  assert.equal(named, 13, 'expected the 10 physical margin/padding props and the 3 gaps');
});

test('the README section offers the sx shorthand, never a long-hand sx key, with a step', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const start = readme.indexOf('### `hds/no-raw-px-spacing`');
  const section = readme.slice(start, readme.indexOf('\n### ', start + 1));
  assert.match(section, /<Box sx=\{\{ mb: 'sm'/);
  assert.match(section, /paddingInline/);
  assert.match(section, /no `sx` shorthand/);
  // A long-hand key in sx does not resolve step names.
  assert.doesNotMatch(section, /sx=\{\{ (margin|padding)[A-Z]?\w*: '(xs|sm|md|lg|xl)'/);
});
