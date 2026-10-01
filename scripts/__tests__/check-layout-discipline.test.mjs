/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-layout-discipline's guidance (hds#404): what it tells a caller to
 * write instead of a raw layout value must be a form Box `sx` resolves, and
 * never one of Box `sx`'s deprecated spacing names (hds#206).
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = 'scripts/check-layout-discipline.mjs';
const header = readFileSync(join(ROOT, GATE), 'utf8').split('*/')[1];

describe('the header examples', () => {
  const recommendations = [...header.matchAll(/Box sx=\{\{([^}]*)\}\}/g)].map((m) => m[1]);

  it('recommend no deprecated Box sx spacing name', () => {
    expect(recommendations.length).toBeGreaterThan(0);
    for (const sx of recommendations) expect(sx).not.toMatch(/'(tight|normal|inset|spacious)'/);
  });

  it('recommend the fixed step that renders 12px for the 12px example, since no scale step does', () => {
    expect(header).toMatch(
      /marginBottom: '12px' \}\}\s+→ should be Box sx=\{\{ mb: hds\.space\.px12 \}\}/,
    );
  });

  it('recommend the scale step for a value on the scale', () => {
    expect(header).toMatch(/marginBottom: '16px' \}\}\s+→ should be Box sx=\{\{ mb: 'sm' \}\}/);
  });
});

describe('the fix line', () => {
  const run = spawnSync(process.execPath, [GATE], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      HDS_FIXTURE_MODE: '1',
      FIXTURE_FILE: 'fixtures/check-layout-discipline/violating.example.tsx',
    },
  });

  it('still fails the violating fixture', () => {
    expect(run.status).toBe(1);
  });

  it('names the sx shorthand that resolves a scale step, not the CSS property Box passes through', () => {
    expect(run.stdout).toContain("Fix: use Box sx={{ mb: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }}");
    expect(run.stdout).toContain("Fix: use Box sx={{ gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }}");
    expect(run.stdout).not.toContain('sx={{ marginBottom:');
  });

  it('keeps the token-key advice for a prop with no spacing shorthand', () => {
    expect(run.stdout).toContain('Fix: use Box sx={{ top: <token key> }}');
  });
});
