// @vitest-environment node
/**
 * deprecated-exports.json (the eslint plugin's record) derives from the one
 * JSDoc reader behind the shipped deprecations.json — lib/deprecations.mjs
 * `deprecationsInFile`, re-keyed by build-deprecations.mjs. There is no
 * second parser: these tests pin the derived record, its freshness, and its
 * agreement with the shipped record.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildDeprecationsJson } from '../build-deprecations.mjs';

describe('deprecated-exports.json', () => {
  it('lists Blockquote size and Text heading1 with removal versions', () => {
    const { props, propValues } = JSON.parse(buildDeprecationsJson());
    expect(props.find((p) => p.name === 'size' && p.owner === 'BlockquoteProps')).toMatchObject({
      removeIn: '1.0.0',
    });
    expect(propValues.find((v) => v.value === 'heading1')).toMatchObject({ removeIn: '1.0.0' });
  });

  it('is current with the source (run node scripts/build-deprecations.mjs)', () => {
    const committed = readFileSync(
      new URL('../eslint-plugin-hds/rules/deprecated-exports.json', import.meta.url),
      'utf8',
    );
    expect(committed).toBe(buildDeprecationsJson());
  });

  it('lists MetricTile with its removal version', () => {
    const { exports } = JSON.parse(buildDeprecationsJson());
    expect(exports.find((e) => e.name === 'MetricTile')).toMatchObject({ removeIn: '1.0.0' });
  });

  it('agrees with the shipped record: same reader, same component surface', () => {
    const derived = JSON.parse(buildDeprecationsJson());
    const shipped = JSON.parse(
      readFileSync(new URL('../../deprecations.json', import.meta.url), 'utf8'),
    );
    const shippedExports = new Set(shipped.exports.map((e) => e.name));
    // CardMetric is the export a regex reader missed; the AST reader sees it.
    expect(derived.exports.map((e) => e.name)).toContain('CardMetric');
    for (const e of derived.exports) expect(shippedExports.has(e.name)).toBe(true);
    expect(derived.props.map((p) => `${p.owner}.${p.name}`).sort()).toEqual(
      shipped.props.map((p) => `${p.owner}.${p.name}`).sort(),
    );
    expect(derived.propValues.map((v) => `${v.owner}.${v.value}`).sort()).toEqual(
      shipped.propValues.map((v) => `${v.owner}.${v.name}`).sort(),
    );
  });
});
