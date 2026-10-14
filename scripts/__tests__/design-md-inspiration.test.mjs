/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The inspiration-source rule in DESIGN.source.md (hds#632, method in hds#628): agents look at
 * 21st.dev first for visual ideas, never copy its code, and HDS tokens and rules always win.
 * Only the source is checked; `build-design-md --check` keeps the generated DESIGN.md equal to it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../../DESIGN.source.md'), 'utf8');
const rule = source.split('\n').find((l) => l.includes('21st.dev') && /inspiration/i.test(l));

describe('DESIGN.source.md inspiration rule (hds#632)', () => {
  it('names 21st.dev as the inspiration source', () => {
    expect(rule).toBeDefined();
  });

  it('allows ideas, never code', () => {
    expect(rule).toMatch(/ideas, never code/i);
  });

  it('keeps HDS tokens and rules on top', () => {
    expect(rule).toMatch(/HDS tokens and rules always win/);
  });
});
