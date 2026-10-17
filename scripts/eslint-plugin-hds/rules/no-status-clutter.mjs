/**
 * hds/no-status-clutter
 *
 * Errors on the status clutter HDS removed (hds#759): a `dot` prop on <Badge>,
 * a `tone` on <StatusListItem> (its leading dot is gone), a coloured left-border
 * bar (`border-l-2`..`border-l-8` plus a tone colour) in a className, a `*-dot`
 * class, a small round tone-coloured span (`rounded-full` + 12px or less + a
 * feedback or hue fill) and a filled-circle glyph (● 🟢 …) in JSX text. Status is
 * implied by content: use a text Badge. A neutral `border-border` rule, an
 * avatar, a spinner and a `•` bullet separator are not flagged.
 * scripts/check-no-status-clutter.mjs is the repo-wide twin.
 */
const BAR = /^(?:[\w-]+:)*border-l-(?:[2-8]|\[[2-8]px\])$/;
const TONE_COLOUR =
  /^(?:[\w-]+:)*border-(?:l-)?(?:feedback-[\w-]+|accent[\w-]*|primary[\w-]*|info|success|warning|danger|blue-[\w-]+)$/;

const ROUND = /^(?:[\w-]+:)*rounded-full$/;
const SMALL = /^(?:[\w-]+:)*(?:size|h|w)-(?:0\.5|1|1\.5|2|2\.5|3|\[(?:[1-9]|1[0-2])px\])$/;
const TONE_FILL =
  /^(?:[\w-]+:)*bg-(?:feedback-[\w-]+|(?:success|warning|danger|info|error|destructive)[\w-]*|(?:green|red|amber|yellow|emerald|lime|orange|rose)-\d+|\[(?:color:)?var\(--[^)]*(?:feedback|success|warning|danger|error|info)[^)]*\)\])$/;
const DOT_CLASS = /^(?:[\w-]+:)*[\w-]+-dot$/;
const STATUS_GLYPH = /[●⬤◉🟢🟡🔴🟠🔵🟣]/u;

function checkClassString(context, node, value) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.some((t) => BAR.test(t)) && tokens.some((t) => TONE_COLOUR.test(t))) {
    context.report({ node, messageId: 'accentBar' });
  }
  if (
    tokens.some((t) => DOT_CLASS.test(t)) ||
    (tokens.some((t) => ROUND.test(t)) &&
      tokens.some((t) => SMALL.test(t)) &&
      tokens.some((t) => TONE_FILL.test(t)))
  ) {
    context.report({ node, messageId: 'dot' });
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow status dots (Badge `dot`, StatusListItem `tone`, `*-dot` classes, small round tone-coloured spans, ● glyphs) and coloured left-border accent bars; status is implied by content.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-status-clutter',
    },
    schema: [],
    messages: {
      badgeDot: 'Badge `dot` is removed: show status as text in a Badge, not a dot.',
      statusListItemTone:
        'StatusListItem `tone` is removed with its dot: put the status in a text Badge in `trailing`.',
      dot: 'No status dots: write the status as text (a text Badge), not a small coloured circle or ● glyph.',
      accentBar:
        'Coloured left-border accent bar: drop it. Status is implied by content; keep label and value together.',
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (STATUS_GLYPH.test(node.value)) context.report({ node, messageId: 'dot' });
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name === 'tone') {
          const tag = node.parent.name;
          if (tag.type === 'JSXIdentifier' && tag.name === 'StatusListItem') {
            context.report({ node, messageId: 'statusListItemTone' });
          }
          return;
        }
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
