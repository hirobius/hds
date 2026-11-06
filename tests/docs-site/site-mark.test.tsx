/**
 * Seam under test: the version shows once per page, site-wide, in a footer line
 * (Adrian, doc pages Draft 2, 2026-11-06). The sidebar mark is plain "HDS". The
 * version is read from the root package.json at build time, so it cannot drift.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadPackageVersion } from '../../docs-site/lib/site-data';
import { SiteMark } from '../../docs-site/components/site-mark';
import { SiteFooter } from '../../docs-site/components/site-footer';

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

describe('site mark and footer', () => {
  it('reads the root package version, not docs-site/package.json', () => {
    expect(loadPackageVersion()).toBe(pkg.version);
  });

  it('renders the sidebar mark as plain HDS, with no version', () => {
    expect(text(renderToStaticMarkup(<SiteMark />))).toBe('HDS');
  });

  it('renders one footer line with the name and the version', () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(html).toMatch(/^<footer/);
    expect(text(html)).toBe(`Hirobius Design System v${pkg.version}`);
  });

  it('mounts the footer once, in the root layout, so every route has it', () => {
    const root = readFileSync(join(ROOT, 'docs-site/app/layout.tsx'), 'utf8');
    expect(root.match(/<SiteFooter\s*\/>/g)).toHaveLength(1);
  });

  it('reads the version in the footer only, so no page shows it twice', () => {
    const readers = sourceFiles(join(ROOT, 'docs-site'))
      .filter((f) => !f.endsWith('lib/site-data.ts'))
      .filter((f) => readFileSync(f, 'utf8').includes('loadPackageVersion('))
      .map((f) => f.slice(ROOT.length + 1));
    expect(readers).toEqual(['docs-site/components/site-footer.tsx']);
  });
});
