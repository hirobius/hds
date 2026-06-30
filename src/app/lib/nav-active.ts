/**
 * nav-active — the single active-state rule for navigation items.
 *
 * Previously this 3-line predicate was copy-pasted in three places (NavGroup,
 * and HDSLayout's NestedNavGroup + SideNavItem). Centralized here so "is this
 * nav item active?" has exactly one definition (ADR-017, Phase 4).
 */

/**
 * Whether a nav item is active for the current path.
 *
 * - `exact`: the route must match precisely (e.g. `/` or a landing page that
 *   shares a prefix with its children).
 * - otherwise: active when the current path equals the item path OR is a
 *   descendant route (`/components` is active on `/components/actions`).
 */
export function isNavItemActive(currentPath: string, itemPath: string, exact = false): boolean {
  if (exact) return currentPath === itemPath;
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}
