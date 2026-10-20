// @vitest-environment node
/**
 * Tag reads its own component tokens (hds#595): the unselected pill's
 * background, border and text come from `--component-tag-*`, in the React
 * component and in the static.css mirror, never from the raw semantic tokens
 * the component tokens alias.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const OWN = ['background', 'border', 'text'] as const;

describe('Tag reads its own tokens', () => {
  const out = JSON.parse(
    execFileSync('node', ['scripts/check-component-token-binding.mjs', '--json'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    }),
  );
  const all = [...out.results, ...(out.cssResults ?? [])];

  it.each(OWN)('tag.%s is BOUND in the component and the static.css mirror', (leaf) => {
    const rows = all.filter((r: { id: string }) => r.id === `tag.${leaf}`);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) expect(r.class).toBe('BOUND');
  });

  it('the unselected pill names no raw semantic colour for its resting surface', () => {
    const unselected = read('src/app/components/tag.tsx').match(/false:\s*'([^']*)'/)![1];
    const resting = unselected.split(/\s+/).filter((c) => !c.includes(':'));
    for (const c of resting) expect(c).not.toContain('--semantic-color');
  });
});
