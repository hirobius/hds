import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8');

describe('theme.css focus ring', () => {
  it('paints .hds-focus:focus-visible without an input-modality gate', () => {
    expect(css).toMatch(/^\.hds-focus:focus-visible\s*\{/m);
  });

  it('has no rule that requires html[data-input-modality] to show the ring', () => {
    expect(css).not.toMatch(/data-input-modality[^{]*\.hds-focus/);
  });
});
