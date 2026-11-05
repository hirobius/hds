import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// hds#751: Button and SegmentedControl already animate on HDS motion tokens
// (useHdsMotion, zero under prefers-reduced-motion, plus productive-token
// Tailwind transitions that theme.css zeroes), so their motion-ok exemptions
// were stale. check-motion now fails a stale exemption; this pins the two
// files that carried one.
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8');

describe('components that animate carry no motion-ok exemption', () => {
  for (const file of ['button.tsx', 'segmented-control.tsx']) {
    it(`${file} has motion and no exemption`, () => {
      const src = read(file);
      expect(src).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
      expect(src).toMatch(/useHdsMotion\('productive'\)/);
      expect(src).toContain('duration-[var(--hds-motion-productive-duration)]');
    });
  }
});
