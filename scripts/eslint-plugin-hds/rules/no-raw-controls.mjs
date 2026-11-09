/**
 * hds/no-raw-controls
 *
 * Errors on the raw HTML form controls an HDS component replaces: <button>,
 * <input>, <select>, <textarea> and <form>. The HDS versions carry the label,
 * focus ring, error slot and field rhythm, so a raw element is a control that
 * looks and behaves unlike the rest of the screen. Only lowercase intrinsic
 * JSX names are checked; `<Button>` and `<AlertDialog.Action>` are components.
 *
 * A `<button>` whose className carries the `hds-button` class is an HDS control:
 * static.css styles it as a Button for CSS-only consumers (hds#1372, hds#1384).
 * The class is read from string and template literals anywhere in the className
 * expression (`cn('hds-button', …)`, a ternary), as a whole token, so
 * `hds-button--primary` alone or `my-hds-button` does not count. `<a>` is never
 * flagged, so `.hds-link` needs no exception.
 */
const REPLACEMENT = {
  button: 'Button',
  input: 'Input',
  select: 'Select',
  textarea: 'Textarea',
  form: 'Form',
};

/** Elements a static.css class turns into an HDS control. */
const STATIC_CLASS = { button: 'hds-button' };

/** Every string a className expression can produce a class from. */
function classStrings(node, out = []) {
  if (!node) return out;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') out.push(node.value);
      break;
    case 'TemplateLiteral':
      for (const q of node.quasis) out.push(q.value.cooked ?? q.value.raw);
      for (const e of node.expressions) classStrings(e, out);
      break;
    case 'JSXExpressionContainer':
      classStrings(node.expression, out);
      break;
    case 'ConditionalExpression':
      classStrings(node.consequent, out);
      classStrings(node.alternate, out);
      break;
    case 'LogicalExpression':
    case 'BinaryExpression':
      classStrings(node.left, out);
      classStrings(node.right, out);
      break;
    case 'CallExpression':
      for (const a of node.arguments) classStrings(a, out);
      break;
    case 'ArrayExpression':
      for (const el of node.elements) classStrings(el, out);
      break;
    default:
      break;
  }
  return out;
}

/** True when the element's className carries `cls` as a whole class token. */
function hasStaticClass(node, cls) {
  const attr = node.attributes.find(
    (a) =>
      a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'className',
  );
  if (!attr) return false;
  return classStrings(attr.value).some((s) => s.split(/\s+/).includes(cls));
}

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
        const cls = STATIC_CLASS[node.name.name];
        if (cls && hasStaticClass(node, cls)) return;
        context.report({
          node: node.name,
          messageId: 'rawControl',
          data: { element: node.name.name, component },
        });
      },
    };
  },
};
