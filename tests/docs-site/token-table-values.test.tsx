/**
 * Seam under test: the rendered docs token tables (docs-site/components/token-table.tsx),
 * on every foundation page and every component page. When a table has a Dark column, a
 * token with no Dark mode shows its actual value there, styled like the light value,
 * never a "Same" placeholder.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TokenRows, TokenTable } from '../../docs-site/components/token-table';
import { ComponentTokens } from '../../docs-site/components/component-tokens';
import { TOKEN_PAGES, type TokenRow } from '../../docs-site/lib/token-tables';
import { loadManifestSpecs } from '../../docs-site/lib/site-data';

const cells = (html: string) => [...html.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]!);
const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('token tables', () => {
  // Every manifest component, slugged the way ComponentTokens resolves it, rather
  // than content/docs/components/*.mdx: those pages are generated and gitignored,
  // so a fresh checkout (and CI's `pnpm test`) has none.
  const componentSlugs = Object.keys(loadManifestSpecs()).map((n) =>
    n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(),
  );
  const rendered = [
    ...TOKEN_PAGES.map((page) => [page, renderToStaticMarkup(<TokenTable page={page} />)] as const),
    ...componentSlugs.map(
      (slug) => [slug, renderToStaticMarkup(<ComponentTokens slug={slug} />)] as const,
    ),
  ];

  it('covers the component pages', () => {
    expect(componentSlugs.length).toBeGreaterThanOrEqual(40);
  });

  it.each(rendered)('%s never says "Same" in a value cell', (_, html) => {
    for (const cell of cells(html)) expect(text(cell).trim()).not.toBe('Same');
    expect(html).not.toContain('hds-token-same');
  });

  it('shows a single-mode token’s value in the Dark column, styled like the light value', () => {
    const row = (token: string, darkValue: string | null): TokenRow => ({
      token,
      cssVar: `--${token.replace(/\./g, '-')}`,
      value: '4px',
      darkValue,
      description: '',
      swatch: false,
      fill: null,
      darkFill: null,
    });
    const html = renderToStaticMarkup(
      <TokenRows rows={[row('semantic.radius.a', '8px'), row('semantic.radius.b', null)]} />,
    );
    const [, , , , light, dark] = cells(html);
    expect(dark).toBe(light);
    expect(text(dark!)).toBe('4px');
  });
});
