/**
 * Seam under test: the foundation page sources (content/docs/foundations/*.mdx).
 * hds#847 C: the token gallery comes right after the lead, and Principle plus Best
 * practices live in one collapsed <PrinciplesAndPractices> block, not as top sections.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = ['color', 'typography', 'spacing', 'radius', 'elevation', 'motion'];

describe.each(PAGES)('foundations/%s.mdx', (slug) => {
  const body = readFileSync(`content/docs/foundations/${slug}.mdx`, 'utf8').replace(
    /^---[\s\S]*?---\n/,
    '',
  );
  const h2s = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

  it('opens with the Tokens section and its generated gallery', () => {
    expect(h2s[0]).toBe('Tokens');
    expect(body.trimStart().startsWith('## Tokens\n\n{/* generated: tokens */}')).toBe(true);
  });

  it('keeps Principle and Best practices inside one PrinciplesAndPractices block', () => {
    expect(h2s).not.toContain('Principle');
    expect(h2s).not.toContain('Best practices');
    const block = /<PrinciplesAndPractices>([\s\S]*?)<\/PrinciplesAndPractices>/.exec(body);
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/^### Principle$/m);
    expect(block![1]).toMatch(/^### Best practices$/m);
    expect(body.match(/<PrinciplesAndPractices>/g)).toHaveLength(1);
  });
});
