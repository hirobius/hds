import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { HTMLAttributes } from 'react';
import type { MDXComponents } from 'mdx/types';

import { ComponentIndex } from './components/component-index';
import { ComponentPreview } from './components/component-preview';
import { ComponentTokens } from './components/component-tokens';
import { Mermaid } from './components/mermaid';
import { MotionRecipesDemo } from './components/motion-recipes-demo';
import { TokenTable } from './components/token-table';
import {
  DeprecationLedger,
  ReleaseLedger,
  RemovalLedger,
  UpgradeFloor,
} from './components/upgrade-ledger';

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
    Mermaid,
    MotionRecipesDemo,
    ReleaseLedger,
    DeprecationLedger,
    RemovalLedger,
    UpgradeFloor,
    ...components,
  };
}
