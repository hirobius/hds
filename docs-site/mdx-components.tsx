import type { MDXComponents } from 'mdx/types';

import {
  A11yConsumerChecklist,
  A11yContractIndex,
  A11yGuarantees,
} from './components/a11y-contracts';
import { ComponentIndex } from './components/component-index';
import { ComponentPreview } from './components/component-preview';
import { ComponentTokens } from './components/component-tokens';
import { IconGallery } from './components/icon-gallery';
import { MdxPre } from './components/mdx-code-block';
import { mdxHeadings } from './components/mdx-headings';
import { MdxLink } from './components/mdx-link';
import { OverviewActions } from './components/overview-actions';
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

// Every MDX element the docs use is mapped to HDS here; Fumadocs' MDX defaults are not spread
// (hds#806). Its Callout, Card/Cards and CodeBlockTabs are left out: no docs content uses them.
// When content first needs one, map it to the HDS Alert, Card or Tabs here.
// The HDS elements. The docs site loads two React type packages (its own 19, and the library's
// 18 through the package's .d.ts), and MDX's global JSX types resolve to 18, so the props of
// these React 19 components do not match them. Fumadocs' typed defaults hid this while they
// were spread in; the cast keeps that, with no change at runtime. Remove it with hds#1234.
const hdsElements = {
  // Plain headings: keep the id the contents rail links to, no copy-link button.
  ...mdxHeadings,
  // Code fences are the HDS CodeBlock, not Fumadocs' (HDS radius token).
  pre: MdxPre,
  // Prose links are the HDS InlineLink: the same look as the Figma / Source and demo links.
  a: MdxLink,
  // Prose tables, inline code and images take HDS radius tokens.
  table: MdxTable,
  code: MdxCode,
  img: MdxImg,
} as MDXComponents;

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...hdsElements,
    TokenTable,
    A11yGuarantees,
    A11yConsumerChecklist,
    A11yContractIndex,
    ComponentTokens,
    ComponentPreview,
    ComponentIndex,
    OverviewActions,
    IconGallery,
    Mermaid,
    PrinciplesAndPractices,
    ReleaseLedger,
    DeprecationLedger,
    RemovalLedger,
    UpgradeFloor,
    ...components,
  };
}
