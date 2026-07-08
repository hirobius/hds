/**
 * Token - reflective token specimen for unified node-based token views.
 * @category Display
 * @tier primitive
 *
 * The `variant` axis (node | diagram — diagram is a deprecated alias that
 * resolves to the same node treatment) plus the `selected` / `fullWidth` /
 * `asButton` / `nowrap` / `sourceNode` states used to be a
 * Token.module.css `[data-*]` attribute stylesheet, with a duplicate
 * `isSelected` branch re-painted inline on top of it. Both now live as one
 * `cva` variant set — same `--semantic-*`/`--component-*`/`--primitive-*`
 * custom properties, same pixels, no CSS module.
 */
import React from 'react';
import { motion } from 'motion/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { warnOnce } from '../../lib/deprecation';
import { useHdsRouter } from '../context/RouterContext';
import { useTokenDisplay } from '../context/TokenDisplayContext';
import { allTokens } from './lab/tokenUtils';

// ── Variants ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-button-secondary-* / semantic-radius-action / primitive-space-* tokens have no Tailwind-theme utility; var()-based so still token-driven
const tokenShellVariants = cva(
  // tier-ok: primitive.space.2 (8px shell padding) has no semantic alias — same primitive ref Token.module.css used
  '[font:inherit] mb-0 box-border flex items-center whitespace-normal border border-solid border-[var(--component-button-secondary-border-rest)] rounded-[var(--semantic-radius-action)] bg-[var(--component-button-secondary-bg-rest)] p-[var(--primitive-space-2)] text-left text-inherit',
  {
    variants: {
      variant: {
        // tier-ok: primitive.space.px2 (2px node gap) has no semantic alias — same primitive ref Token.module.css used
        node: 'w-fit max-w-full min-w-0 flex-row gap-[var(--primitive-space-px2)]',
        // tier-ok: primitive.space.1 (4px diagram gap) has no semantic alias — same primitive ref Token.module.css used
        diagram: 'w-max flex-col gap-[var(--primitive-space-1)]',
      },
      sourceNode: {
        true: '',
        false: '',
      },
      selected: {
        true: 'border-[var(--semantic-color-border-accent)] bg-[var(--semantic-accent-rest)] text-[var(--semantic-color-content-onAccent)] shadow-[inset_0_0_0_1px_var(--semantic-color-border-accent)]',
        false: '',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      asButton: {
        true: 'cursor-pointer appearance-none transition-[background-color,border-color,transform] duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)] hover:border-[var(--semantic-color-border-accent)] hover:bg-[var(--semantic-color-surface-accentSubtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-border-accent)] active:translate-y-px',
        false: '',
      },
      nowrap: {
        true: 'whitespace-nowrap',
        false: '',
      },
    },
    compoundVariants: [
      // Source-node instances left-align their (multi-line) content instead of centering.
      { variant: 'node', sourceNode: true, className: 'items-start' },
    ],
    defaultVariants: {
      variant: 'node',
      sourceNode: false,
      selected: false,
      fullWidth: false,
      asButton: false,
      nowrap: false,
    },
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- subgrid gap token has no Tailwind-theme utility; var()-based so still token-driven
const tokenNodeInlineVariants = cva(
  'flex w-full min-w-0 max-w-full gap-[var(--semantic-space-subgrid-gap)]',
  {
    variants: {
      sourceNode: {
        true: 'items-start',
        false: 'items-center',
      },
    },
    defaultVariants: { sourceNode: false },
  },
);

// The token path/value label. `sourceNode` swaps from single-line ellipsis
// truncation to wrapping (multi-line diagram labels); `truncateFromStart`
// flips text direction so the ellipsis lands at the start instead of the end;
// `selected` inverts the label color to sit on the accent fill.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- mono technical-typography composite (13px/1/regular/mono-family) + direction/overflow-wrap + content-* colors have no Tailwind-theme utility; var()-based so still token-driven
const tokenLabelVariants = cva(
  // tier-ok: primitive.typography.family.mono (Geist Mono stack) has no semantic alias — same primitive ref hds.typeStyles.technical used
  'relative block w-full max-w-full min-w-0 font-normal leading-none text-[13px] [font-family:var(--primitive-typography-family-mono)]',
  {
    variants: {
      sourceNode: {
        true: 'h-auto overflow-visible whitespace-pre-wrap text-clip [overflow-wrap:anywhere] break-words',
        false: 'overflow-hidden whitespace-nowrap text-ellipsis',
      },
      truncateFromStart: {
        true: 'text-left [direction:rtl]',
        false: '',
      },
      selected: {
        true: 'text-[var(--semantic-color-content-onAccent)]',
        false: 'text-[var(--semantic-color-content-primary)]',
      },
    },
    defaultVariants: { sourceNode: false, truncateFromStart: false, selected: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type TokenShellVariantProps = VariantProps<typeof tokenShellVariants>;
type TokenVariant = NonNullable<TokenShellVariantProps['variant']>;

type TokenBaseProps = {
  className?: string;
  fullWidth?: boolean;
  nowrap?: boolean;
  isSourceNode?: boolean;
  pathDisplayMode?: 'full' | 'compressed';
  pathDisplayDepth?: number;
  pathDisplayLeadingDot?: boolean;
  nodeRef?: (el: HTMLElement | null) => void;
  'aria-label'?: string;
  /** When true, overflow ellipsis appears at the start (left) instead of the end. */
  truncateFromStart?: boolean;
};

type TokenNodeSurfaceProps = TokenBaseProps & {
  variant?: 'node';
  children: React.ReactNode;
  /** Optional explicit token path for deep-linking node instances. Falls back to children when omitted. */
  tokenPath?: string;
  isSelected?: boolean;
  onClick?: () => void;
  swatchVar?: string;
  /** Optional left-side slot for compact node content, e.g. curve previews. */
  leadingSlot?: React.ReactNode;
};

/**
 * @deprecated `variant="diagram"` is a compatibility alias that resolves to the
 * canonical `variant="node"` treatment; its diagram-only props (value,
 * accentColor, description, rawValue) are no longer rendered. Migrate to
 * `variant="node"`.
 * @removeIn 1.0.0
 */
type TokenDiagramProps = TokenBaseProps & {
  variant: 'diagram';
  label: string;
  value: string;
  accentColor: string;
  swatchVar?: string;
  description?: React.ReactNode;
  rawValue?: React.ReactNode;
  onClick?: () => void;
};

type TokenProps = TokenNodeSurfaceProps | TokenDiagramProps;

/** Dot-notation token paths that can deep-link into the Tokens explorer. */
function isDeepLinkablePath(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^(primitive|semantic|component)\./.test(val.trim());
}

const TOKEN_BY_PATH = new Map(allTokens.map((token) => [token.path, token] as const));

const tokenToneSwatchClassName =
  // tier-ok: primitive.space.px1 (1px hairline swatch offset) / primitive.radius.2 (swatch corner radius) have no semantic alias — same primitive refs tokenStyles.toneSwatchBase used
  'ml-[calc(var(--primitive-space-px1)*-1)] shrink-0 self-center rounded-[var(--primitive-radius-2)]';

/** Convert dot-notation path to CSS var string. */
function toCssVar(path: string): string {
  return `var(--${path.replace(/\./g, '-')})`;
}

function getTokenSwatch(path: string | null) {
  if (!path) return null;
  const token = TOKEN_BY_PATH.get(path);
  if (!token || token.type !== 'color') return null;
  return token.cssVar;
}

function formatTokenPath(
  path: string,
  {
    pathDisplayMode = 'full',
    pathDisplayDepth = 1,
    pathDisplayLeadingDot = false,
  }: Pick<TokenBaseProps, 'pathDisplayMode' | 'pathDisplayDepth' | 'pathDisplayLeadingDot'>,
) {
  if (pathDisplayMode === 'full') return path;
  const depth = Math.max(pathDisplayDepth ?? 1, 1);
  const compressed = path.split('.').slice(-depth).join('.');
  return pathDisplayLeadingDot ? `.${compressed}` : compressed;
}

function TokenTone({
  tone,
  size = 12,
  offsetTop = 0,
}: {
  tone: string;
  size?: number;
  offsetTop?: number;
}) {
  return (
    <div
      data-inspector-ignore="token-swatch"
      className={tokenToneSwatchClassName}
      // inline-ok: swatch size/offset/background are runtime numeric props and an arbitrary resolved token color, not a fixed variant — no static Tailwind class can express them
      style={{ width: size, height: size, marginTop: offsetTop, background: tone }}
    />
  );
}

type TokenNodeInlineProps = {
  label: React.ReactNode;
  swatchVar?: string;
  leadingSlot?: React.ReactNode;
  isColorValue?: boolean;
  swatchOffsetTop?: number;
  isSelected?: boolean;
  nowrap?: boolean;
  isSourceNode?: boolean;
  truncateFromStart?: boolean;
};

function TokenNodeInline({
  label,
  swatchVar,
  leadingSlot,
  isColorValue = false,
  swatchOffsetTop = 0,
  isSelected = false,
  nowrap: _nowrap = true,
  isSourceNode = false,
  truncateFromStart = false,
}: TokenNodeInlineProps) {
  return (
    <div className={tokenNodeInlineVariants({ sourceNode: isSourceNode })}>
      {leadingSlot ? (
        leadingSlot
      ) : isColorValue && swatchVar ? (
        <TokenTone
          tone={swatchVar.startsWith('--') ? `var(${swatchVar})` : swatchVar}
          offsetTop={swatchOffsetTop}
        />
      ) : null}
      <span
        data-inspector-ignore="token-node-label"
        className={tokenLabelVariants({
          sourceNode: isSourceNode,
          truncateFromStart,
          selected: isSelected,
        })}
      >
        {label}
      </span>
    </div>
  );
}

type TokenShellProps = {
  children: React.ReactNode;
  nodeRef?: (el: HTMLElement | null) => void;
  className?: string;
  asButton?: boolean;
  fullWidth?: boolean;
  isSelected?: boolean;
  nowrap?: boolean;
  isSourceNode?: boolean;
  variant?: TokenVariant;
  onClick?: () => void;
  ariaLabel?: string;
};

function TokenShell({
  children,
  nodeRef,
  className,
  asButton = false,
  fullWidth = false,
  isSelected = false,
  nowrap = false,
  isSourceNode = false,
  variant = 'node',
  onClick,
  ariaLabel,
}: TokenShellProps) {
  const wrapperClassName = cn(
    tokenShellVariants({
      variant,
      sourceNode: isSourceNode,
      selected: isSelected,
      fullWidth,
      asButton,
      nowrap,
    }),
    className,
  );

  if (asButton) {
    return (
      <motion.button
        data-hds-component="token"
        ref={nodeRef as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label={ariaLabel}
        className={wrapperClassName}
        data-variant={variant}
        data-full-width={fullWidth}
        aria-pressed={isSelected}
        data-selected={isSelected}
        data-as-button={asButton}
        data-nowrap={nowrap}
        data-source-node={isSourceNode}
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <div
      data-hds-component="token"
      ref={nodeRef as React.Ref<HTMLDivElement>}
      className={wrapperClassName}
      data-variant={variant}
      data-full-width={fullWidth}
      data-selected={isSelected}
      data-as-button={asButton}
      data-nowrap={nowrap}
      data-source-node={isSourceNode}
    >
      {children}
    </div>
  );
}

function TokenNodeSurface({
  children,
  className,
  fullWidth = false,
  isSelected = false,
  onClick,
  swatchVar,
  leadingSlot,
  tokenPath,
  pathDisplayMode = 'full',
  pathDisplayDepth = 1,
  pathDisplayLeadingDot = false,
  nodeRef,
  'aria-label': ariaLabel,
  nowrap = true,
  isSourceNode = false,
  truncateFromStart = false,
}: TokenNodeSurfaceProps) {
  const { showCss } = useTokenDisplay();
  const { navigate } = useHdsRouter();

  const tokenPathInput =
    tokenPath?.trim() ?? (typeof children === 'string' ? children.trim() : null);
  const isLinkable = isDeepLinkablePath(tokenPathInput);
  const resolvedTokenPath = isLinkable ? tokenPathInput : null;
  const displayText =
    showCss && resolvedTokenPath
      ? toCssVar(resolvedTokenPath)
      : resolvedTokenPath
        ? formatTokenPath(resolvedTokenPath, {
            pathDisplayMode,
            pathDisplayDepth,
            pathDisplayLeadingDot,
          })
        : children;
  const hasClickHandler = Boolean(onClick) || isLinkable;
  const resolvedSwatchVar = swatchVar ?? getTokenSwatch(resolvedTokenPath);
  const isColorValue = Boolean(resolvedSwatchVar);

  const handleClick =
    onClick ??
    (isLinkable
      ? () => {
          // Click handler is browser-only, so reading window.location directly is
          // safe and preserves search+hash in the `from` deep-link round-trip.
          const { pathname, search, hash } = window.location;
          const from = pathname + search + hash;
          navigate(
            `/tokens?token=${encodeURIComponent(tokenPathInput as string)}&from=${encodeURIComponent(from)}#interactive-token-explorer`,
            { state: { fromScrollY: window.scrollY } },
          );
        }
      : undefined);

  return (
    <TokenShell
      nodeRef={nodeRef}
      className={className}
      asButton={hasClickHandler}
      fullWidth={fullWidth}
      isSelected={isSelected}
      nowrap={nowrap}
      isSourceNode={isSourceNode}
      variant="node"
      onClick={handleClick}
      ariaLabel={ariaLabel}
    >
      <TokenNodeInline
        label={displayText}
        swatchVar={resolvedSwatchVar}
        leadingSlot={leadingSlot}
        isColorValue={isColorValue}
        isSelected={isSelected}
        nowrap={nowrap}
        isSourceNode={isSourceNode}
        truncateFromStart={truncateFromStart}
      />
    </TokenShell>
  );
}

function TokenDiagram({
  label,
  swatchVar,
  nodeRef,
  className,
  onClick,
  'aria-label': ariaLabel,
}: TokenDiagramProps) {
  return (
    <TokenNodeSurface
      className={className}
      fullWidth
      nodeRef={nodeRef}
      onClick={onClick}
      aria-label={ariaLabel}
      swatchVar={swatchVar}
    >
      {label}
    </TokenNodeSurface>
  );
}

/**
 * Token - unified token component.
 *
 * variant="node" renders the canonical token surface.
 * variant="diagram" is a DEPRECATED compatibility alias (see TokenDiagramProps;
 * @removeIn 1.0.0) that now resolves to the same node treatment.
 * Node content can use a left-side slot for swatches or other compact previews.
 */
/** @public */
export function Token(props: TokenProps) {
  if (props.variant === 'diagram') {
    warnOnce(
      'token-variant-diagram',
      'Token variant="diagram" is deprecated and resolves to variant="node" (removed in 1.0.0); migrate to variant="node".',
    );
    return <TokenDiagram {...props} />;
  }
  return <TokenNodeSurface {...props} />;
}

/** @internal — CVA variant helpers; compose via Token props instead. */
export { tokenShellVariants, tokenNodeInlineVariants, tokenLabelVariants };
