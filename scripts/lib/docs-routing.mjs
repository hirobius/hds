/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * docs-routing — which docs-site page documents which component.
 *
 * The docs site (docs-site/, hds#506) is the place a component is
 * shown and documented, so everything that points at a component's page points here: the manifest's `docsPage`, docs/DESIGN_LINKS.md, Figma dev
 * resources and documentation links. The page rules are docsPageFor() in
 * docs-component-pages.mjs; this module feeds it the repo's own lists (the core
 * set, scripts/docs-rules.json and the modules src/patterns.ts re-exports).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_COMPONENTS } from './core-components.mjs';
import { docsPageFor, patternComponents } from './docs-component-pages.mjs';

const SCRIPTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The routing inputs. Rules and the core set belong to the tooling, so they come
 * from this checkout; the patterns come from `root`'s src/patterns.ts, because
 * that is the source a root's pages are generated from (none -> no patterns).
 *
 * @param {string} root
 */
export function loadDocsRouting(root) {
  const rules = JSON.parse(readFileSync(path.join(SCRIPTS_ROOT, 'docs-rules.json'), 'utf8'));
  const patternsFile = path.join(root, 'src/patterns.ts');
  return {
    core: CORE_COMPONENTS,
    patterns: existsSync(patternsFile) ? patternComponents(readFileSync(patternsFile, 'utf8')) : [],
    providers: rules.providerComponents,
    utilities: rules.utilityComponents,
    utilityPage: rules.utilityPage,
    providerGuide: rules.providerGuide,
  };
}

/** `/docs/components/button`, or null for a component with no page. */
export function docsPagePath(name, routing) {
  return docsPageFor(name, routing)?.path ?? null;
}

/** The public URL of a docs page: `docsUrl` + path, or null without either. */
export function docsPageUrl(docsUrl, pagePath) {
  if (!docsUrl || !pagePath) return null;
  return `${String(docsUrl).replace(/\/+$/, '')}${pagePath}`;
}
