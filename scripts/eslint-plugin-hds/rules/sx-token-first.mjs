/**
 * hds/sx-token-first
 *
 * Errors on raw hex colors or raw px strings inside a `sx={{ ... }}` prop
 * (Box's token-first layout engine — src/app/components/box.tsx). `sx` is
 * the sanctioned escape hatch specifically because it forces spacing/color
 * through HDS tokens: bare numbers are a *feature* there (they resolve off
 * the 4px space scale), so this rule does NOT flag numeric literals — only
 * values that prove the author reached past the token system (hex strings,
 * explicit 'Npx' strings). Nested objects (responsive `{ xs, sm, ... }` and
 * `&`-selector blocks) are walked recursively since sx supports both.
 */
import { attrName, jsxObjectExpression, propName, stringLiteralValue } from './utils.mjs';

const HEX_RE = /#[0-9a-fA-F]{3,4}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/;
const PX_STRING_RE = /-?\d+(?:\.\d+)?px/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw hex/px string values inside Box sx — sx must resolve colors and spacing through HDS token keys.',
      recommended: true,
      url: 'https://github.com/hirobius/hirobius-design-system/blob/main/scripts/eslint-plugin-hds/README.md#hdssx-token-first',
    },
    schema: [],
    messages: {
      rawHexInSx:
        'Raw hex color "{{value}}" in sx prop "{{prop}}" bypasses HDS color tokens. Use a dotted token key (e.g. "content.primary", "surface.raised", "accent").',
      rawPxInSx:
        'Raw px string "{{value}}" in sx prop "{{prop}}" bypasses the HDS spacing scale. Use a bare number (resolves off the 4px scale) or a named step ("tight" | "normal" | "inset" | "spacious").',
    },
  },
  create(context) {
    function walk(objExpr) {
      for (const prop of objExpr.properties) {
        if (prop.type !== 'Property') continue; // skip SpreadElement
        const name = propName(prop.key) ?? '?';

        if (prop.value.type === 'ObjectExpression') {
          walk(prop.value); // responsive { xs, sm, ... } / '&'-selector nesting
          continue;
        }

        const value = stringLiteralValue(prop.value);
        if (value == null) continue;

        if (HEX_RE.test(value)) {
          context.report({
            node: prop.value,
            messageId: 'rawHexInSx',
            data: { value, prop: name },
          });
        } else if (PX_STRING_RE.test(value)) {
          context.report({ node: prop.value, messageId: 'rawPxInSx', data: { value, prop: name } });
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (attrName(node) !== 'sx') return;
        const obj = jsxObjectExpression(node.value);
        if (!obj) return;
        walk(obj);
      },
    };
  },
};
