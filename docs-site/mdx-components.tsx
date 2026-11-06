import type { MDXComponents } from 'mdx/types';

import {
  A11yConsumerChecklist,
  A11yContractIndex,
  A11yGuarantees,
} from './components/a11y-contracts';
import { CaseStudyFacts } from './components/case-study-facts';
import { ComponentIndex } from './components/component-index';
import { ComponentPreview } from './components/component-preview';
import { ComponentTokens } from './components/component-tokens';
import { IconGallery } from './components/icon-gallery';
import { MdxPre } from './components/mdx-code-block';
import { mdxHeadings } from './components/mdx-headings';
import { MdxLink } from './components/mdx-link';
import { OverviewActions } from './components/overview-actions';
import { MdxCode, MdxImg, MdxTable } from './components/mdx-prose';
import { NumberValueDemo } from './components/number-value-demo';
import { Mermaid } from './components/mermaid';
import { MotionRecipesDemo } from './components/motion-recipes-demo';
import { WalkthroughVideo } from './components/walkthrough-video';
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
// The HDS elements. No cast: tsconfig.json `paths` sends every `react` type import, the
// library's dist .d.ts included, to the docs site's own React 19 types, so MDX's JSX types and
// these components agree (hds#1234). The bundler finds no JS there and resolves react as usual.
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
};

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...hdsElements,
    TokenTable,
    CaseStudyFacts,
    A11yGuarantees,
    A11yConsumerChecklist,
    A11yContractIndex,
    ComponentTokens,
    ComponentPreview,
    ComponentIndex,
    OverviewActions,
    IconGallery,
    Mermaid,
    WalkthroughVideo,
    PrinciplesAndPractices,
    NumberValueDemo,
    MotionRecipesDemo,
    ReleaseLedger,
    DeprecationLedger,
    RemovalLedger,
    UpgradeFloor,
    ...components,
  };
}
