/**
 * InlineCode — inline code chip for token paths, file paths, and code-adjacent prose.
 * @category Display
 * @tier primitive
 */
// motion-ok: copy feedback is handled by the nested IconButton, while the inline code chip stays visually stable inside prose and tables
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { IconButton } from './icon-button';

type InlineCodeProps = {
  children: ReactNode;
  style?: CSSProperties;
  /** Compact mode is tuned for dense body copy and table prose. */
  compact?: boolean;
  /** Show a copy-to-clipboard button. children must be a string when true. */
  copyable?: boolean;
};

/** @public */
export function InlineCode({ children, style, compact = false, copyable = false }: InlineCodeProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof children !== 'string') return;
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const codeEl = (
    <code
      style={{
        ...hds.typeStyles.technical,
        color:         'var(--semantic-color-content-primary)',
        background:    'var(--component-badge-bg)',
        border:        'none',
        borderRadius:  hds.borderRadius[0],
        paddingTop:    compact ? hds.semantic.space.subgrid.hairline : hds.semantic.space.subgrid.gap,
        paddingBottom: compact ? hds.semantic.space.subgrid.hairline : hds.semantic.space.subgrid.gap,
        paddingLeft:   hds.semantic.space.subgrid.gap,
        paddingRight:  hds.semantic.space.subgrid.gap,
        display:       'inline-flex',
        alignItems:    'center',
        verticalAlign: compact ? '-0.04em' : '-0.08em',
        lineHeight:    compact ? 0.95 : 1,
        whiteSpace:    'nowrap',
        ...(!copyable ? style : {}),
      }}
    >
      {children}
    </code>
  );

  if (!copyable) return codeEl;

  return (
    <span
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap:        hds.semantic.space.subgrid.gap,
        ...style,
      }}
    >
      <IconButton
        icon={copied ? Check : Copy}
        size="sm"
        variant="tertiary"
        label={copied ? 'Copied' : 'Copy'}
        onClick={handleCopy}
        style={copied ? { color: 'var(--semantic-color-content-accent)' } : undefined}
      />
      {codeEl}
    </span>
  );
}

