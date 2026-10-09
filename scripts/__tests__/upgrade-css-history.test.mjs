/**
 * The CSS facts of the committed release snapshots (hds#449), whose css
 * sections were backfilled from the npm tarballs (`snapshot.mjs --from-npm
 * <v>` reproduces each byte for byte). They pin what the diff reads from the
 * published stylesheets, and how the history treats releases whose ledgers
 * were frozen before CSS facts existed.
 */
import { describe, expect, it } from 'vitest';
import { diffSnapshots, readSnapshot } from '../upgrade/diff.mjs';
import { LAST_RELEASE_WITHOUT_CSS_STEPS, needsStep, uncoveredFacts } from '../upgrade/ledger.mjs';
import { Snapshot } from '../upgrade/schema.mjs';

const cssFacts = (prev, next) =>
  diffSnapshots(readSnapshot(prev), readSnapshot(next)).filter((f) =>
    /^(css-var|class|utility|font-face)-/.test(f.kind),
  );
const names = (facts, kind) => facts.filter((f) => f.kind === kind).map((f) => f.name);

describe('the 0.19.1 -> 0.20.0 stylesheets', () => {
  const facts = cssFacts('0.19.1', '0.20.0');

  it('lost the 23 hds-* classes the 0.20.0 CHANGELOG lists, from styles.css and tokens.css', () => {
    const removed = facts.filter((f) => f.kind === 'class-removed');
    expect(removed.map((f) => f.name)).toEqual([
      'hds-desktop-nav-button',
      'hds-doc-link-card',
      'hds-doc-section-copy-icon',
      'hds-doc-section-header',
      'hds-dropdown-indicator',
      'hds-dropdown-item',
      'hds-dropdown-label',
      'hds-mobius-acrylic',
      'hds-nav-indicator',
      'hds-page-enter',
      'hds-sidebar-utility-button',
      'hds-sketchbook-canvas-fill',
      'hds-sketchbook-canvas-overlay',
      'hds-sketchbook-canvas-overlay__content',
      'hds-sketchbook-canvas-shell',
      'hds-sketchbook-canvas-stage',
      'hds-sketchbook-shell__stage-frame',
      'hds-soft-nav-card',
      'hds-stepper-input',
      'hds-token-chip',
      'hds-visuals-bento-card',
      'hds-visuals-bento-grid',
      'hds-visuals-bento-item',
    ]);
    for (const fact of removed) expect(fact.bundles).toEqual(['./styles.css', './tokens.css']);
  });

  it('lost 129 Tailwind utilities with them, recorded for information only', () => {
    const utilities = facts.filter((f) => f.kind === 'utility-removed');
    expect(utilities).toHaveLength(129);
    expect(utilities.every((f) => !needsStep(f))).toBe(true);
    // 152 class names in all, the count the ticket's first audit found.
    expect(utilities.length + names(facts, 'class-removed').length).toBe(152);
  });
});

describe('the 0.16.0 -> 0.17.0 type ramp', () => {
  const facts = cssFacts('0.16.0', '0.17.0');

  it('changed the ten primitive type sizes, --primitive-typography-size-xs from 13px to 12px', () => {
    const sizes = facts.filter(
      (f) => f.kind === 'css-var-changed' && f.name.startsWith('--primitive-typography-size-'),
    );
    expect(sizes).toHaveLength(10);
    expect(facts).toContainEqual({
      id: 'css-var-changed:--primitive-typography-size-xs::root',
      kind: 'css-var-changed',
      name: '--primitive-typography-size-xs',
      context: ':root',
      from: '13px',
      to: '12px',
      bundles: ['./styles.css', './tokens.css', './variables.css'],
    });
  });

  it('is recorded, not required to have a step: the 0.17.0 ledger is frozen with its sources', () => {
    expect(uncoveredFacts(facts, [], { version: '0.17.0' })).toEqual([]);
    // The same facts in a release after LAST_RELEASE_WITHOUT_CSS_STEPS need their steps.
    expect(LAST_RELEASE_WITHOUT_CSS_STEPS).toBe('0.22.0');
    expect(uncoveredFacts(facts, [], { version: '0.23.0' }).map((f) => f.id)).toContain(
      'css-var-changed:--primitive-typography-size-xs::root',
    );
  });
});

describe('every committed release snapshot', () => {
  it('carries a css section of every stylesheet its exports name, fitting the schema', () => {
    for (const version of [
      '0.16.0',
      '0.17.0',
      '0.18.0',
      '0.19.0',
      '0.19.1',
      '0.20.0',
      '0.21.0',
      '0.22.0',
    ]) {
      const snapshot = readSnapshot(version);
      expect(Snapshot.safeParse(snapshot).error, version).toBeUndefined();
      const sheets = snapshot.exportsKeys.filter((key) => key.endsWith('.css'));
      expect(Object.keys(snapshot.css.bundles), version).toEqual(sheets);
    }
  });
});
