/**
 * @hirobius/eslint-plugin-hds
 *
 * Consumer-facing ESLint plugin for apps built on @hirobius/design-system.
 * Complements the repo-internal scripts/check-*.mjs guardrails (which only
 * run inside this repo) by shipping the same layout/token discipline as an
 * installable plugin for downstream consumers. See README.md for install +
 * usage.
 *
 * Flat-config only (ESLint 9+) — exports a self-referencing `recommended`
 * config array, the standard pattern for ESLint 9/10 plugins.
 */
import noRawHex from './rules/no-raw-hex.mjs';
import noRawPxSpacing from './rules/no-raw-px-spacing.mjs';
import preferHdsLayoutPrimitive from './rules/prefer-hds-layout-primitive.mjs';
import sxTokenFirst from './rules/sx-token-first.mjs';

const packageMeta = { name: '@hirobius/eslint-plugin-hds', version: '0.1.0' };

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  meta: packageMeta,
  rules: {
    'no-raw-hex': noRawHex,
    'no-raw-px-spacing': noRawPxSpacing,
    'prefer-hds-layout-primitive': preferHdsLayoutPrimitive,
    'sx-token-first': sxTokenFirst,
  },
};

plugin.configs = {
  recommended: [
    {
      name: 'hds/recommended',
      plugins: { hds: plugin },
      rules: {
        'hds/no-raw-hex': 'error',
        'hds/no-raw-px-spacing': 'error',
        'hds/prefer-hds-layout-primitive': 'warn',
        'hds/sx-token-first': 'error',
      },
    },
  ],
};

export default plugin;
