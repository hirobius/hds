/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The agent projection (public/hds-manifest-agent.json) must keep the a11y
 * contract: its `a11yRules` total equals the full manifest's (hds#339). The
 * projection used to strip them, so the published agent JSON never carried the
 * keyboard and ARIA rules.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

const countRules = (manifest) =>
  Object.values(manifest.componentSpecs ?? {}).reduce(
    (n, spec) => n + (spec.a11yRules?.length ?? 0),
    0,
  );

describe('agent manifest projection', () => {
  execFileSync('node', ['scripts/generate-manifest-projection.mjs'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  const full = read('public/hds-manifest.json');
  const agent = read('public/hds-manifest-agent.json');

  it('keeps every a11yRule of the full manifest', () => {
    expect(countRules(full)).toBeGreaterThan(0);
    expect(countRules(agent)).toBe(countRules(full));
  });

  it('does not list a11yRules among the stripped fields', () => {
    expect(agent._agentProjection.strippedFields).not.toContain('a11yRules');
  });

  it('lets usage and keyboard through', () => {
    expect(agent.componentSpecs.Button.usage.when).toEqual(expect.any(String));
    expect(agent.componentSpecs.Menu.keyboard.length).toBeGreaterThan(0);
  });
});
