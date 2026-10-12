/**
 * /docs/engineering is docs/ENGINEERING.md itself (hds#648): the MDX page holds
 * a <RepoDoc path="…" /> tag, and `expandRepoDoc` splices the parsed repo doc
 * in at build — links rewritten to GitHub, the doc's own H1 dropped (the
 * frontmatter title is the page H1), Mermaid fences turned into <Mermaid>.
 * One source, so the page and the doc cannot diverge.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expandRepoDoc, repoDocTags, resolveRepoLink } from '../../docs-site/lib/repo-doc';

const ROOT = join(__dirname, '..', '..');
const BLOB = 'https://github.com/hirobius/hds/blob/main';
const DOC = 'docs/ENGINEERING.md';

type Node = { type: string; [k: string]: unknown; children?: Node[] };
const text = (value: string): Node => ({ type: 'text', value });
const link = (url: string): Node => ({ type: 'link', url, children: [text('x')] });
const heading = (depth: number, value: string): Node => ({
  type: 'heading',
  depth,
  children: [text(value)],
});
const tag = (path: string): Node => ({
  type: 'mdxJsxFlowElement',
  name: 'RepoDoc',
  attributes: [{ type: 'mdxJsxAttribute', name: 'path', value: path }],
  children: [],
});

describe('resolveRepoLink', () => {
  it('resolves a relative link against the doc and points it at GitHub', () => {
    expect(resolveRepoLink('../README.md', DOC, BLOB)).toBe(`${BLOB}/README.md`);
    expect(resolveRepoLink('guardrails/registry.json', DOC, BLOB)).toBe(
      `${BLOB}/docs/guardrails/registry.json`,
    );
    expect(resolveRepoLink('../README.md#theming', DOC, BLOB)).toBe(`${BLOB}/README.md#theming`);
  });

  it('points a directory link at the tree view', () => {
    expect(resolveRepoLink('adr/', DOC, BLOB)).toBe(
      'https://github.com/hirobius/hds/tree/main/docs/adr',
    );
  });

  it('leaves absolute URLs, site routes and in-page anchors alone', () => {
    for (const url of ['https://example.com/a', '/docs/voice', '#section', 'mailto:a@b.c'])
      expect(resolveRepoLink(url, DOC, BLOB)).toBe(url);
  });
});

describe('expandRepoDoc', () => {
  const parsed: Node = {
    type: 'root',
    children: [
      heading(1, 'How HDS is engineered'),
      { type: 'paragraph', children: [link('../README.md'), link('https://w3.org')] },
      heading(2, 'Architecture'),
      { type: 'code', lang: 'mermaid', value: 'flowchart LR\n  A --> B' },
      { type: 'code', lang: 'bash', value: 'pnpm tokens' },
    ],
  };

  const expand = () => {
    const tree: Node = { type: 'root', children: [tag(DOC)] };
    const read: string[] = [];
    expandRepoDoc(tree, {
      read: (p) => (read.push(p), 'source'),
      parse: () => structuredClone(parsed),
      blobBase: BLOB,
    });
    return { tree, read };
  };

  it('replaces the tag with the parsed doc, minus its H1', () => {
    const { tree, read } = expand();
    expect(read).toEqual([DOC]);
    const kids = tree.children!;
    expect(kids.some((n) => n.type === 'heading' && n.depth === 1)).toBe(false);
    expect(kids.find((n) => n.type === 'heading')).toMatchObject({ depth: 2 });
  });

  it('rewrites relative links and keeps absolute ones', () => {
    const para = expand().tree.children!.find((n) => n.type === 'paragraph')!;
    expect(para.children!.map((n) => n.url)).toEqual([`${BLOB}/README.md`, 'https://w3.org']);
  });

  it('turns a mermaid fence into a <Mermaid chart> element and keeps other code', () => {
    const kids = expand().tree.children!;
    const mermaid = kids.find((n) => n.type === 'mdxJsxFlowElement')!;
    expect(mermaid.name).toBe('Mermaid');
    expect(mermaid.attributes).toEqual([
      { type: 'mdxJsxAttribute', name: 'chart', value: 'flowchart LR\n  A --> B' },
    ]);
    expect(kids.filter((n) => n.type === 'code').map((n) => n.lang)).toEqual(['bash']);
  });
});

describe('content/docs/engineering.mdx', () => {
  const page = readFileSync(join(ROOT, 'content/docs/engineering.mdx'), 'utf8');
  const doc = readFileSync(join(ROOT, DOC), 'utf8');

  it('renders docs/ENGINEERING.md through a RepoDoc tag, not a copy', () => {
    expect(repoDocTags(page)).toEqual([DOC]);
    const body = page.replace(/^---[\s\S]*?---/, '');
    expect(body).not.toMatch(/^#{1,6} /m);
    const h2s = doc.split('\n').filter((l) => l.startsWith('## '));
    expect(h2s.length).toBeGreaterThan(5);
    for (const h2 of h2s) expect(page).not.toContain(h2);
  });

  it('takes its title from the doc H1', () => {
    const h1 = doc
      .split('\n')
      .find((l) => l.startsWith('# '))!
      .slice(2);
    expect(page).toMatch(new RegExp(`^title: ['"]${h1}['"]$`, 'm'));
  });

  it('links only to repo files that exist', () => {
    const prose = doc.replace(/```[\s\S]*?```/g, '');
    const urls = [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(5);
    const missing = urls
      .map((u) => resolveRepoLink(u, DOC, BLOB))
      .filter((u) => u.startsWith('https://github.com/hirobius/hds/'))
      .map((u) => u.replace(/^https:\/\/github\.com\/hirobius\/hds\/(blob|tree)\/main\//, ''))
      .map((p) => p.replace(/#.*$/, ''))
      .filter((p) => !existsSync(join(ROOT, p)));
    expect(missing).toEqual([]);
  });

  it('stays MDX-safe: no bare < or { outside code', () => {
    const prose = doc.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    expect(prose.match(/[<{][^\n]{0,20}/g) ?? []).toEqual([]);
  });
});
