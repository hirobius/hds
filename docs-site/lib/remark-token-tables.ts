import { basename } from 'node:path';

interface MdxNode {
  type: string;
  value?: string;
  name?: string;
  attributes?: unknown[];
  children?: MdxNode[];
}

/** `{/* generated: tokens *\/}` — the marker scripts/check-docs.mjs requires (content-model Rule 1). */
const MARKER = /^\s*\/\*\s*generated:\s*tokens\s*\*\/\s*$/;

function replaceMarkers(node: MdxNode, page: string): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === 'mdxFlowExpression' && child.value && MARKER.test(child.value)) {
      return {
        type: 'mdxJsxFlowElement',
        name: 'TokenTable',
        attributes: [{ type: 'mdxJsxAttribute', name: 'page', value: page }],
        children: [],
      };
    }
    replaceMarkers(child, page);
    return child;
  });
}

/**
 * Swaps every generated-tokens marker for <TokenTable page="<file slug>" />.
 * The page slug is the MDX file's basename (color.mdx -> "color"), so the
 * marker stays a comment in the source and the table is built from the token
 * pipeline when the page renders.
 */
export function remarkTokenTables() {
  return (tree: MdxNode, file: { path?: string }) => {
    replaceMarkers(tree, basename(file.path ?? '', '.mdx'));
  };
}
