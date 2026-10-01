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

  it('recommend the semantic 12px token for the 12px example, then the fixed step, since no scale step renders 12px', () => {
    // MANIFEST_SYNC.md §2: product UI uses semantic tokens; hds.space.px12 is a primitive.
    expect(header).toMatch(
      /marginBottom: '12px' \}\}\s+→ should be Box sx=\{\{ mb: 'var\(--semantic-space-component-medium\)' \}\}/,
    );
    expect(header).toMatch(/\bor Box sx=\{\{ mb: hds\.space\.px12 \}\}/);
  });

  it('name a semantic token that is live and 12px at every density', () => {
    const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
    const medium = tokens.semantic.space.component.medium;
    expect(medium.$deprecated).toBeUndefined();
    expect(medium.$value).toBe('{primitive.space.3}');
    expect(tokens.primitive.space['3'].$value).toEqual({ value: 12, unit: 'px' });
    // No tenant or density block remaps it.
    for (const css of ['src/styles/tenants.css', 'src/styles/theme.css']) {
      expect(readFileSync(join(ROOT, css), 'utf8')).not.toContain(
        '--semantic-space-component-medium:',
      );
    }
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
