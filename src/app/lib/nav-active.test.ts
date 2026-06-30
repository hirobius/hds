/** Tests for isNavItemActive — the single nav active-state rule (ADR-017 Phase 4). */
import { describe, it, expect } from 'vitest';
import { isNavItemActive } from './nav-active';

describe('isNavItemActive', () => {
  it('matches the exact path', () => {
    expect(isNavItemActive('/color', '/color')).toBe(true);
  });

  it('matches descendant routes by prefix (non-exact)', () => {
    expect(isNavItemActive('/components/actions', '/components')).toBe(true);
    expect(isNavItemActive('/components', '/components')).toBe(true);
  });

  it('does not match a sibling that merely shares a string prefix', () => {
    // '/components-lab' must NOT be active for '/components' — the boundary is a slash.
    expect(isNavItemActive('/components-lab', '/components')).toBe(false);
  });

  it('exact mode ignores descendants', () => {
    expect(isNavItemActive('/color/swatch', '/color', true)).toBe(false);
    expect(isNavItemActive('/color', '/color', true)).toBe(true);
  });

  it('exact mode is needed for root so it is not active everywhere', () => {
    expect(isNavItemActive('/anything', '/', true)).toBe(false);
  });
});
