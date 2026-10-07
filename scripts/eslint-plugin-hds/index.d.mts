/**
 * Types for `@hirobius/design-system/eslint-plugin` (scripts/eslint-plugin-hds/index.mjs).
 * Self-contained on purpose: the shapes are structural, so a consumer's own
 * `eslint` types accept them without this file importing `eslint`.
 */
type RuleLevel = 'off' | 'warn' | 'error';

interface HdsPlugin {
  meta: { name: string; version: string };
  rules: Record<
    | 'no-raw-controls'
    | 'no-raw-hex'
    | 'no-raw-px-spacing'
    | 'prefer-hds-layout-primitive'
    | 'sx-token-first',
    unknown
  >;
  configs: {
    /** Flat config array: spread it into eslint.config.mjs. */
    recommended: Array<{
      name: string;
      plugins: { hds: HdsPlugin };
      rules: Record<string, RuleLevel>;
    }>;
  };
}

declare const plugin: HdsPlugin;
export default plugin;
