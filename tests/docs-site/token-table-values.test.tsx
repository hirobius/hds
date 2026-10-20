/**
 * Seam under test: the rendered docs token tables (docs-site/components/token-table.tsx),
 * on every foundation page and every component page. When a table has a Dark column, a
 * token with no Dark mode shows its actual value there, styled like the light value,
 * never a "Same" placeholder.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { TokenRows, TokenTable } from '../../docs-site/components/token-table';
import { ComponentTokens } from '../../docs-site/components/component-tokens';
import { TOKEN_PAGES, type TokenRow } from '../../docs-site/lib/token-tables';

const cells = (html: string) => [...html.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]!);
const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('token tables', () => {
  const componentSlugs = readdirSync('content/docs/components')
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
  const rendered = [
    ...TOKEN_PAGES.map((page) => [page, renderToStaticMarkup(<TokenTable page={page} />)] as const),
    ...componentSlugs.map(
      (slug) => [slug, renderToStaticMarkup(<ComponentTokens slug={slug} />)] as const,
    ),
  ];

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
    });
    const html = renderToStaticMarkup(
      <TokenRows rows={[row('semantic.radius.a', '8px'), row('semantic.radius.b', null)]} />,
    );
    const [, , , , light, dark] = cells(html);
    expect(dark).toBe(light);
    expect(text(dark!)).toBe('4px');
  });
});
