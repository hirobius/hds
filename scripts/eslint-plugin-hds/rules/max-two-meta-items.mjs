/**
 * hds/max-two-meta-items
 *
 * Errors on JSX text that chains three or more items with a bullet
 * ("A · B · C", "A &middot; B &middot; C"). Long strings wrap mid-line once
 * translated, so a bullet line holds at most two items; use `MetaLine` for
 * two, and one row per item beyond that. Counts separators across the text
 * children of one element, so `{a} · {b} · {c}` is caught too.
 */
const SEPARATOR = /·|&middot;|&#183;|&#xb7;/gi;

function countSeparators(text) {
  return (text.match(SEPARATOR) || []).length;
}

function textOf(child) {
  if (child.type === 'JSXText') return child.raw;
  if (child.type !== 'JSXExpressionContainer') return '';
  const e = child.expression;
  if (e.type === 'Literal' && typeof e.value === 'string') return e.value;
  if (e.type === 'TemplateLiteral') return e.quasis.map((q) => q.value.raw).join('');
  return '';
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow bullet-separated lines with more than two items; use MetaLine.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsmax-two-meta-items',
    },
    schema: [],
    messages: {
      tooMany:
        'Bullet-separated line with {{count}} items — max two per line (long translations wrap). Use `<MetaLine items={[a, b]} />`, and one row per item beyond two.',
    },
  },
  create(context) {
    const check = (node) => {
      const separators = node.children.reduce((n, c) => n + countSeparators(textOf(c)), 0);
      if (separators >= 2) {
        context.report({ node, messageId: 'tooMany', data: { count: separators + 1 } });
      }
    };
    return { JSXElement: check, JSXFragment: check };
  },
};
