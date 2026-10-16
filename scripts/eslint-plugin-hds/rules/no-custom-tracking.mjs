/**
 * hds/no-custom-tracking
 *
 * Letter-spacing comes from the type tokens and nowhere else (Adrian,
 * 2026-10-16). Flags, in JSX:
 *   - a Tailwind `tracking-*` class (also variant-prefixed, `md:tracking-wide`)
 *   - an arbitrary `[letter-spacing:...]` class
 *   - an inline `letterSpacing` in `style={{ ... }}` or `sx={{ ... }}`
 * unless the value is `var(--semantic-typography-*)` (or inherit/unset/initial).
 * The CSS side lives in the repo gate scripts/check-no-custom-tracking.mjs.
 */
import { attrName, jsxObjectExpression, propName, stringLiteralValue } from './utils.mjs';

const TOKEN_VAR_RE = /^var\(\s*--semantic-typography-[\w-]+\s*\)$/;
const RESET_RE = /^(?:inherit|unset|initial)$/;
// `md:hover:!-tracking-[...]`; the class may also be negative or important.
const TRACKING_CLASS_RE = /^(?:[\w-]+:)*!?-?tracking-(.+)$/;
const ARBITRARY_PROP_RE = /^(?:[\w-]+:)*!?\[letter-spacing:(.+)\]$/;

const isTokenValue = (v) => TOKEN_VAR_RE.test(v.trim()) || RESET_RE.test(v.trim());

/** Offending class tokens in a class string: [{ token }]. */
function badClasses(value) {
  const out = [];
  for (const token of value.split(/\s+/).filter(Boolean)) {
    const arbitrary = token.match(ARBITRARY_PROP_RE);
    if (arbitrary) {
      if (!isTokenValue(arbitrary[1])) out.push(token);
      continue;
    }
    const tracking = token.match(TRACKING_CLASS_RE);
    if (!tracking) continue;
    const bracket = tracking[1].match(/^\[(.+)\]$/);
    if (bracket && isTokenValue(bracket[1])) continue;
    out.push(token);
  }
  return out;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow letter-spacing that does not come from a type token (tracking-* classes, [letter-spacing:...], inline letterSpacing).',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-custom-tracking',
    },
    schema: [],
    messages: {
      trackingClass:
        'Class "{{value}}" sets letter-spacing by hand. Tracking comes from the type tokens only — use <Text variant="..."> or the .hds-type-<role> class.',
      inlineSpacing:
        'Inline letterSpacing "{{value}}" sets tracking by hand. Use var(--semantic-typography-<role>-letter-spacing), or a <Text variant="..."> that already sets it.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const name = attrName(node);
        if (name === 'style' || name === 'sx') {
          const obj = jsxObjectExpression(node.value);
          if (!obj) return;
          for (const prop of obj.properties) {
            if (prop.type !== 'Property' || propName(prop.key) !== 'letterSpacing') continue;
            const value = stringLiteralValue(prop.value);
            // Numbers are px; a computed value cannot be proven raw, so it is left alone.
            const isNumber = prop.value.type === 'Literal' && typeof prop.value.value === 'number';
            if (isNumber) {
              context.report({
                node: prop.value,
                messageId: 'inlineSpacing',
                data: { value: String(prop.value.value) },
              });
            } else if (value != null && !isTokenValue(value)) {
              context.report({ node: prop.value, messageId: 'inlineSpacing', data: { value } });
            }
          }
          return;
        }

        if (name === 'className') {
          let value = null;
          if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
            value = node.value.value;
          } else if (node.value && node.value.type === 'JSXExpressionContainer') {
            value = stringLiteralValue(node.value.expression);
          }
          if (typeof value !== 'string') return;
          for (const token of badClasses(value)) {
            context.report({
              node: node.value,
              messageId: 'trackingClass',
              data: { value: token },
            });
          }
        }
      },
    };
  },
};
