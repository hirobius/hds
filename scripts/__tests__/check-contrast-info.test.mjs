/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BASE_PAIRS } from '../lib/contrast-pairs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('check-contrast covers the info tone (hds#1473)', () => {
  it('holds info text to AA on the page, raised and its own badge fill', () => {
    const labels = BASE_PAIRS.map((p) => p.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'feedback.info / surface.page',
        'feedback.info / surface.raised',
        'feedback.info / feedback.bg.info',
      ]),
    );
  });

  it('reads the oklch blue ramp, so the dark info pairs are measured, not skipped', () => {
    const out = execFileSync('node', ['scripts/check-contrast.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toContain('WCAG contrast check passed');
    expect(out).toMatch(/feedback\.info \/ feedback\.bg\.info\s+\d+\.\d:1\s+\d+\.\d:1/);
  });
});
