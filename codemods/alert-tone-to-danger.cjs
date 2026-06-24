/**
 * Codemod: Alert `variant` → `tone`, value `'error'` → `'danger'`.
 *
 * Backs the breaking change in @hirobius/design-system where Alert's feedback
 * prop was unified with Badge/Card/Callout (`tone`) and the destructive red
 * value was renamed `error` → `danger`.
 *
 * Run: pnpm codemod -t codemods/alert-tone-to-danger.cjs <path>
 * (then run prettier — recast reprints touched files).
 */
module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let changed = false;

  const isStr = (v) => v && (v.type === 'StringLiteral' || v.type === 'Literal');

  root.findJSXElements('Alert').forEach((path) => {
    for (const attr of path.node.openingElement.attributes) {
      if (attr.type !== 'JSXAttribute' || !attr.name) continue;
      // 1) variant -> tone
      if (attr.name.name === 'variant') {
        attr.name.name = 'tone';
        changed = true;
      }
      // 2) 'error' -> 'danger' on the tone/variant value
      if (
        (attr.name.name === 'tone' || attr.name.name === 'variant') &&
        isStr(attr.value) &&
        attr.value.value === 'error'
      ) {
        attr.value.value = 'danger';
        changed = true;
      }
    }
  });

  return changed ? root.toSource() : null;
};
