/**
 * hds/no-status-clutter
 *
 * Errors on the status clutter HDS removed (hds#759): a `dot` prop on <Badge>,
 * and a coloured left-border bar (`border-l-2`..`border-l-8` plus a tone
 * colour) in a className. Status is implied by content: use a text Badge.
 * A neutral `border-border` rule (a blockquote) is not flagged.
 */
const BAR = /^(?:[\w-]+:)*border-l-(?:[2-8]|\[[2-8]px\])$/;
const TONE_COLOUR =
  /^(?:[\w-]+:)*border-(?:l-)?(?:feedback-[\w-]+|accent[\w-]*|primary[\w-]*|info|success|warning|danger|blue-[\w-]+)$/;

function checkClassString(context, node, value) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.some((t) => BAR.test(t)) && tokens.some((t) => TONE_COLOUR.test(t))) {
    context.report({ node, messageId: 'accentBar' });
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the Badge `dot` prop and coloured left-border accent bars; status is implied by content.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-status-clutter',
    },
    schema: [],
    messages: {
      badgeDot: 'Badge `dot` is removed: show status as text in a Badge, not a dot.',
      accentBar:
        'Coloured left-border accent bar: drop it. Status is implied by content; keep label and value together.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name === 'dot') {
          const tag = node.parent.name;
          if (tag.type === 'JSXIdentifier' && tag.name === 'Badge') {
            context.report({ node, messageId: 'badgeDot' });
          }
          return;
        }
        if (node.name.name !== 'className') return;
        const v = node.value;
        if (v && v.type === 'Literal' && typeof v.value === 'string') {
          checkClassString(context, v, v.value);
        } else if (v && v.type === 'JSXExpressionContainer') {
          const e = v.expression;
          if (e.type === 'Literal' && typeof e.value === 'string')
            checkClassString(context, e, e.value);
          if (e.type === 'TemplateLiteral' && e.expressions.length === 0) {
            checkClassString(context, e, e.quasis[0].value.cooked);
          }
        }
      },
    };
  },
};
