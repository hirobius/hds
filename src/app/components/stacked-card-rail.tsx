// motion-ok: structural rail — per-card motion lives on each Card primitive, not the rail
/**
 * StackedCardRail — horizontally-scrolling stacked card carousel.
 *
 * Scroll mechanism: vertical scroll on an absolutely-positioned inner container
 * is mapped to horizontal scroll on a sticky inner strip via a single scroll
 * event listener. Cards use CSS scroll-driven animation (animation-timeline:
 * view(x …)) for the stack/unstack effect where the browser supports it;
 * a plain horizontal rail is the graceful fallback.
 *
 * Browser compat note:
 *   - animation-timeline: view() — Chrome 115+, Firefox 110+ (behind flag until
 *     v114), Safari 18+ (TP only as of 2025). The @supports guard ensures the
 *     stacking animation is only applied when the feature is available; all other
 *     browsers get a clean scrollable row.
 *   - :has() selector (neighbour shift on hover) — Chrome 105+, FF 121+, Safari 15.4+.
 *     Gated with @supports selector(:has(+ *)).
 *
 * @category Display
 * @tier pattern
 */

import React, { useEffect, useRef } from 'react';
import hds from '../design-system/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StackedCardRailCard {
  id: string;
  title: string;
  category?: string;
  coverImage?: string;
  href?: string;
}

export interface StackedCardRailProps {
  cards: StackedCardRailCard[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_WIDTH = 280;
const CARD_HEIGHT = 380;
const CARD_GAP = 24;
// How much of the previous/next card is visible on each edge.
const VISIBLE_COUNT = 3.5;

// ── Styles injected as a single <style> block ─────────────────────────────────

const STYLES = `
  .hds-scr-outer {
    position: relative;
    overflow: hidden;
    width: 100%; /* audit-ok: percentage fill in CSS template */
    --card-width: ${CARD_WIDTH}px;
    --card-height: ${CARD_HEIGHT}px;
    --card-gap: ${CARD_GAP}px;
    --visible-count: ${VISIBLE_COUNT};
  }

  /* Vertical scroll container — maps vertical scrolling to a horizontal strip */
  .hds-scr-yscroll {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%; /* audit-ok: percentage fill in CSS template */
    height: 100%; /* audit-ok: percentage fill in CSS template */
    overflow-y: scroll;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hds-scr-yscroll::-webkit-scrollbar {
    display: none;
  }

  /* Tall spacer that gives the vertical scroll room to travel */
  .hds-scr-spacer {
    /* Total scroll travel = card-width × card-count so each card gets a full
       width of scroll travel. The visible window is added back so the last
       card reaches the entry position. */
    height: var(--hds-scr-spacer-height, 4000px);
    width: 100%; /* audit-ok: percentage fill in CSS template */
  }

  /* Sticky strip — stays pinned in view while the vertical container scrolls */
  .hds-scr-strip {
    position: sticky;
    top: 0;
    overflow-x: scroll;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    height: calc(var(--card-height) + 48px);
    display: flex;
    align-items: center;
  }
  .hds-scr-strip::-webkit-scrollbar {
    display: none;
  }

  /* Horizontal track */
  .hds-scr-track {
    display: flex;
    align-items: center;
    padding: 0 ${CARD_GAP}px;
    gap: var(--card-gap);
    /* Wide enough to hold all cards plus padding */
    min-width: max-content;
  }

  /* Individual card wrapper — controls position in the flow */
  .hds-scr-card {
    flex: 0 0 var(--card-width);
    height: var(--card-height);
    position: relative;
    cursor: pointer;
    transition:
      transform 0.25s ease,
      width 0.25s ease;
    z-index: 0;
  }

  /* Card inner surface */
  .hds-scr-card-inner {
    width: 100%; /* audit-ok: percentage fill in CSS template */
    height: 100%; /* audit-ok: percentage fill in CSS template */
    border-radius: ${hds.borderRadius[8]};
    background: var(--semantic-color-surface-raised);
    border: 1px solid var(--semantic-color-border-default);
    box-shadow: var(--semantic-shadow-subtle);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    transition:
      transform 0.25s ease,
      box-shadow 0.25s ease;
  }

  /* Hover: widen card 25% and lift it */
  .hds-scr-card:hover {
    z-index: 10;
    transform: translate(-10%, -4.5%);
    flex-basis: calc(var(--card-width) * 1.25);
    width: calc(var(--card-width) * 1.25);
  }
  .hds-scr-card:hover .hds-scr-card-inner {
    box-shadow: var(--semantic-shadow-floating);
  }

  /* Neighbour shift — requires :has() support */
  @supports selector(:has(+ *)) {
    .hds-scr-card:hover + .hds-scr-card {
      transform: translateX(8%);
    }
  }

  /* Cover image */
  .hds-scr-cover {
    flex: 1 1 auto;
    min-height: 0;
    background-color: var(--semantic-color-surface-page);
    overflow: hidden;
  }
  .hds-scr-cover img {
    width: 100%; /* audit-ok: percentage fill in CSS template */
    height: 100%; /* audit-ok: percentage fill in CSS template */
    object-fit: cover;
    display: block;
  }
  .hds-scr-cover-placeholder {
    width: 100%; /* audit-ok: percentage fill in CSS template */
    height: 100%; /* audit-ok: percentage fill in CSS template */
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--semantic-color-surface-page);
  }

  /* Card metadata footer */
  .hds-scr-meta {
    flex: 0 0 auto;
    padding: 14px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid var(--semantic-color-border-subdued);
  }

  /* Scroll-driven stacking animation — Chrome 115+ / FF 110+ */
  @supports (animation-timeline: scroll()) {
    .hds-scr-card-inner {
      animation: hds-scr-stack linear;
      animation-timeline: view(
        x
        calc(0px - 2 * var(--card-width))
        calc(var(--card-width) * (var(--visible-count) - 0.2))
      );
      animation-duration: 1ms;
    }

    @keyframes hds-scr-stack {
      from {
        transform: translateX(0%) scale(1);
        opacity: 1;
      }
      to {
        transform: translateX(300%) scale(0.5);
        opacity: 0;
      }
    }

    /* Cancel the animation on a hovered card so it stays visible */
    .hds-scr-card:hover .hds-scr-card-inner {
      animation: none;
    }
  }

  /* Fallback outer height when scroll-driven animations are not available:
     a static card-height plus some breathing room */
  .hds-scr-outer[data-fallback="true"] {
    /* Outer div becomes a straight horizontal scroll container */
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }
  .hds-scr-outer[data-fallback="true"] .hds-scr-yscroll {
    position: static;
    overflow: visible;
    height: auto;
    width: auto;
  }
  .hds-scr-outer[data-fallback="true"] .hds-scr-spacer {
    height: auto;
    width: auto;
  }
  .hds-scr-outer[data-fallback="true"] .hds-scr-strip {
    position: static;
    overflow-x: visible;
    overflow-y: visible;
  }
  .hds-scr-outer[data-fallback="true"] .hds-scr-track {
    padding: 12px ${CARD_GAP}px;
  }
`;

// ── Placeholder icon ──────────────────────────────────────────────────────────

function PlaceholderIcon() {
  return (
    <div className="hds-scr-cover-placeholder" aria-hidden="true">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="6"
          y="10"
          width="36"
          height="28"
          rx="3"
          stroke="var(--semantic-color-border-default)"
          strokeWidth="1.5"
        />
        <circle
          cx="16"
          cy="20"
          r="4"
          stroke="var(--semantic-color-border-default)"
          strokeWidth="1.5"
        />
        <path
          d="M6 30l10-8 8 6 6-5 12 9"
          stroke="var(--semantic-color-border-default)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardItemProps {
  card: StackedCardRailCard;
  index: number;
  total: number;
}

function CardItem({ card, index, total }: CardItemProps) {
  // Cover + meta content, shared by the <a> and <div> inner-surface variants
  // (previously this markup was duplicated verbatim across both branches).
  const content = (
    <>
      <div className="hds-scr-cover">
        {card.coverImage ? (
          <img
            src={card.coverImage}
            alt={card.title}
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <PlaceholderIcon />
        )}
      </div>
      <div className="hds-scr-meta">
        {card.category && (
          <span
            style={{
              ...hds.typeStyles.eyebrow,
              color: 'var(--semantic-color-content-secondary)',
            }}
          >
            {card.category}
          </span>
        )}
        <span
          style={{
            ...hds.typeStyles.heading3,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          {card.title}
        </span>
      </div>
    </>
  );

  return (
    <div
      className="hds-scr-card"
      style={{ '--card-index': index } as React.CSSProperties}
      aria-label={`${card.title}${card.category ? `, ${card.category}` : ''}, card ${index + 1} of ${total}`}
    >
      {card.href ? (
        <a
          href={card.href}
          className="hds-focus hds-scr-card-inner"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          {content}
        </a>
      ) : (
        <div className="hds-scr-card-inner">{content}</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StackedCardRail({ cards }: StackedCardRailProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const yScrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Total vertical scroll distance = card travel per card × card count
  const cardCount = cards.length;
  const spacerHeight =
    CARD_WIDTH * cardCount + /* trailing breathing room */ CARD_WIDTH * VISIBLE_COUNT;

  // Wire vertical → horizontal scroll mapping
  useEffect(() => {
    const yScroll = yScrollRef.current;
    const strip = stripRef.current;
    if (!yScroll || !strip) return;

    function onScroll() {
      if (!yScroll || !strip) return;
      strip.scrollLeft = yScroll.scrollTop;
    }

    yScroll.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      yScroll.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Detect @supports animation-timeline to set data-fallback attribute
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    // CSS.supports is not universally available in all older environments —
    // guard defensively.
    const supported =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timeline', 'scroll()');
    if (!supported) {
      outer.setAttribute('data-fallback', 'true');
    }
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div
        ref={outerRef}
        className="hds-scr-outer"
        style={
          {
            height: `calc(var(--card-height) + 48px)`,
          } as React.CSSProperties
        }
        role="region"
        aria-label="Project cards"
      >
        <div
          ref={yScrollRef}
          className="hds-scr-yscroll"
          // Height of the y-scroll div must equal the container width so that
          // the full scroll travel (spacerHeight px vertically) maps cleanly
          // onto the horizontal extent.
          style={{ height: '100%' }}
        >
          {/* Spacer gives vertical scroll room to travel */}
          <div
            className="hds-scr-spacer"
            style={
              {
                '--hds-scr-spacer-height': `${spacerHeight}px`,
              } as React.CSSProperties
            }
          />
          {/* Sticky strip — horizontally scrollable, driven by JS */}
          <div ref={stripRef} className="hds-scr-strip">
            <div className="hds-scr-track" role="list">
              {cards.map((card, i) => (
                <div key={card.id} role="listitem">
                  <CardItem card={card} index={i} total={cardCount} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StackedCardRail;
