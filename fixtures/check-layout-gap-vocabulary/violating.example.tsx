// violating: the private map Cluster, Grid, Sidebar, Cover, Switcher, Bleed and
// Center each kept before hds#404 (Card's GAP_MAP was the same four entries)
type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';

const gapMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-scale-sm)',
  normal: 'var(--semantic-space-scale-md)',
  inset: 'var(--semantic-space-scale-lg)',
  spacious: 'var(--semantic-space-scale-xl)',
};

export function ViolatingPrivateMap({ gap = 'tight' }: { gap?: LayoutGap }) {
  return <div style={{ display: 'flex', gap: gapMap[gap] }}>A private name map</div>;
}

// violating: the same name spelled through SPACE_SCALE, as Stack did before hds#404
const STACK_GAP = { names: { tight: SPACE_SCALE.sm, gap: SPACE_SCALE.xs }, numbers: 'raw' };

// violating: a comparison that picks a step for a name
export function ViolatingComparison({ gap }: { gap: LayoutGap }) {
  return (
    <div style={{ gap: gap === 'normal' ? 'var(--semantic-space-scale-md)' : undefined }}>
      A one-name resolver
    </div>
  );
}
