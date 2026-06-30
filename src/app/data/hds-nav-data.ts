/**
 * hds-nav-data — the HDS sidebar navigation sections.
 *
 * ADR-017, Phase 3: `HDS_NAV_SECTIONS` is now derived from the single generated
 * `nav-model.json` (whose source is each page's colocated `meta` — see
 * `scripts/generate-nav-model.mjs`), NOT from `hds-registry.json`. The model's
 * serializable `exact`/`indent` flags are rehydrated into the `getExact`/
 * `getIndent` predicates the sidebar consumes, so `HDSLayout` is unchanged.
 *
 * Add or move a sidebar page by editing that page's `meta` and running
 * `pnpm nav:generate` — there is no separate list to keep in sync here.
 */

import { navModel } from './nav-model';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NavItem = {
  path: string;
  label: string;
};

export type HdsNavSection = {
  label: string;
  items: NavItem[];
  getExact?: (item: { path: string }) => boolean;
  getIndent?: (item: { path: string }) => boolean;
};

/**
 * Map a registry path to its standalone route. The registry carries the
 * monorepo's /hds/* prefix; the standalone site serves every doc page at root
 * (see src/app/routes.tsx). e.g. "/hds/components/actions" → "/components/actions".
 *
 * Nav paths in the model are already root-relative, so this is no longer used
 * for the sidebar — it remains for callers that still resolve raw registry
 * paths (e.g. HDSLayout's current-page lookup against `hds-registry.json`).
 */
export function toAppPath(registryPath: string): string {
  if (registryPath === '/hds') return '/';
  return registryPath.startsWith('/hds/') ? registryPath.slice(4) : registryPath;
}

// ── Derivation from the generated model ────────────────────────────────────────

/**
 * Rehydrate the sidebar sections from `nav-model.json`. The model stores
 * `exact`/`indent` as per-item booleans; here they become the predicate
 * functions the sidebar calls, preserving the exact behavior of the previous
 * registry-derived sections.
 */
function buildNavSections(): HdsNavSection[] {
  return navModel.sections.map((section) => {
    const exactPaths = new Set(section.items.filter((i) => i.exact).map((i) => i.path));
    const indentPaths = new Set(section.items.filter((i) => i.indent).map((i) => i.path));

    const result: HdsNavSection = {
      label: section.label,
      items: section.items.map((i) => ({ path: i.path, label: i.label })),
    };
    if (exactPaths.size > 0) result.getExact = (item) => exactPaths.has(item.path);
    if (indentPaths.size > 0) result.getIndent = (item) => indentPaths.has(item.path);
    return result;
  });
}

/**
 * Pre-built HDS_NAV_SECTIONS — import this in HDSLayout instead of a hardcoded
 * array. Derived from the generated nav model.
 */
export const HDS_NAV_SECTIONS: ReadonlyArray<HdsNavSection> = buildNavSections();
