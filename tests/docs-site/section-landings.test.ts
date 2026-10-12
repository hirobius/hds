/**
 * Seam under test: `sectionLandings(pages)` — which /docs/<section> roots the
 * catch-all route must render as a generated landing (hds#647). A section is a
 * top-level folder of content/docs with pages under it and no index page of its
 * own; components/ and patterns/ are rebuilt by `pnpm docs:components`, so their
 * root can never be a hand-written index.mdx.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sectionLandings } from '../../docs-site/lib/section-landings';

const page = (slugs: string[], title = slugs.join('/')) => ({
  slugs,
  url: `/docs/${slugs.join('/')}`,
  data: { title, description: `About ${title}` },
});

describe('sectionLandings', () => {
  it('returns one landing per top-level folder that has no index page', () => {
    const landings = sectionLandings([
      page([]),
      page(['voice']),
      page(['foundations', 'color'], 'Color'),
      page(['foundations', 'motion'], 'Motion'),
      page(['guides'], 'Guides'),
      page(['guides', 'tokens'], 'Tokens'),
    ]);
    expect(landings.map((l) => l.section)).toEqual(['foundations']);
    expect(landings[0]!.pages.map((p) => p.title)).toEqual(['Color', 'Motion']);
    expect(landings[0]!.pages[0]).toMatchObject({
      url: '/docs/foundations/color',
      description: 'About Color',
    });
  });

  it('titles a landing from the folder name', () => {
    const [landing] = sectionLandings([page(['getting-around', 'a'])]);
    expect(landing!.title).toBe('Getting around');
  });

  it('covers every folder in content/docs that has no index.mdx', () => {
    const root = join(__dirname, '..', '..', 'content', 'docs');
    const folders = readdirSync(root).filter((e) => statSync(join(root, e)).isDirectory());
    const pages = folders.flatMap((f) =>
      readdirSync(join(root, f))
        .filter((e) => e.endsWith('.mdx'))
        .map((e) => page(e === 'index.mdx' ? [f] : [f, e.replace(/\.mdx$/, '')])),
    );
    const expected = folders
      .filter((f) => !existsSync(join(root, f, 'index.mdx')))
      .filter((f) => pages.some((p) => p.slugs[0] === f))
      .sort();
    expect(sectionLandings(pages).map((l) => l.section)).toEqual(expected);
    expect(expected).toContain('foundations');
  });
});
