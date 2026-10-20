import { InlineCode } from '@hirobius/design-system';
import type { ComponentProps } from 'react';

/**
 * MDX `table` -> a frame drawn from HDS tokens (border, radius, scroll), so prose tables follow
 * the Corners switch. Fumadocs' own wrapper hard-codes an 8px radius.
 */
export function MdxTable(props: ComponentProps<'table'>) {
  return (
    <div className="hds-docs-table">
      <table {...props} />
    </div>
  );
}

/**
 * MDX `code` -> the HDS InlineCode chip. A fence's <code> carries `language-*` (or a newline)
 * and stays plain: MdxPre reads it as the CodeBlock's source. not-prose keeps Fumadocs'
 * inline-code box off the chip.
 */
export function MdxCode({ children, className, ...rest }: ComponentProps<'code'>) {
  const isFence = /(?:^|\s)language-/.test(className ?? '') || hasNewline(children);
  if (isFence || typeof children !== 'string') {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }
  return (
    <span className="not-prose">
      <InlineCode>{children}</InlineCode>
    </span>
  );
}

const hasNewline = (children: unknown) => typeof children === 'string' && children.includes('\n');

/**
 * MDX `img` -> a plain image whose corners come from the HDS radius token. Fumadocs' own `img`
 * hard-codes `rounded-lg`, which skips the Corners switch.
 */
export function MdxImg({ className, alt = '', ...rest }: ComponentProps<'img'>) {
  return (
    <img
      loading="lazy"
      className={['hds-docs-img', className].filter(Boolean).join(' ')}
      alt={alt}
      {...rest}
    />
  );
}
