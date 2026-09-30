/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#206 slice 3 — the two runtime-overridden spacing tokens.
 *
 * semantic.space.component.padding (tenant + density override in
 * tenants.css) and semantic.space.layout.gutter (responsive override in
 * theme.css) are renamed to semantic.space.surface.padding and
 * semantic.space.region.gutter. Their overrides are expressed as steps on
 * the t-shirt scale, and the old names stay as $deprecated aliases so
 * consumers that have not run the codemod keep the same computed values.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const tokens = JSON.parse(read('hirobius.tokens.json'));
const space = tokens.semantic.space;

describe('canonical overridable spacing tokens', () => {
  it('surface.padding and region.gutter default to scale.md (24px, unchanged)', () => {
    expect(space.surface.padding.$value).toBe('{semantic.space.scale.md}');
    expect(space.region.gutter.$value).toBe('{semantic.space.scale.md}');
  });

  it('keeps component.padding and layout.gutter as $deprecated aliases of the new names', () => {
    expect(space.component.padding.$value).toBe('{semantic.space.surface.padding}');
    expect(space.component.padding.$deprecated).toMatch(/surface\.padding/);
    expect(space.layout.gutter.$value).toBe('{semantic.space.region.gutter}');
    expect(space.layout.gutter.$deprecated).toMatch(/region\.gutter/);
  });
});

describe('runtime overrides sit on the new names and on scale steps', () => {
  it('brutalist-demo overrides surface.padding with scale.sm, scale.xs under compact', () => {
    const overlay = JSON.parse(read('tenants/brutalist-demo/tokens.json'));
    const leaf = overlay.semantic.space.surface.padding;
    expect(leaf.$value).toBe('{semantic.space.scale.sm}');
    expect(leaf.$extensions['com.figma.variables'].modes.Compact).toBe('{semantic.space.scale.xs}');
    expect(overlay.semantic.space.component).toBeUndefined();
  });

  it('tenants.css overrides the new var and re-anchors the deprecated alias', () => {
    const css = read('src/styles/tenants.css');
    expect(css).toMatch(/--semantic-space-surface-padding: var\(\s*--semantic-space-scale-sm\s*\)/);
    expect(css).toMatch(/--semantic-space-surface-padding: var\(\s*--semantic-space-scale-xs\s*\)/);
    expect(css).toMatch(
      /--semantic-space-component-padding: var\(\s*--semantic-space-surface-padding\s*\)/,
    );
    expect(css).not.toMatch(/--semantic-space-component-padding: var\(\s*--primitive-/);
  });

  it('theme.css sets region.gutter responsively from scale steps, not raw px', () => {
    const css = read('src/styles/theme.css');
    expect(css).toContain('--semantic-space-region-gutter: var(--semantic-space-scale-lg);');
    expect(css).toContain('--semantic-space-region-gutter: var(--semantic-space-scale-sm);');
    // The deprecated alias is only re-declared inside the zero-specificity compact
    // scope (hds#336), so nested scopes resolve it against the remapped scale;
    // everywhere else it follows region.gutter via its :root alias in tokens.css.
    const outsideCompact = css.replace(/:where\(\[data-density='compact'\]\)\s*\{[^}]*\}/g, '');
    expect(outsideCompact).not.toMatch(/--semantic-space-layout-gutter\s*:/);
  });

  it('tokens.css declares the deprecated aliases as var() of the new names', () => {
    const css = read('src/styles/tokens.css');
    expect(css).toContain(
      '--semantic-space-component-padding: var(--semantic-space-surface-padding);',
    );
    expect(css).toContain('--semantic-space-layout-gutter: var(--semantic-space-region-gutter);');
  });
});
