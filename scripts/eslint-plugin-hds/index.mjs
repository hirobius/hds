/**
 * @hirobius/eslint-plugin-hds
 *
 * Consumer-facing ESLint plugin for apps built on @hirobius/design-system.
 * Complements the repo-internal scripts/check-*.mjs guardrails (which only
 * run inside this repo) by shipping the same layout/token discipline as an
 * installable plugin for downstream consumers. See README.md for install +
 * usage. Ships inside @hirobius/design-system as the `./eslint-plugin`
 * subpath (`import hds from '@hirobius/design-system/eslint-plugin'`).
 *
 * Flat-config only (ESLint 9+) — exports a self-referencing `recommended`
 * config array, the standard pattern for ESLint 9/10 plugins.
 */
import { readFileSync } from 'node:fs';
import maxTwoMetaItems from './rules/max-two-meta-items.mjs';
import noCustomTracking from './rules/no-custom-tracking.mjs';
import noDelightOnActions from './rules/no-delight-on-actions.mjs';
import noDeprecatedImport from './rules/no-deprecated-import.mjs';
import noNestedCards from './rules/no-nested-cards.mjs';
import noDeprecatedToken from './rules/no-deprecated-token.mjs';
import noPrimitiveSpacing from './rules/no-primitive-spacing.mjs';
import noRemovedImport from './rules/no-removed-import.mjs';
import noRawControls from './rules/no-raw-controls.mjs';
import noRawHex from './rules/no-raw-hex.mjs';
import noStatusClutter from './rules/no-status-clutter.mjs';
import noRawPxSpacing from './rules/no-raw-px-spacing.mjs';
import preferHdsLayoutPrimitive from './rules/prefer-hds-layout-primitive.mjs';
import sxTokenFirst from './rules/sx-token-first.mjs';

// One source for name and version: the plugin's own package.json (shipped with it).
const { name, version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);
const packageMeta = { name, version };

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  meta: packageMeta,
  rules: {
    'max-two-meta-items': maxTwoMetaItems,
    'no-custom-tracking': noCustomTracking,
    'no-delight-on-actions': noDelightOnActions,
    'no-deprecated-import': noDeprecatedImport,
    'no-deprecated-token': noDeprecatedToken,
    'no-nested-cards': noNestedCards,
    'no-primitive-spacing': noPrimitiveSpacing,
    'no-raw-controls': noRawControls,
    'no-removed-import': noRemovedImport,
    'no-raw-hex': noRawHex,
    'no-raw-px-spacing': noRawPxSpacing,
    'no-status-clutter': noStatusClutter,
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
        'hds/max-two-meta-items': 'error',
        'hds/no-custom-tracking': 'error',
        'hds/no-delight-on-actions': 'error',
        'hds/no-deprecated-import': 'warn',
        'hds/no-deprecated-token': 'error',
        'hds/no-nested-cards': 'error',
        'hds/no-primitive-spacing': 'error',
        'hds/no-raw-controls': 'error',
        'hds/no-removed-import': 'error',
        'hds/no-raw-hex': 'error',
        'hds/no-raw-px-spacing': 'error',
        'hds/no-status-clutter': 'error',
        'hds/prefer-hds-layout-primitive': 'warn',
        'hds/sx-token-first': 'error',
      },
    },
  ],
};

export default plugin;
