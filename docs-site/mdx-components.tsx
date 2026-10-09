import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { HTMLAttributes } from 'react';
import type { MDXComponents } from 'mdx/types';

import { ComponentIndex } from './components/component-index';
import { ComponentPreview } from './components/component-preview';
import { ComponentTokens } from './components/component-tokens';
import { TokenTable } from './components/token-table';

type HeadingProps = HTMLAttributes<HTMLHeadingElement>;

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // Plain headings: keep the id the contents rail links to, drop the
    // per-heading copy-link button.
    h2: (props: HeadingProps) => <h2 {...props} />,
    h3: (props: HeadingProps) => <h3 {...props} />,
    TokenTable,
    ComponentTokens,
    ComponentPreview,
    ComponentIndex,
    ...components,
  };
}
