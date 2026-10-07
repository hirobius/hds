import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { ComponentIndex } from './components/component-index';
import { ComponentPreview } from './components/component-preview';
import { ComponentTokens } from './components/component-tokens';
import { TokenTable } from './components/token-table';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    TokenTable,
    ComponentTokens,
    ComponentPreview,
    ComponentIndex,
    ...components,
  };
}
