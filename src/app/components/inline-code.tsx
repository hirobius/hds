/**
 * InlineCode — inline code chip for token paths, file paths, and code-adjacent prose.
 * @category Display
 * @tier primitive
 */
// motion-ok: copy feedback is handled by the nested IconButton, while the inline code chip stays visually stable inside prose and tables
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Copy, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { IconButton } from './icon-button';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. `density` is the contract's
// density axis (comfortable | compact): comfortable is the roomy default for
// inline prose, compact tightens vertical rhythm for dense body copy and table
// cells — the same distinction the old `compact` boolean drew, now on the
// governed vocabulary. All values bind to the mono typography composite and
// subgrid/badge tokens; no Tailwind-theme utility exists for these composite
// vars yet, so they're arbitrary-value classes bound to CSS custom properties.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- mono typography composite + subgrid/badge tokens have no named Tailwind utility; var()-based so still token-driven
const inlineCodeVariants = cva(
  'inline-flex max-w-[var(--semantic-typography-mono-max-width)] items-center whitespace-nowrap rounded-none border-0 bg-[var(--component-badge-bg)] px-[var(--semantic-space-subgrid-gap)] text-foreground [font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)]',
  {
    variants: {
      density: {
        comfortable: 'py-[var(--semantic-space-subgrid-gap)] align-[-0.08em] leading-[1]',
        compact: 'py-[var(--semantic-space-subgrid-hairline)] align-[-0.04em] leading-[0.95]',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────
// vocab-ok: `InlineCodeVariantProps['density']` bracket-index types below are
// not vocabulary declarations — check-prop-vocabulary's rule D regex treats
// the quoted `'density'` property-access key as an off-vocab density *value*,
// a false positive (prettier's singleQuote:true defeats a double-quote
// workaround, so this must be a file exemption). The real, gate-checked
// density vocabulary lives in `inlineCodeVariants`'s cva() variants above.

type InlineCodeVariantProps = VariantProps<typeof inlineCodeVariants>;

type InlineCodeProps = {
  children: ReactNode;
  style?: CSSProperties;
  /** Layout density. `compact` tightens vertical rhythm for dense body copy and table prose. Defaults to `comfortable`. */
  density?: InlineCodeVariantProps['density'];
  /**
   * @deprecated Use `density="compact"` instead. Kept for backward
   * compatibility; when set, it takes precedence over `density`.
   */
  compact?: boolean;
  /** Show a copy-to-clipboard button. children must be a string when true. */
  copyable?: boolean;
};

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export function InlineCode({
  children,
  style,
  density,
  compact,
  copyable = false,
}: InlineCodeProps) {
  const [copied, setCopied] = useState(false);
  const resolvedDensity: NonNullable<InlineCodeVariantProps['density']> =
    compact !== undefined ? (compact ? 'compact' : 'comfortable') : (density ?? 'comfortable');

  function handleCopy() {
    if (typeof children !== 'string') return;
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const codeEl = (
    <code
      data-density={resolvedDensity}
      className={inlineCodeVariants({ density: resolvedDensity })}
      style={!copyable ? style : undefined}
    >
      {children}
    </code>
  );

  if (!copyable) return codeEl;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: hds.semantic.space.subgrid.gap,
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

/** @internal — CVA variant helper; compose via InlineCode props instead. */
export { inlineCodeVariants };
