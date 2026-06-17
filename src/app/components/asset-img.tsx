// motion-ok: image display — interactivity is the click-to-lightbox handler, no per-image motion
/**
 * AssetImg - responsive asset frame with fallback placeholder handling.
 * Contexts: default, lightbox, and detail.
 * @category Display
 * @tier primitive
 */
import { useState, CSSProperties } from 'react';
import type React from 'react';
import hds from '../design-system/tokens';
import { Tooltip } from './tooltip';

const MAX_SIZE = 280; // max default frame size before the placeholder shifts to responsive fill behavior

type AssetImgContext = 'default' | 'lightbox' | 'detail';

interface AssetImgProps {
  /** Image source path. */
  src: string;
  /** Accessible alt text. */
  alt?: string;
  /** Optional title attribute. */
  title?: string;
  /** Optional inline styles for layout adjustments. */
  style?: CSSProperties;
  /** Optional class hook for parent-level styling. */
  className?: string;
  /** Whether the image can be dragged. */
  draggable?: boolean;
  /** Dark-mode hint used by certain asset treatments. */
  isDark?: boolean;
  /** Natural asset width used to preserve aspect ratio in placeholders. */
  naturalWidth?: number;
  /** Natural asset height used to preserve aspect ratio in placeholders. */
  naturalHeight?: number;
  /** Click handler for interactive assets. */
  onClick?: (e: React.MouseEvent) => void;
  /** Pointer-down handler for interactive assets. */
  onMouseDown?: (e: React.MouseEvent) => void;
  /** Pointer-move handler for interactive assets. */
  onMouseMove?: (e: React.MouseEvent) => void;
  /** Pointer-up handler for interactive assets. */
  onMouseUp?: (e: React.MouseEvent) => void;
  /** Pointer-leave handler for interactive assets. */
  onMouseLeave?: (e: React.MouseEvent) => void;
  /** Whether the expandable tooltip is shown when the image is clickable. */
  expandable?: boolean;
  /** Override label for the expandable tooltip. */
  expandLabel?: string;
  /** Rendering mode for the placeholder and image frame. */
  context?: AssetImgContext;
  /** Image loading attribute: 'lazy' (default) for off-screen, 'eager' for above-the-fold. */
  loading?: 'lazy' | 'eager';
}

/**
 * Display asset frame with fallback placeholder handling.
 * @category Display
 */
/** @public */
export function AssetImg({
  src,
  alt,
  title,
  style = {},
  className,
  draggable = false,
  isDark: _isDark = false,
  naturalWidth,
  naturalHeight,
  onClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  expandable = true,
  expandLabel,
  context = 'default',
  loading = 'lazy',
}: AssetImgProps) {
  const [failed, setFailed] = useState(false);
  const resolvedStyle = style && typeof style === 'object' ? style : {};

  // ── Tooltip state (declared unconditionally — hooks rule) ────────────────
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);

  // Tooltip is only active for default context when opt-in is on
  const isExpandable = context === 'default' && expandable && !!onClick;

  if (!failed) {
    if (!isExpandable) {
      return (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <img
          src={src}
          alt={alt}
          loading={loading}
          style={resolvedStyle}
          className={className}
          draggable={draggable}
          onClick={onClick}
          onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(e as unknown as React.MouseEvent); } : undefined}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onError={() => setFailed(true)}
        />
      );
    }

    return (
      <div
        className={className}
        // inline-ok: HDS component — inline styles are the intentional pattern for token-driven styling
        style={{
          position:   'relative',
          display:    'inline-flex',
          overflow:   'hidden',
          cursor:     'pointer',
          outline:    'none',
          flexShrink: (resolvedStyle as CSSProperties & { flexShrink?: number }).flexShrink,
        }}
        role="button"
        tabIndex={0}
        aria-label={alt}
        onClick={onClick}
        onKeyDown={(e) => {
           if ((e.key === 'Enter' || e.key === ' ') && onClick) {
             e.preventDefault();
             onClick(e as unknown as React.MouseEvent);
           }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={(e) => {
          setCursorX(e.clientX);
          setCursorY(e.clientY);
          onMouseMove?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          onMouseLeave?.(e);
        }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <img
          src={src}
          alt={alt}
          loading={loading}
          style={resolvedStyle}
          draggable={draggable}
          onError={() => setFailed(true)}
        />
        <Tooltip
          mode="centered"
          visible={focused && !hovered}
          label={expandLabel}
        />
        <Tooltip
          mode="cursor"
          visible={hovered}
          x={cursorX}
          y={cursorY}
          label={expandLabel}
        />
      </div>
    );
  }

  // ── Compute explicit placeholder dimensions ────────────────────────────────
  if (context === 'detail') {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'var(--semantic-color-surface-overlay)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={alt}
      />
    );
  }

  const ar = naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 4 / 3;
  const isPortrait = ar < 1;

  let placeholderStyle: CSSProperties = {};

  if (context === 'lightbox') {
    placeholderStyle = style.width === '100%'
      ? { width: '100%', aspectRatio: `${ar}`, display: 'block' }
      : {
          height: style.maxHeight ?? '70vh',
          width: 'auto',
          aspectRatio: `${ar}`,
          display: 'block',
          flexShrink: 0,
        };
  } else {
    let pw: number;
    let ph: number;

    if (style.maxHeight && !style.width) {
      const maxH = parseInt(style.maxHeight as string) || MAX_SIZE;
      ph = maxH;
      pw = Math.round(maxH * ar);
    } else if (style.maxWidth && !style.height) {
      const maxW = parseInt(style.maxWidth as string) || MAX_SIZE;
      pw = maxW;
      ph = Math.round(maxW / ar);
    } else if (style.width === '100%') {
      pw = 0; 
      ph = 0;
    } else {
      if (isPortrait) {
        pw = MAX_SIZE;
        ph = Math.round(MAX_SIZE / ar);
      } else {
        ph = MAX_SIZE;
        pw = Math.round(MAX_SIZE * ar);
      }
    }

    placeholderStyle =
      pw === 0
        ? { width: '100%', aspectRatio: `${ar}`, display: 'block' }
        : { width: pw, height: ph, display: 'block', flexShrink: 0 };
  }

  return (
    <div
      className={className}
      // inline-ok: HDS component — inline styles are the intentional pattern for token-driven styling
      style={{
        ...placeholderStyle,
        backgroundColor: 'var(--semantic-color-surface-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: hds.space.px4,
        overflow: 'hidden',
        cursor: onClick ? (context === 'lightbox' ? 'zoom-in' : 'pointer') : undefined,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as unknown as React.MouseEvent); } : undefined}
      aria-label={alt}
    >
      {title && (
        <span
          style={{
            ...hds.typeStyles.caption,
            color: 'var(--semantic-color-content-secondary)',
            textAlign: 'center',
            maxWidth: '75%',
            whiteSpace: 'normal',
            userSelect: 'none',
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
}

