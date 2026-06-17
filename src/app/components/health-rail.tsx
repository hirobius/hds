/* eslint-disable no-restricted-syntax */
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * HealthRail — Token governance right-rail.
 *
 * Extracted from HDSLayout.tsx (12i-bloat-hdslayout-health-rail-extract).
 * Source of truth: src/app/components/HealthRail.tsx
 *
 * Exports:
 *   TokensRail         — the token governance aside rendered on /hds/tokens routes
 *   TOKENS_RAIL_MIN_W  — minimum width used by HDSDocRoot's shell grid calculation
 */

import hds from '../design-system/tokens';
import { HdsLegacyTokenGovernancePanel } from './lab/legacy-token-detail';
import { allTokens } from './lab/tokenUtils';

// --- Constants --------------------------------------------------------------

const TOKENS_RAIL_W_VALUE = 360;  // max token governance rail width
export const TOKENS_RAIL_MIN_W = 280;  // min width — consumed by HDSDocRoot grid
const RAIL_HEADER_CONTENT_GAP = hds.semantic.space.sidebar.sectionGap;

const tokensRailStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: TOKENS_RAIL_W_VALUE,
  minWidth: 0,
  paddingLeft: 0,
  paddingRight: hds.semantic.space.layout.gap,
  boxSizing: 'border-box',
  overflowX: 'hidden',
  background: 'var(--semantic-color-surface-page)',
  zIndex: 20,
  opacity: 'var(--tokens-details-rail-ready, 0)' as unknown as number,
  transition: `opacity ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
  display: 'grid',
  gridTemplateRows: 'var(--tokens-details-rail-offset, 0px) max-content',
  alignContent: 'start',
  overflow: 'visible',
};

// --- Component --------------------------------------------------------------

export function TokensRail({ isDark, tokenPath }: { isDark: boolean; tokenPath: string | null }) {
  const selectedToken = tokenPath ? allTokens.find(token => token.path === tokenPath) ?? null : null;

  return (
    <aside
      aria-label="Token governance"
      style={tokensRailStyle}
    >
      <div aria-hidden="true" />
      <div
        style={{
          display: 'grid',
          gap: RAIL_HEADER_CONTENT_GAP,
        }}
      >
        <h2 style={{ ...hds.typeStyles.heading3, margin: 0, marginBottom: hds.semantic.space.component.gap, color: 'var(--semantic-color-content-primary)' }}>
          Details
        </h2>
        <HdsLegacyTokenGovernancePanel token={selectedToken} isDark={isDark} showHeading={false} />
      </div>
    </aside>
  );
}
