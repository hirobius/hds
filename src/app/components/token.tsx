/**
 * Token - reflective token specimen for unified node-based token views.
 * @category Display
 * @tier primitive
 */
import React from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router';
import hds from '../design-system/tokens';
import { useTokenDisplay } from '../context/TokenDisplayContext';
import { allTokens } from './lab/tokenUtils';
import styles from './Token.module.css';

type TokenBaseProps = {
  className?: string;
  fullWidth?: boolean;
  nowrap?: boolean;
  isSourceNode?: boolean;
  pathDisplayMode?: 'full' | 'compressed';
  pathDisplayDepth?: number;
  pathDisplayLeadingDot?: boolean;
  nodeRef?: (el: HTMLElement | null) => void;
  ariaLabel?: string;
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
type TokenVariant = NonNullable<TokenProps['variant']>;

/** Dot-notation token paths that can deep-link into the Tokens explorer. */
function isDeepLinkablePath(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^(primitive|semantic|component)\./.test(val.trim());
}

const TOKEN_BY_PATH = new Map(allTokens.map((token) => [token.path, token] as const));

const tokenTextStyle: React.CSSProperties = {
  ...hds.typeStyles.technical,
  lineHeight: 1,
  color: 'var(--semantic-color-content-primary)',
};

// Mono now sits at 13px (was 15px) — Geist's optical center already lands
// near the visual middle at this size, so no baseline nudge is needed.
const tokenTextNudgeStyle: React.CSSProperties = {};

const tokenSwatchTextGap = hds.semantic.space.subgrid.gap;

const tokenStyles = {
  toneSwatchBase: {
    borderRadius: hds.borderRadius[2],
    flexShrink: 0,
    alignSelf: 'center',
    marginLeft: `calc(${hds.semantic.space.subgrid.hairline} * -1)`,
  } satisfies React.CSSProperties,
  nodeInlineWrapperBase: {
    display: 'flex',
    gap: tokenSwatchTextGap,
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
  } satisfies React.CSSProperties,
} as const;

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
      style={{ ...tokenStyles.toneSwatchBase, width: size, height: size, marginTop: offsetTop, background: tone }}
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
    <div
      style={{ ...tokenStyles.nodeInlineWrapperBase, alignItems: isSourceNode ? 'flex-start' : 'center' }}
    >
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
        // inline-ok: token label — overflow/whiteSpace/wordBreak/direction all depend on isSourceNode+truncateFromStart+isSelected props
        style={{
          ...tokenTextStyle,
          ...tokenTextNudgeStyle,
          display: 'block',
          minWidth: 0,
          overflow: isSourceNode ? 'visible' : 'hidden',
          textOverflow: isSourceNode ? 'clip' : 'ellipsis',
          whiteSpace: isSourceNode ? 'pre-wrap' : 'nowrap',
          overflowWrap: isSourceNode ? 'anywhere' : 'normal',
          wordBreak: isSourceNode ? 'break-word' : 'normal',
          height: isSourceNode ? 'auto' : undefined,
          color: isSelected
            ? 'var(--semantic-color-content-onAccent)'
            : 'var(--semantic-color-content-primary)',
          width: '100%',
          maxWidth: '100%',
          direction: truncateFromStart ? 'rtl' : undefined,
          textAlign: truncateFromStart ? 'left' : undefined,
        }}
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
  style?: React.CSSProperties;
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
  style,
}: TokenShellProps) {
  const wrapperClassName = className ? `${styles['wrapper']} ${className}` : styles['wrapper'];

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
        style={style}
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
      style={style}
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
  ariaLabel,
  nowrap = true,
  isSourceNode = false,
  truncateFromStart = false,
}: TokenNodeSurfaceProps) {
  const { showCss } = useTokenDisplay();
  const navigate = useNavigate();
  const location = useLocation();

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
          const from = location.pathname + location.search + location.hash;
          navigate(
            `/ops/hds/tokens?token=${encodeURIComponent(tokenPathInput as string)}&from=${encodeURIComponent(from)}#interactive-token-explorer`,
            { state: { fromScrollY: window.scrollY } },
          );
        }
      : undefined);
  const selectedStyle: React.CSSProperties | undefined = isSelected
    ? {
        borderColor: 'var(--semantic-color-border-accent)',
        background: 'var(--semantic-accent-rest)',
        boxShadow: 'inset 0 0 0 1px var(--semantic-color-border-accent)',
        color: 'var(--semantic-color-content-onAccent)',
      }
    : undefined;

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
      style={selectedStyle}
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
  ariaLabel,
}: TokenDiagramProps) {
  return (
    <TokenNodeSurface
      className={className}
      fullWidth
      nodeRef={nodeRef}
      onClick={onClick}
      ariaLabel={ariaLabel}
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
 * variant="diagram" is maintained as a compatibility alias and now resolves
 * to the same node treatment so all token views share one visual language.
 * Node content can use a left-side slot for swatches or other compact previews.
 */
/** @public */
export function Token(props: TokenProps) {
  if (props.variant === 'diagram') return <TokenDiagram {...props} />;
  return <TokenNodeSurface {...props} />;
}
