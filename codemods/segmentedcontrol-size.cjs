/**
 * Codemod: SegmentedControl `size` onto the shared sm/md ramp.
 *   size="default" → size="md"
 *   size="compact" → size="sm"
 *
 * Aligns SegmentedControl with Button/Input/IconButton (sm | md | lg).
 *
 * Run: pnpm codemod -t codemods/segmentedcontrol-size.cjs <path>
 */
module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const MAP = { default: 'md', compact: 'sm' };
  let changed = false;

  const isStr = (v) => v && (v.type === 'StringLiteral' || v.type === 'Literal');

  root.findJSXElements('SegmentedControl').forEach((path) => {
    for (const attr of path.node.openingElement.attributes) {
      if (
        attr.type === 'JSXAttribute' &&
        attr.name &&
        attr.name.name === 'size' &&
        isStr(attr.value) &&
        MAP[attr.value.value]
      ) {
        attr.value.value = MAP[attr.value.value];
        changed = true;
      }
    }
  });

  return changed ? root.toSource() : null;
};
