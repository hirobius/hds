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

// Fumadocs' Callout, Card/Cards and CodeBlockTabs are dropped from the MDX map (hds#806): no
// docs content uses them, and leaving them in would render Fumadocs chrome the HDS radius and
// shadow tokens don't reach. When content first needs one, map it to the HDS Alert, Card or
// Tabs here instead of restoring the Fumadocs component.
const {
  Callout: _fumadocsCallout,
  CalloutContainer: _fumadocsCalloutContainer,
  CalloutTitle: _fumadocsCalloutTitle,
  CalloutDescription: _fumadocsCalloutDescription,
  Card: _fumadocsCard,
  Cards: _fumadocsCards,
  CodeBlockTab: _fumadocsCodeBlockTab,
  CodeBlockTabs: _fumadocsCodeBlockTabs,
  CodeBlockTabsList: _fumadocsCodeBlockTabsList,
  CodeBlockTabsTrigger: _fumadocsCodeBlockTabsTrigger,
  ...baseMdxComponents
} = defaultMdxComponents;

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...baseMdxComponents,
    // Plain headings: keep the id the contents rail links to, drop the
    // per-heading copy-link button.
    h2: (props: HeadingProps) => <h2 {...props} />,
    h3: (props: HeadingProps) => <h3 {...props} />,
    // Code fences are the HDS CodeBlock, not Fumadocs' (HDS radius token).
    pre: MdxPre,
    // Prose links are the HDS InlineLink: the same look as the Figma / Source and demo links.
    a: MdxLink,
    // Prose tables, inline code and images take HDS radius tokens (HDS radius tokens).
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
