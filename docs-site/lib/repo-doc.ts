import { posix } from 'node:path';

/**
 * <RepoDoc path="docs/ENGINEERING.md" /> in an MDX page renders that repo
 * Markdown file in place, at build (hds#648). The doc stays the one source:
 *   - relative links resolve against the doc and point at GitHub,
 *   - the doc's own H1 is dropped (the page title is the H1),
 *   - ```mermaid fences become <Mermaid chart="…" />.
 * No imports beyond node:path, so tests run without the docs-site install.
 */

interface MdNode {
  type: string;
  name?: string;
  depth?: number;
  url?: string;
  lang?: string | null;
  value?: string;
  attributes?: { type: string; name: string; value?: unknown }[];
  children?: MdNode[];
}

const TAG = 'RepoDoc';
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Rewrite one link from the doc at `docPath`; absolute URLs, /routes and #anchors pass through. */
export function resolveRepoLink(url: string, docPath: string, blobBase: string): string {
  if (!url || SCHEME.test(url) || url.startsWith('/') || url.startsWith('#')) return url;
  const hashAt = url.indexOf('#');
  const path = hashAt < 0 ? url : url.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : url.slice(hashAt);
  const resolved = posix.normalize(posix.join(posix.dirname(docPath), path));
  if (path.endsWith('/')) {
    return `${blobBase.replace(/\/blob\//, '/tree/')}/${resolved.replace(/\/$/, '')}${hash}`;
  }
  return `${blobBase}/${resolved}${hash}`;
}

/** The repo paths an MDX source pulls in with <RepoDoc path="…" />. */
export function repoDocTags(mdx: string): string[] {
  return [...mdx.matchAll(/<RepoDoc\s+path=["']([^"']+)["']\s*\/>/g)].map((m) => m[1]!);
}

function rewrite(node: MdNode, docPath: string, blobBase: string): MdNode {
  if ((node.type === 'link' || node.type === 'definition') && node.url) {
    node.url = resolveRepoLink(node.url, docPath, blobBase);
  }
  if (node.type === 'code' && node.lang === 'mermaid') {
    return {
      type: 'mdxJsxFlowElement',
      name: 'Mermaid',
      attributes: [{ type: 'mdxJsxAttribute', name: 'chart', value: node.value ?? '' }],
      children: [],
    };
  }
  if (node.children) node.children = node.children.map((c) => rewrite(c, docPath, blobBase));
  return node;
}

export interface ExpandOptions {
  /** Read a repo-relative file. */
  read: (repoPath: string) => string;
  /** Parse Markdown into mdast (the page's own processor at build). */
  parse: (source: string, repoPath: string) => MdNode;
  /** e.g. https://github.com/hirobius/hds/blob/main */
  blobBase: string;
}

/** Replace every <RepoDoc path /> under `tree` with the parsed, rewritten doc. */
export function expandRepoDoc(tree: MdNode, opts: ExpandOptions): void {
  if (!tree.children) return;
  tree.children = tree.children.flatMap((child) => {
    if (child.type === 'mdxJsxFlowElement' && child.name === TAG) {
      const path = child.attributes?.find((a) => a.name === 'path')?.value;
      if (typeof path !== 'string') throw new Error(`<${TAG}> needs a path="…" attribute`);
      const doc = opts.parse(opts.read(path), path);
      const body = (doc.children ?? []).filter((n) => !(n.type === 'heading' && n.depth === 1));
      return body.map((n) => rewrite(n, path, opts.blobBase));
    }
    expandRepoDoc(child, opts);
    return [child];
  });
}
