/**
 * Codemod: remove the deprecated `isDark` prop from Button / IconButton.
 *
 * Button chrome is theme-aware via CSS variables; the `isDark` prop was a
 * no-op and has been removed from the public API.
 *
 * Run: pnpm codemod -t codemods/remove-button-isdark.cjs <path>
 */
module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let changed = false;

  for (const name of ['Button', 'IconButton']) {
    root.findJSXElements(name).forEach((path) => {
      const attrs = path.node.openingElement.attributes;
      const idx = attrs.findIndex(
        (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'isDark',
      );
      if (idx !== -1) {
        attrs.splice(idx, 1);
        changed = true;
      }
    });
  }

  return changed ? root.toSource() : null;
};
