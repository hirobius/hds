import { CodeBlock } from '@hirobius/design-system/patterns';
import { MdxCode } from './mdx-prose';
import { Mermaid } from './mermaid';
import { isValidElement, type ComponentProps, type ReactNode } from 'react';

/**
 * MDX `pre` -> the HDS CodeBlock, so a code fence looks like the CodeBlock on
 * its component page: HDS border and radius tokens and no shadow (the CodeBlock
 * has none).
 *
 * Fumadocs' Shiki pass is off (source.config.ts), so MDX hands this one
 * <code class="language-…"> holding the fence's raw text. That text is the
 * copy source, and CodeBlock colours it from HDS tokens by language. A
 * `mermaid` fence goes to <Mermaid> instead and renders as a diagram.
 */
export function MdxPre(props: ComponentProps<'pre'>) {
  const fence = readFence(props.children);
  if (!fence) return <pre {...props} />;
  // A ```mermaid fence is a diagram, drawn by <Mermaid> with HDS token colours.
  if (fence.language === 'mermaid') return <Mermaid chart={fence.code} />;
  // not-prose: Fumadocs' prose rules box every <code> as inline code; the CodeBlock owns its look.
  return (
    <CodeBlock code={fence.code} language={fence.language} className="not-prose hds-docs-code" />
  );
}

function readFence(children: ReactNode): { code: string; language?: string } | null {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return null;
  if (children.type !== 'code' && children.type !== MdxCode) return null;
  const text = children.props.children;
  if (typeof text !== 'string') return null;
  const language = /(?:^|\s)language-(\S+)/.exec(children.props.className ?? '')?.[1];
  return { code: text.replace(/\n$/, ''), language };
}
