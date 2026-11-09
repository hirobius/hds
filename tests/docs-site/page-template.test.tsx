/**
 * hds#1395: one page template. The intro, the live example, Best practices and the pager stay
 * open; deep sections (sizes and variants prose, API, Accessibility, design tokens) sit in a
 * collapsed `details.hds-fold`. This fails when a docs page renders one of them as an open
 * heading, and checks that a deep link such as #accessibility opens its fold.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { foldSlug, openFoldForHash } from '../../docs-site/components/fold-hash';

const DEEP =
  /^#{2,3}\s+(API|Props|Accessibility|Design tokens|Sizes|Weights|Variants|Sizes and weights)\s*$/;

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? mdxFiles(path) : path.endsWith('.mdx') ? [path] : [];
  });
}

/** Deep-section headings outside a <details> block, as "file:line heading". */
export function openDeepSections(path: string, text: string): string[] {
  let depth = 0;
  let fence = false;
  return text.split('\n').flatMap((line, i) => {
    if (/^```/.test(line)) fence = !fence;
    if (fence) return [];
    depth += (line.match(/<details\b/g) ?? []).length;
    depth -= (line.match(/<\/details>/g) ?? []).length;
    return depth === 0 && DEEP.test(line) ? [`${path}:${i + 1} ${line.trim()}`] : [];
  });
}

describe('docs page template (hds#1395)', () => {
  it('no docs page shows a deep section outside a fold', () => {
    const offenders = mdxFiles('content/docs').flatMap((f) =>
      openDeepSections(f, readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('the check catches an open Accessibility heading and ignores a folded one', () => {
    expect(openDeepSections('x.mdx', '## Accessibility\n\ntext')).toHaveLength(1);
    expect(
      openDeepSections('x.mdx', '<details className="hds-fold">\n## Accessibility\n</details>'),
    ).toHaveLength(0);
  });

  it('the Icons page folds Sizes and weights and Accessibility', () => {
    const page = readFileSync('content/docs/foundations/icons.mdx', 'utf8');
    expect(page).toMatch(/<details className="hds-fold">\s*<summary>Sizes and weights<\/summary>/);
    expect(page).toMatch(/<details className="hds-fold">\s*<summary>Accessibility<\/summary>/);
  });

  it('a #accessibility deep link opens that fold', () => {
    document.body.innerHTML =
      '<details class="hds-fold"><summary>API</summary></details>' +
      '<details class="hds-fold"><summary>Accessibility</summary><p>x</p></details>';
    window.history.replaceState(null, '', '#accessibility');
    const target = openFoldForHash(document) as HTMLDetailsElement;
    expect(target.querySelector('summary')?.textContent).toBe('Accessibility');
    expect(target.open).toBe(true);
    expect((document.querySelector('details') as HTMLDetailsElement).open).toBe(false);
    expect(foldSlug('Design tokens')).toBe('design-tokens');
  });
});
