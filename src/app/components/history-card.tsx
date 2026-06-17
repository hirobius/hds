/* eslint-disable no-restricted-syntax */
/**
 * HistoryCard - compact commit-history card for repo and systems-log surfaces.
 * @category Utilities
 * @tier utility
 * @doc-exempt: utility-tier internal — commit history surface, not a public HDS authoring primitive.
 * @internal — utility-tier component; not part of @hirobius/design-system public API.
 */
import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Github } from 'lucide-react';
import hds from '../design-system/tokens';
import { Icon } from './icon';

const historyCardStyles = {
  link: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto', // grid-ok: avatar + content + arrow row; minmax(0,1fr) shrinks content column on narrow viewports
    gap: hds.semantic.space.component.gap,
    alignItems: 'center',
    minWidth: 0,
    width: '100%',
    padding: hds.semantic.space.layout.gap,
    textAlign: 'left' as const,
    textDecoration: 'none',
  } satisfies React.CSSProperties,
  avatar: {
    width: hds.size[40],
    height: hds.size[40],
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    borderRadius: hds.borderRadius[8],
    background: 'var(--semantic-color-surface-raised)',
    border: 0,
    overflow: 'hidden',
  } satisfies React.CSSProperties,
} as const;

/** @public */
export type HistoryCardCommit = {
  hash: string | null;
  date: string;
  message: string;
  displayMessage?: string;
};

export interface HistoryCardProps {
  commit: HistoryCardCommit;
  href: string;
}

export function HistoryCard({ commit, href }: HistoryCardProps) {
  const [interactive, setInteractive] = useState(false);

  const displayDate = new Date(commit.date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const headline = commit.displayMessage?.trim() || commit.message;

  const arrowStyle: CSSProperties = {
    display: 'inline-flex',
    transform: interactive ? 'translate(3px,-3px)' : 'translate(0,0)',
    transition: `transform ${hds.motion.productive.duration}s`,
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hds-focus hds-doc-link-card"
      onMouseEnter={() => setInteractive(true)}
      onMouseLeave={() => setInteractive(false)}
      onFocus={() => setInteractive(true)}
      onBlur={() => setInteractive(false)}
      style={historyCardStyles.link}
    >
      <span aria-hidden="true" style={historyCardStyles.avatar}>
        <Icon icon={Github} size="small" color="var(--semantic-color-content-accent)" />
      </span>

      <div style={{ display: 'grid', gap: hds.semantic.space.subgrid.gap, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          gap: hds.semantic.space.subgrid.gap,
          alignItems: 'baseline',
          flexWrap: 'wrap',
          minWidth: 0,
        }}>
          <span style={{ ...hds.typeStyles.caption, margin: 0, color: 'var(--semantic-color-content-secondary)' }}>
            commit
          </span>
          {commit.hash && (
            <code style={{ ...hds.typeStyles.technical, color: 'var(--semantic-color-content-primary)' }}>
              {commit.hash}
            </code>
          )}
          <span style={{ ...hds.typeStyles.technical, color: 'var(--semantic-color-content-secondary)' }}>
            {displayDate}
          </span>
        </div>
        <p
          style={{ ...hds.typeStyles.ui, margin: 0, color: 'var(--semantic-color-content-primary)', minWidth: 0 }}
          title={commit.message !== headline ? commit.message : undefined}
        >
          {headline}
        </p>
      </div>

      <span aria-hidden="true" style={arrowStyle}>
        <Icon icon={ArrowUpRight} size="small" color="var(--semantic-color-content-accent)" />
      </span>
    </a>
  );
}
