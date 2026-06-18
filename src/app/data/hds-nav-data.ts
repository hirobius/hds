/**
 * hds-nav-data — derives HDS sidebar navigation sections from the component registry.
 *
 * Registry entries opt into the sidebar via `navSection` + `navOrder` fields.
 * Internal routes not in the registry (e.g. /ops, /hds/component-health) are
 * appended as static entries in the `INTERNAL_NAV_ITEMS` array below.
 *
 * This module is the single source of truth for HDS_NAV_SECTIONS in HDSLayout.
 * Add a new page to the sidebar by setting navSection + navOrder in hds-registry.json.
 */

import registryData from './hds-registry.json';

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

// ── Registry entry shape (minimal) ────────────────────────────────────────────

type RegistryEntry = {
  page: string;
  path: string;
  category: string;
  navSection?: string;
  navOrder?: number;
  [key: string]: unknown;
};

// ── Static additions (routes not in the registry) ────────────────────────────

const INTERNAL_NAV_ITEMS: NavItem[] = [
  { path: '/ops',                      label: 'Ops HQ' },
  { path: '/ops/hds/component-health', label: 'Component Health' },
  { path: '/ops/hds/brand-theming',    label: 'Brand Theming' },
];

// ── Derivation ────────────────────────────────────────────────────────────────

/**
 * Build HDS_NAV_SECTIONS from registry metadata.
 *
 * Registry entries with `navSection` set are grouped by that label and sorted
 * by `navOrder`. Duplicate paths (e.g. the two Shape entries) are de-duped,
 * keeping the first occurrence of each path in order.
 */
function buildNavSections(): HdsNavSection[] {
  const registry = registryData as RegistryEntry[];

  // Collect entries that opt into the nav
  const navEntries = registry
    .filter((e) => e.navSection != null)
    .sort((a, b) => (a.navOrder ?? 999) - (b.navOrder ?? 999));

  // Group by navSection while preserving insertion order and de-duping paths
  const sectionMap = new Map<string, NavItem[]>();
  const seenPaths = new Set<string>();

  for (const entry of navEntries) {
    const section = entry.navSection!;
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    if (!seenPaths.has(entry.path)) {
      seenPaths.add(entry.path);
      sectionMap.get(section)!.push({ path: entry.path, label: entry.page });
    }
  }

  // Build result, adding special-case flags where the original code needed them
  const sections: HdsNavSection[] = [];

  for (const [label, items] of sectionMap) {
    const section: HdsNavSection = { label, items };

    if (label === 'Foundations') {
      section.getExact = (item) => item.path === '/ops/hds/color';
    }

    if (label === 'Components') {
      section.getIndent = (item) => item.path.startsWith('/ops/hds/components');
    }

    sections.push(section);
  }

  // Append internal section (routes not tracked in the registry)
  sections.push({ label: 'Internal', items: INTERNAL_NAV_ITEMS });

  return sections;
}

/**
 * Pre-built HDS_NAV_SECTIONS — import this in HDSLayout instead of the
 * hardcoded array.
 */
export const HDS_NAV_SECTIONS: ReadonlyArray<HdsNavSection> = buildNavSections();
