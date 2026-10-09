import { basename, dirname } from 'node:path';

interface MdxNode {
  type: string;
  value?: string;
  name?: string;
  attributes?: unknown[];
  children?: MdxNode[];
}

const TOKENS_MARKER = /^\s*\/\*\s*generated:\s*tokens\s*\*\/\s*$/;
const PREVIEW_MARKER = /^\s*\/\*\s*preview:\s*([A-Za-z0-9]+)\s*\*\/\s*$/;
const PROPS_MARKER = /^\s*\/\*\s*props:\s*([A-Za-z0-9]+)\s*\*\/\s*$/;

const attr = (name: string, value: string) => ({ type: 'mdxJsxAttribute', name, value });
const element = (name: string, attributes: unknown[]): MdxNode => ({
  type: 'mdxJsxFlowElement',
  name,
  attributes,
  children: [],
});

interface Ctx {
  /** MDX file slug (color.mdx -> "color"). */
  page: string;
  /**
   * True for content/docs/components/*.mdx and patterns/*.mdx, whose tokens
   * marker means "this component's tokens".
   */
  component: boolean;
}

function replaceMarkers(node: MdxNode, ctx: Ctx): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === 'mdxFlowExpression' && child.value) {
      if (TOKENS_MARKER.test(child.value)) {
        return ctx.component
          ? element('ComponentTokens', [attr('slug', ctx.page)])
          : element('TokenTable', [attr('page', ctx.page)]);
      }
      const preview = PREVIEW_MARKER.exec(child.value);
      if (preview) return element('ComponentPreview', [attr('name', preview[1]!)]);
      // `{/* props: Name */}` stays a comment: the generator writes the props
      // table right after it, as plain Markdown, so it is searchable text.
      if (PROPS_MARKER.test(child.value)) return child;
    }
    replaceMarkers(child, ctx);
    return child;
  });
}

/**
 * Swaps the content-model build markers for components:
 *   {/* generated: tokens *\/}  ->  <TokenTable page="color" />  (foundations)
 *                                   <ComponentTokens slug="button" />  (components/, patterns/)
 *   {/* preview: Button *\/}    ->  <ComponentPreview name="Button" />
 * The page slug is the MDX file's basename, so the markers stay comments in the
 * source and the content is built from data when the page renders.
 */
export function remarkTokenTables() {
  return (tree: MdxNode, file: { path?: string }) => {
    const path = file.path ?? '';
    replaceMarkers(tree, {
      page: basename(path, '.mdx'),
      component: ['components', 'patterns'].includes(basename(dirname(path))),
    });
  };
}
