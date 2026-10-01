// passing: a layout component resolves through the shared vocabulary in box-sx.ts
import { LAYOUT_GAP, LAYOUT_GAP_NAMES, resolveSpacingValue, SPACE_SCALE } from './box-sx';

type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';

export function PassingSharedVocabulary({ gap = 'tight' }: { gap?: LayoutGap }) {
  return (
    <div style={{ display: 'flex', gap: resolveSpacingValue(gap, LAYOUT_GAP) }}>
      One name map, in box-sx.ts
    </div>
  );
}

// passing: a wider vocabulary spreads the shared names instead of spelling them
const CARD_GAP = { names: { ...LAYOUT_GAP_NAMES, gap: SPACE_SCALE.xs }, numbers: 'raw' };

// passing: the same words as CSS keywords, and on Box sx's fixed layout vars
const keywords = { fontWeight: 'normal', boxShadow: 'inset 0 0 0 1px currentColor' };
const BOX_SX = { tight: 'var(--semantic-space-layout-tight)' };

// passing: an intentional exception, suppressed with its reason
const legacy = {
  tight: 'var(--semantic-space-scale-sm)', // layout-gap-ok: fixture for the suppression marker
};

export { CARD_GAP, keywords, BOX_SX, legacy };
