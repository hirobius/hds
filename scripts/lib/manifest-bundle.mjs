/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * manifest-bundle.mjs — what the bundled `@hirobius/design-system/manifest`
 * entry (dist/manifest.js) leaves out of public/hds-manifest.json (hds#413).
 * Pure: vite.config.lib.ts applies it when it inlines the JSON.
 *
 * The entry has a 65 kB gzip budget (.size-limit.cjs). These fields cost about
 * 4 kB and carry nothing a consumer of the package can use:
 *   - `figmaLink`: the same URL as `figmaUrl` on every linked spec;
 *   - `consumers`: paths of the HDS repo files that import the component;
 *   - `a11yRules[].testId`: ids of HDS's own a11y tests.
 * public/hds-manifest.json keeps all three for the repo's own tooling.
 */

export const BUNDLE_OMITTED_SPEC_FIELDS = ['figmaLink', 'consumers', 'a11yRules[].testId'];

function slimSpec(spec) {
  const { figmaLink, consumers: _consumers, a11yRules, ...rest } = spec;
  const slim = { ...rest };
  // A figmaLink that differs from figmaUrl is information, not a duplicate.
  if (figmaLink != null && figmaLink !== spec.figmaUrl) slim.figmaLink = figmaLink;
  if (Array.isArray(a11yRules)) {
    slim.a11yRules = a11yRules.map(({ testId: _testId, ...rule }) => rule);
  } else if (a11yRules !== undefined) {
    slim.a11yRules = a11yRules;
  }
  return slim;
}

function slimSpecs(specs) {
  if (!specs || typeof specs !== 'object') return specs;
  return Object.fromEntries(Object.entries(specs).map(([name, spec]) => [name, slimSpec(spec)]));
}

/** The manifest as dist/manifest.js ships it. Returns a new object. */
export function slimManifestForBundle(manifest) {
  return {
    ...manifest,
    componentSpecs: slimSpecs(manifest.componentSpecs),
    ...(manifest.utilities === undefined ? {} : { utilities: slimSpecs(manifest.utilities) }),
  };
}
