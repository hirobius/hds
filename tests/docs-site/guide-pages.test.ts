/**
 * Guides (hds#649, hds#650) make claims a reader can act on: an import path, a
 * pnpm script, a file on GitHub. Each one must point at something real, so a
 * renamed export, script or file fails here instead of misleading a reader.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const GUIDES = ['getting-started', 'tokens'];
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  name: string;
  exports: Record<string, unknown>;
  scripts: Record<string, string>;
  bin: Record<string, string>;
};

const read = (slug: string) =>
  readFileSync(join(ROOT, 'content/docs/guides', `${slug}.mdx`), 'utf8');

describe.each(GUIDES)('guides/%s', (slug) => {
  it('exists with frontmatter', () => {
    expect(existsSync(join(ROOT, 'content/docs/guides', `${slug}.mdx`))).toBe(true);
    expect(read(slug)).toMatch(/^---\ntitle: /);
  });

  it('imports only paths the package exports', () => {
    const specifiers = [
      ...read(slug).matchAll(/['"](@hirobius\/design-system(?:\/[\w./-]+)?)['"]/g),
    ].map((m) => m[1]!);
    const bad = specifiers
      .map((s) => `.${s.slice(pkg.name.length)}`)
      .filter((sub) => !(sub in pkg.exports));
    expect(bad).toEqual([]);
  });

  it('names only pnpm scripts that exist', () => {
    const scripts = [...read(slug).matchAll(/\bpnpm ([a-z][\w:-]*)/g)]
      .map((m) => m[1]!)
      .filter((s) => !['add', 'install', 'exec', 'dlx'].includes(s));
    expect(scripts.filter((s) => !(s in pkg.scripts))).toEqual([]);
  });

  it('links only to repo files that exist', () => {
    const paths = [
      ...read(slug).matchAll(/github\.com\/hirobius\/hds\/(?:blob|tree)\/main\/([^)#\s"']+)/g),
    ].map((m) => m[1]!);
    expect(paths.filter((p) => !existsSync(join(ROOT, p)))).toEqual([]);
  });

  it('runs only bins the package ships', () => {
    const bins = [...read(slug).matchAll(/npx @hirobius\/design-system(?:@[\w.]+)? ([\w-]+)/g)].map(
      (m) => m[1]!,
    );
    const ok = new Set(['upgrade']);
    expect(bins.filter((b) => !ok.has(b))).toEqual([]);
    expect(pkg.bin['design-system']).toBe('codemods/upgrade.mjs');
  });
});
