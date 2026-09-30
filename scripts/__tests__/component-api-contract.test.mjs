/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The contract tags reach src/app/data/component-api.json, and tag text no
 * longer leaks into `description` (Box's @ai-rules body used to).
 *
 * buildManifest() runs the real docgen over src/, so this is slow; it builds
 * once and every assertion reads that result.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { buildManifest } from '../generate-component-api.mjs';

let components;

beforeAll(() => {
  components = buildManifest().components;
}, 180_000);

describe('component-api contract fields', () => {
  it('keeps @ai-rules text out of the Box description and exposes it as aiRules', () => {
    expect(components.Box.description).not.toContain('sx colors/spacing MUST use token keys');
    expect(components.Box.aiRules).toContain('sx colors/spacing MUST use token keys');
  });

  it('carries usage.when for every worked-example component', () => {
    for (const name of ['Button', 'IconButton', 'Menu', 'Select', 'Card']) {
      expect(components[name]?.usage?.when, name).toEqual(expect.any(String));
      expect(components[name].usage.when.length, name).toBeGreaterThan(19);
    }
  });

  it('does not point Button or Card.Metric at components hds#254 folds into them', () => {
    const targets = (n) => (components[n].usage.useInstead ?? []).map((u) => u.component);
    expect(targets('Button')).not.toContain('IconButton');
    expect(targets('CardMetric')).not.toContain('Stat');
  });

  it('carries keyboard lines for Menu and Select', () => {
    expect(components.Menu.keyboard.length).toBeGreaterThan(0);
    expect(components.Select.keyboard.length).toBeGreaterThan(0);
  });

  it('omits the contract fields on an untagged component', () => {
    const untagged = Object.entries(components).find(
      ([, c]) => !c.usage && !c.keyboard && !c.aiRules,
    );
    expect(untagged).toBeDefined();
  });
}, 180_000);
