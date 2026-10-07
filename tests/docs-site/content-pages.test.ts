/**
 * The docs layout renders the frontmatter title as the page <h1>
 * (DocsTitle), so an MDX body `# Title` makes a second H1 (#516 review). Pages
 * must start their body at H2, and /docs needs a real index page.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT = join(__dirname, '..', '..', 'content', 'docs');

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) return mdxFiles(full);
    return /\.mdx?$/.test(e) ? [full] : [];
  });
}

describe('content/docs', () => {
  it('has no body H1 (the title comes from frontmatter)', () => {
    const offenders: string[] = [];
    for (const file of mdxFiles(CONTENT)) {
      let fenced = false;
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (/^```/.test(line)) fenced = !fenced;
        if (!fenced && /^# /.test(line)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('has an index page for /docs', () => {
    const index = join(CONTENT, 'index.mdx');
    expect(existsSync(index)).toBe(true);
    expect(readFileSync(index, 'utf8')).toMatch(/^---\ntitle: /);
  });
});
