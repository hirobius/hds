/**
 * Seam under test: the version shows once per page, small beside the "HDS" mark in the nav
 * header (Adrian, doc pages Draft 2, 2026-11-06; moved from a page footer so the page is one
 * fixed frame). The version is read from the root package.json at build time, so it cannot drift.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadPackageVersion } from '../../docs-site/lib/site-data';
import { SiteMark } from '../../docs-site/components/site-mark';

const ROOT = join(__dirname, '..', '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
const text = (html: string) => html.replace(/<[^>]+>/g, '');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (e === 'node_modules' || e === '.next' || e === 'out') return [];
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(tsx?|mdx?)$/.test(e) ? [p] : [];
  });
}

describe('site mark and version', () => {
  it('reads the root package version, not docs-site/package.json', () => {
    expect(loadPackageVersion()).toBe(pkg.version);
  });

  it('renders the nav mark as the short name, then the version beside it', () => {
    const html = renderToStaticMarkup(<SiteMark />);
    // "HDS", so /docs says the full name once, as its H1 (hds#845, hds#1473).
    expect(text(html)).toBe(`HDS v${pkg.version}`);
    expect(html).toContain(`<span class="hds-site-version">v${pkg.version}</span>`);
  });

  it('mounts the mark once, as the docs nav title', () => {
    const docs = readFileSync(join(ROOT, 'docs-site/app/docs/layout.tsx'), 'utf8');
    expect(docs.match(/<SiteMark\s*\/>/g)).toHaveLength(1);
  });

  it('has no page footer: the root layout renders none', () => {
    const root = readFileSync(join(ROOT, 'docs-site/app/layout.tsx'), 'utf8');
    expect(root).not.toMatch(/<footer|SiteFooter|SiteVersion/);
    expect(renderToStaticMarkup(<SiteMark />)).not.toMatch(/<footer/);
  });

  it('reads the version in the nav mark only, so no page shows it twice', () => {
    const readers = sourceFiles(join(ROOT, 'docs-site'))
      .filter((f) => !f.endsWith('lib/site-data.ts'))
      .filter((f) => readFileSync(f, 'utf8').includes('loadPackageVersion('))
      .map((f) => f.slice(ROOT.length + 1));
    expect(readers).toEqual(['docs-site/components/site-mark.tsx']);
  });
});
