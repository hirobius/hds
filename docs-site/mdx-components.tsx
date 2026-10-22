import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { HTMLAttributes } from 'react';
import type { MDXComponents } from 'mdx/types';

import { ComponentIndex } from './components/component-index';
import { ComponentPreview } from './components/component-preview';
import { ComponentTokens } from './components/component-tokens';
import { MdxPre } from './components/mdx-code-block';
import { MdxLink } from './components/mdx-link';
import { MdxCode, MdxImg, MdxTable } from './components/mdx-prose';
import { Mermaid } from './components/mermaid';
import { PrinciplesAndPractices } from './components/principles-and-practices';
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
    // Code fences are the HDS CodeBlock, not Fumadocs' (follows the Corners switch).
    pre: MdxPre,
    // Prose links are the HDS InlineLink: the same look as the Figma / Source and demo links.
    a: MdxLink,
    // Prose tables, inline code and images take HDS radius tokens (follow the Corners switch).
    table: MdxTable,
    code: MdxCode,
    img: MdxImg,
    TokenTable,
    ComponentTokens,
    ComponentPreview,
    ComponentIndex,
    Mermaid,
    PrinciplesAndPractices,
    ReleaseLedger,
    DeprecationLedger,
    RemovalLedger,
    UpgradeFloor,
    ...components,
  };
}
