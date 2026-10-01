// @vitest-environment node
/**
 * The docs-site data under src/app/data is hand-kept, so the 0.20.0 removals
 * (hds#389 R1, hds#394) do not regenerate it. It must not keep listing a component the
 * package no longer has: the six Hds* aliases, the five hds#232 docs/lab
 * components (plus the "Token node" variant of the deleted Token) and every
 * name in codemods/removed-0.20.json.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(__dirname, '..', 'src/app/data');
const json = (rel: string) => JSON.parse(readFileSync(resolve(DATA, rel), 'utf8'));

const REMOVED = new Set([
  'HdsCheckbox',
  'HdsRadio',
  'HdsSelect',
  'HdsSlider',
  'HdsToggle',
  'HdsTooltip',
  'CinematicLink',
  'ComponentInstanceMatrix',
  'FoundationSwatch',
  'Sketch',
  'Token',
  'Token node',
]);
// Plus every name codemods/removed-0.20.json lists (hds#394 wave 4a and the rest
// of the no-replacement removals).
for (const names of Object.values(
  JSON.parse(readFileSync(resolve(__dirname, '..', 'codemods/removed-0.20.json'), 'utf8'))
    .modules as Record<string, string[]>,
))
  names.forEach((n) => REMOVED.add(n));
// And the names removed with a survivor (`replaced`, hds#394 wave 4b).
for (const names of Object.values(
  (JSON.parse(readFileSync(resolve(__dirname, '..', 'codemods/removed-0.20.json'), 'utf8'))
    .replaced ?? {}) as Record<string, Record<string, string>>,
))
  Object.keys(names).forEach((n) => REMOVED.add(n));

/** Every value under a key named `key`, anywhere in the tree. */
function valuesOf(node: unknown, key: string, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => valuesOf(n, key, out));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) {
      if (k === key && typeof v === 'string') out.push(v);
      valuesOf(v, key, out);
    }
  return out;
}

describe('docs-site data after the 0.20.0 removals', () => {
  it('hds-registry.json lists no removed component', () => {
    const registry = json('hds-registry.json');
    const names = (registry as { components?: { name: string }[] }[]).flatMap((page) =>
      (page.components ?? []).map((c) => c.name),
    );
    expect(names.filter((n) => REMOVED.has(n))).toEqual([]);
  });

  it('foundations/*.json token rows name no removed component', () => {
    const offenders = readdirSync(resolve(DATA, 'foundations'))
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) =>
        valuesOf(json(`foundations/${f}`), 'component').flatMap((list) =>
          list
            .split(',')
            .map((s) => s.trim())
            .filter((name) => REMOVED.has(name))
            .map((name) => `${f}: ${name}`),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
