/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the dark-mode alias re-emission (scripts/lib/dark-alias-reemit.mjs).
 *
 * WHY THIS EXISTS (#245)
 * ──────────────────────
 * A custom property is substituted on the element where it is DECLARED, using
 * that element's computed value of whatever it references. `--role-border:
 * var(--semantic-color-border-default)` is declared in `:root`, so it is
 * computed against `:root`'s semantic value and then INHERITS down as a
 * finished colour.
 *
 * When `data-theme="dark"` lands on `<html>` — which is `:root` — the dark
 * override wins on that same element and the alias computes dark. Measured in
 * Chromium: all four probes flip correctly.
 *
 * When it lands on a DESCENDANT — a themed section, a preview stage — the
 * semantic flips at that element but the alias was already computed upstream,
 * so it inherits its LIGHT value onto a dark surface. Measured: all 55 stuck.
 *
 *   data-theme on <html>       --role-border  light #e5e5e5  dark #404040  FLIPS
 *   data-theme on a descendant --role-border  light #e5e5e5  dark #e5e5e5  STUCK
 *
 * So the bug is not "dark mode is broken" — the app and the documented
 * consumer setup both theme the root and are fine. It is "scoping a theme to a
 * SUBTREE is broken", which docs/CONSUMING.md offers as a supported pattern.
 *
 * The fix is to re-declare every theme-sensitive alias inside the dark block,
 * so it re-computes at whichever element carries the attribute.
 *
 * WHY A FIXPOINT AND NOT ONE HOP. Today every affected chain is alias →
 * semantic → primitive, and every semantic is already re-declared, so one hop
 * would do. A three-deep chain added later would silently break again, and
 * this defect is expensive precisely because nothing catches it.
 */

import { describe, it, expect } from 'vitest';

import { darkAliasReemissions } from '../lib/dark-alias-reemit.mjs';

const decl = (n, v) => `  ${n}: ${v};`;

describe('darkAliasReemissions', () => {
  it('re-emits an alias whose target is overridden in dark', () => {
    const root = [
      decl('--semantic-border', 'var(--primitive-neutral-200)'),
      decl('--role-border', 'var(--semantic-border)'),
    ];
    const dark = [decl('--semantic-border', 'var(--primitive-neutral-700)')];
    expect(darkAliasReemissions(root, dark)).toEqual([
      decl('--role-border', 'var(--semantic-border)'),
    ]);
  });

  it('follows a chain deeper than one hop — the reason this is a fixpoint', () => {
    const root = [
      decl('--semantic-border', 'var(--primitive-neutral-200)'),
      decl('--role-border', 'var(--semantic-border)'),
      decl('--component-card-border', 'var(--role-border)'),
    ];
    const dark = [decl('--semantic-border', 'var(--primitive-neutral-700)')];
    expect(darkAliasReemissions(root, dark)).toEqual([
      decl('--role-border', 'var(--semantic-border)'),
      decl('--component-card-border', 'var(--role-border)'),
    ]);
  });

  it('preserves :root declaration order, so the output is stable across builds', () => {
    const root = [
      decl('--semantic-x', 'var(--p-1)'),
      decl('--c-b', 'var(--semantic-x)'),
      decl('--c-a', 'var(--semantic-x)'),
    ];
    const dark = [decl('--semantic-x', 'var(--p-2)')];
    expect(darkAliasReemissions(root, dark).map((l) => l.trim().split(':')[0])).toEqual([
      '--c-b',
      '--c-a',
    ]);
  });
});

describe('darkAliasReemissions — what it must NOT re-emit', () => {
  it('skips an alias already re-declared in dark', () => {
    const root = [
      decl('--semantic-border', 'var(--primitive-neutral-200)'),
      decl('--role-border', 'var(--semantic-border)'),
    ];
    const dark = [
      decl('--semantic-border', 'var(--primitive-neutral-700)'),
      decl('--role-border', 'var(--something-else)'),
    ];
    // Re-emitting would duplicate the declaration and, being later in the
    // block, would silently override a deliberate dark-specific value.
    expect(darkAliasReemissions(root, dark)).toEqual([]);
  });

  it('skips an alias whose target never changes between themes', () => {
    const root = [
      decl('--primitive-neutral-500', '#737373'),
      decl('--role-input', 'var(--primitive-neutral-500)'),
    ];
    expect(darkAliasReemissions(root, [])).toEqual([]);
  });

  it('skips a literal value, which is not an alias at all', () => {
    const root = [decl('--semantic-x', 'var(--p-1)'), decl('--role-y', '#ff0000')];
    const dark = [decl('--semantic-x', 'var(--p-2)')];
    expect(darkAliasReemissions(root, dark)).toEqual([]);
  });

  it('skips a composite value that merely CONTAINS a var()', () => {
    // `0 1px 2px var(--shadow-color)` is substituted at use, not copied as a
    // finished value, so it does not have this defect. Re-emitting it would be
    // noise at best.
    const root = [
      decl('--semantic-x', 'var(--p-1)'),
      decl('--role-shadow', '0 1px 2px var(--semantic-x)'),
    ];
    const dark = [decl('--semantic-x', 'var(--p-2)')];
    expect(darkAliasReemissions(root, dark)).toEqual([]);
  });

  it('returns nothing when there is no dark block at all', () => {
    const root = [decl('--a', 'var(--b)'), decl('--b', '#000')];
    expect(darkAliasReemissions(root, [])).toEqual([]);
  });

  it('terminates on a cyclic alias rather than looping forever', () => {
    const root = [decl('--a', 'var(--b)'), decl('--b', 'var(--a)')];
    expect(() => darkAliasReemissions(root, [decl('--a', '#000')])).not.toThrow();
  });
});
