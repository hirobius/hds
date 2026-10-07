// Explicit and empty: without this PostCSS walks up and loads the HDS root
// postcss.config.mjs (a different shape), which breaks the docs build.
// The CSS we import (fumadocs-ui/style.css, HDS dist/*.css) is already compiled.
export default { plugins: {} };
