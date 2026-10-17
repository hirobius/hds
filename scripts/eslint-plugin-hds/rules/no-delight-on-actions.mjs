/**
 * hds/no-delight-on-actions
 *
 * Errors when the lime delight accent (`semantic.accent.delight.*`) lands on an
 * action or on focus. Delight is for delight moments only: a streak or win
 * badge, a "new" tag, a best-fit highlight, confetti and illustration. Buttons,
 * links and focus rings take the accent (`semantic.accent.*`), never delight.
 *
 * Flags a delight reference (CSS var, token path or Tailwind arbitrary value)
 * in the props of <button>, <a>, or any component named *Button / *Link, in a
 * `focus:` / `focus-visible:` / `focus-within:` class, and anywhere in a
 * button or link component file (button.tsx, icon-button.tsx, nav-link.tsx).
 */
const DELIGHT = /accent[-.]delight|accentDelight/;
const FOCUS_DELIGHT = /focus(?:-visible|-within)?:\S*accent[-.]delight/;
const ACTION_TAG = /^(?:a|button|[A-Z]\w*(?:Button|Link)|Button|Link)$/;
const ACTION_FILE = /(?:^|[-_.])(?:button|link)(?:[-_.][\w-]*)?\.[cm]?[jt]sx?$/i;

function tagName(name) {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return name.property.name;
  return '';
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the lime delight accent on buttons, links and focus; it is for delight moments only.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-delight-on-actions',
    },
    schema: [],
    messages: {
      action:
        'Delight accent on a button or link: use semantic.accent.* for actions. Delight is for badges, "new" tags, best-fit highlights and illustration only.',
      focus:
        'Delight accent on focus: focus rings use semantic.accent.* (role.ring), never delight.',
      actionFile:
        'Delight accent in a button or link component: use semantic.accent.* for actions, never delight.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const basename = filename.split(/[\\/]/).pop() ?? '';
    const inActionFile = ACTION_FILE.test(basename);
    const source = context.sourceCode ?? context.getSourceCode();

    function checkString(node, value) {
      if (typeof value !== 'string' || !DELIGHT.test(value)) return;
      if (inActionFile) context.report({ node, messageId: 'actionFile' });
      else if (FOCUS_DELIGHT.test(value)) context.report({ node, messageId: 'focus' });
    }

    return {
      JSXOpeningElement(node) {
        if (inActionFile || !ACTION_TAG.test(tagName(node.name))) return;
        if (node.attributes.some((a) => DELIGHT.test(source.getText(a)))) {
          context.report({ node, messageId: 'action' });
        }
      },
      Literal(node) {
        checkString(node, node.value);
      },
      TemplateElement(node) {
        checkString(node, node.value.cooked);
      },
    };
  },
};
