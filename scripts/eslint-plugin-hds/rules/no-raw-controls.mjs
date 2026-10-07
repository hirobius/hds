/**
 * hds/no-raw-controls
 *
 * Errors on the raw HTML form controls an HDS component replaces: <button>,
 * <input>, <select>, <textarea> and <form>. The HDS versions carry the label,
 * focus ring, error slot and field rhythm, so a raw element is a control that
 * looks and behaves unlike the rest of the screen. Only lowercase intrinsic
 * JSX names are checked; `<Button>` and `<AlertDialog.Action>` are components.
 */
const REPLACEMENT = {
  button: 'Button',
  input: 'Input',
  select: 'Select',
  textarea: 'Textarea',
  form: 'Form',
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw <button>, <input>, <select>, <textarea> and <form>; use the HDS component.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-raw-controls',
    },
    schema: [],
    messages: {
      rawControl:
        'Raw <{{element}}> — use the HDS `{{component}}` instead (Form, FormActions and the field components import from @hirobius/design-system or its /patterns subpath).',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        const component = REPLACEMENT[node.name.name];
        if (!component) return;
        context.report({
          node: node.name,
          messageId: 'rawControl',
          data: { element: node.name.name, component },
        });
      },
    };
  },
};
